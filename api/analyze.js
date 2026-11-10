const { GoogleGenerativeAI } = require('@google/generative-ai');

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

function withModelTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Model call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function parseJsonSafe(rawText) {
  const cleaned = String(rawText || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Model did not return valid JSON');
  }
}

function detectMimeFromBuffer(buf, fallbackMime, filename) {
  if (!buf || buf.length < 4) return fallbackMime || 'application/octet-stream';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.slice(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return fallbackMime || 'application/octet-stream';
}

async function extractPdfTextWithTimeout(buffer, timeoutMs = 4500) {
  return Promise.race([
    (async () => {
      try {
        const pdfParseModule = require('pdf-parse-fork');
        const pdfParse = pdfParseModule.default || pdfParseModule;
        if (typeof pdfParse === 'function') {
          const data = await pdfParse(buffer);
          return data.text || '';
        }
      } catch (e) {
        console.warn('pdf-parse-fork load/extract notice:', e.message);
      }
      return '';
    })(),
    new Promise((resolve) => setTimeout(() => resolve(''), timeoutMs)),
  ]);
}

async function executeWithModelFallback(genAI, config, operation) {
  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ ...config, model: modelName });
      return await withModelTimeout(operation(model), 20000);
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed: ${err.message?.slice(0, 90)}`);
    }
  }
  throw lastError;
}

function buildServerFallbackSynthesis(rawText, title = 'Lecture Study Material') {
  const clean = String(rawText || title || 'Lecture Study Material').replace(/\s+/g, ' ').trim();
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const pool = sentences.length > 0
    ? sentences
    : [
        `${title} establishes the primary structural mechanisms and governing relationships tested in this unit.`,
        `Core pathways depend on sequential cause-and-effect transitions rather than isolated definitions.`,
        `Exam questions focus on distinguishing rate-limiting steps, boundary conditions, and regulatory feedback.`,
      ];

  const stopWords = new Set([
    'the','and','for','that','this','with','from','into','are','was','were','have','has','had','not','but','what','which','when','where','who','how','why','can','will','may','Also','such','than','then','them','they','their','there','these','those','between','through','during','before','after','above','below','under','over','again','further','once','here','very','just','only','both','each','more','most','other','some','many'
  ]);
  const words = clean.match(/\b[A-Z][a-zA-Z0-9-]{3,}\b|\b[a-zA-Z]{6,}\b/g) || [];
  const terms = [];
  for (const w of words) {
    const norm = w.replace(/[^a-zA-Z0-9-]/g, '');
    if (norm.length >= 4 && !stopWords.has(norm.toLowerCase()) && !terms.some((t) => t.toLowerCase() === norm.toLowerCase())) {
      terms.push(norm.charAt(0).toUpperCase() + norm.slice(1));
      if (terms.length >= 10) break;
    }
  }
  while (terms.length < 5) {
    terms.push(`Principle ${terms.length + 1}`);
  }

  const takeaways = pool.slice(0, 5).map((sent, idx) => ({
    num: String(idx + 1).padStart(2, '0'),
    concept: terms[idx] ? `${terms[idx]} Mechanism` : `Core Unit 0${idx + 1}`,
    desc: sent,
  }));

  const cards = terms.slice(0, 8).map((term, idx) => ({
    term,
    def: pool[idx % pool.length] || `Core operational concept in ${title}.`,
  }));

  const questions = pool.slice(0, 6).map((sent, idx) => {
    const keyTerm = terms[idx % terms.length];
    return {
      q: `Based on the lecture material, which mechanism accurately describes the role of ${keyTerm}?`,
      options: [
        sent.slice(0, 140),
        `It operates independently of ${terms[(idx + 1) % terms.length]} without regulatory feedback.`,
        `It inhibits the primary pathway prior to substrate activation.`,
        `It occurs exclusively outside the primary reaction compartment.`,
      ],
      correct: 0,
      critique: `Directly verified from the lecture notes: "${sent.slice(0, 160)}"`,
      accolade: `Correct. You accurately identified the core mechanism governing ${keyTerm}.`,
    };
  });

  return {
    unit_title: title.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
    takeaways,
    terms,
    trap: `Exams frequently test whether you can distinguish the active mechanism of ${terms[0]} from secondary byproducts (${terms[1] || 'secondary steps'}). Focus on cause-and-effect sequence rather than memorizing isolated terms.`,
    cards,
    questions,
  };
}

function parseMultipartBuffer(buffer, contentType) {
  if (!buffer || buffer.length === 0) {
    return { fields: {}, fileBuffer: null, fileMime: null, fileName: null };
  }
  const boundaryMatch = (contentType || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;
  if (!boundary) {
    try {
      return { fields: JSON.parse(buffer.toString('utf8')), fileBuffer: null, fileMime: null, fileName: null };
    } catch {
      return { fields: { text: buffer.toString('utf8') }, fileBuffer: null, fileMime: null, fileName: null };
    }
  }

  const boundaryBuf = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;
  while ((start = buffer.indexOf(boundaryBuf, start)) !== -1) {
    start += boundaryBuf.length;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    const next = buffer.indexOf(boundaryBuf, start);
    if (next !== -1) {
      parts.push(buffer.slice(start, next - 2));
    }
  }

  const fields = {};
  let fileBuffer = null;
  let fileMime = null;
  let fileName = null;
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerStr = part.slice(0, headerEnd).toString('utf8');
    const bodyBuf = part.slice(headerEnd + 4);
    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
    const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n;]+)/i);
    const fieldName = nameMatch ? nameMatch[1] : null;
    if (filenameMatch && fieldName === 'file') {
      fileBuffer = bodyBuf;
      fileName = filenameMatch[1];
      fileMime = contentTypeMatch ? contentTypeMatch[1].trim() : null;
    } else if (fieldName) {
      fields[fieldName] = bodyBuf.toString('utf8');
    }
  }
  return { fields, fileBuffer, fileMime, fileName };
}

async function extractRequestPayload(req) {
  const contentType = String((req.headers && req.headers['content-type']) || '');

  // If req is a readable stream (standard Node http.IncomingMessage / Vercel with bodyParser: false),
  // read the raw stream FIRST before touching req.body (since Vercel's req.body getter can lock/fail on multipart).
  if (typeof req[Symbol.asyncIterator] === 'function' && (!Object.prototype.hasOwnProperty.call(req, 'body') || Buffer.isBuffer(req.body))) {
    if (Buffer.isBuffer(req.body)) {
      return parseMultipartBuffer(req.body, contentType);
    }
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBuffer = Buffer.concat(chunks);
    if (rawBuffer.length > 0) {
      return parseMultipartBuffer(rawBuffer, contentType);
    }
  }

  // Fallback for pre-parsed req.body (e.g., unit tests or JSON middleware)
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return { fields: req.body, fileBuffer: null, fileMime: null, fileName: null };
  }
  if (Buffer.isBuffer(req.body)) {
    return parseMultipartBuffer(req.body, contentType);
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return { fields: JSON.parse(req.body), fileBuffer: null, fileMime: null, fileName: null };
    } catch {
      return parseMultipartBuffer(Buffer.from(req.body, 'utf8'), contentType);
    }
  }
  return { fields: {}, fileBuffer: null, fileMime: null, fileName: null };
}

module.exports = async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fields, fileBuffer, fileMime, fileName } = await extractRequestPayload(req);

    let contentToAnalyze = String(fields.text || '').trim();
    const inlineParts = [];

    // 1. Check if client sent base64 image(s) (uploaded image or rendered scanned PDF page)
    if (fields.imageBase64) {
      const cleanBase64 = String(fields.imageBase64).replace(/^data:[^;]+;base64,/, '').trim();
      const mimeType = fields.imageMimeType || 'image/jpeg';
      if (cleanBase64) {
        inlineParts.push({ inlineData: { data: cleanBase64, mimeType } });
      }
    }
    if (Array.isArray(fields.imagesBase64)) {
      for (const imgItem of fields.imagesBase64.slice(0, 3)) {
        const cleanB64 = String(imgItem.data || imgItem).replace(/^data:[^;]+;base64,/, '').trim();
        const mimeType = imgItem.mimeType || fields.imageMimeType || 'image/jpeg';
        if (cleanB64) {
          inlineParts.push({ inlineData: { data: cleanB64, mimeType } });
        }
      }
    }

    // 2. Check if a raw fileBuffer was uploaded via FormData
    if (fileBuffer && fileBuffer.length > 0) {
      const detectedMime = detectMimeFromBuffer(fileBuffer, fileMime, fileName || fields.filename);
      if (detectedMime.startsWith('image/')) {
        if (inlineParts.length === 0) {
          inlineParts.push({
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType: detectedMime,
            },
          });
        }
      } else if (detectedMime === 'application/pdf') {
        if (!contentToAnalyze) {
          contentToAnalyze = (await extractPdfTextWithTimeout(fileBuffer)).trim();
        }
        if (!contentToAnalyze && inlineParts.length === 0 && fileBuffer.length < 4 * 1024 * 1024) {
          inlineParts.push({
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType: 'application/pdf',
            },
          });
        }
      } else if (!contentToAnalyze) {
        contentToAnalyze = fileBuffer.toString('utf8').trim();
      }
    }

    // Trim text to avoid exceeding token limits or causing long response times
    const sanitizedText = contentToAnalyze
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30000);

    if (!sanitizedText && inlineParts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a document or paste notes.',
      });
    }

    const activeTitle = fields.filename || fileName || 'Lecture_Material';
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const fallbackData = buildServerFallbackSynthesis(sanitizedText, activeTitle);
      return res.status(200).json({
        success: true,
        extractedText: sanitizedText.slice(0, 20000),
        data: fallbackData,
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    let userMemoryBlock = '';
    let parsedUserMemory = fields.userMemory;
    if (typeof parsedUserMemory === 'string' && parsedUserMemory.trim()) {
      try {
        parsedUserMemory = JSON.parse(parsedUserMemory);
      } catch {
        parsedUserMemory = null;
      }
    }
    if (parsedUserMemory && typeof parsedUserMemory === 'object') {
      const um = parsedUserMemory;
      const lines = [];
      if (um.name || um.major) {
        lines.push(`Student: ${um.name || 'Student'} (${um.major || 'Course'})`);
      }
      if (Array.isArray(um.memories) && um.memories.length > 0) {
        lines.push(
          'Student Memory & Past Weak Spots:\n' +
            um.memories
              .slice(0, 12)
              .map((m) => `- [${m.category || 'note'}] ${m.content}`)
              .join('\n')
        );
      }
      if (lines.length > 0) {
        userMemoryBlock = `\n\nSTUDENT MEMORY CONTEXT (Tailor the Professor Trap and Exam Arena Questions to reinforce these areas when relevant to the lecture material):\n${lines.join('\n')}`;
      }
    }

    const promptParts = [...inlineParts];
    if (sanitizedText) {
      promptParts.push(
        `Synthesize this lecture content into high-yield exam material:\n\n"""\n${sanitizedText}\n"""`
      );
    } else {
      promptParts.push(
        `Synthesize the attached lecture slide/document material into high-yield exam material following the strict JSON schema.`
      );
    }

    let parsedData;
    try {
      parsedData = await executeWithModelFallback(
        genAI,
        {
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2, // Low temperature forces analytical discipline over creativity
          },
          systemInstruction: `You are an elite academic curriculum architect and exam analyst.${userMemoryBlock}

Your job is to read raw lecture notes/slides and synthesize them into high-yield exam preparation data.

CRITICAL PARSING RULES:
1. TOPIC CLUSTERING: Do not pick random sentences or footnotes. Identify the 2 to 4 primary, overarching lecture units (e.g., in a respiration lecture: 1. Glycolytic Cleavage, 2. Citric Acid Cycle, 3. Oxidative Phosphorylation).
2. HIGH-YIELD TAKEAWAYS: Each takeaway must explain a cause-and-effect biological, mathematical, legal, or physical MECHANISM, not just a factoid.
3. FLASHCARDS: Every card must pair a core technical term with its operational definition AND an exam hook (why professors test it).
4. PROFESSOR TRAP: Find the single biggest point of confusion, edge-case, or false assumption students commonly fail on multiple-choice exams for these topics.
5. EXAM ARENA QUESTIONS: Questions must test application, comparison, or mechanism. Banned: trivia questions ("what was on slide 4", "who wrote the textbook").

OUTPUT SCHEMA (STRICT JSON):
{
  "unit_title": "Primary Lecture Subject Title",
  "takeaways": [
    { "num": "01", "concept": "Core Mechanism Name", "desc": "Detailed, high-yield explanation of the mechanism." }
  ],
  "terms": ["Crucial Term 1", "Crucial Term 2", "Crucial Term 3", "Crucial Term 4", "Crucial Term 5"],
  "trap": "Direct, 2-sentence breakdown of the specific exam trap professors set on this material.",
  "cards": [
    {
      "term": "Term or Principle",
      "def": "Complete conceptual mechanism and why it matters on an exam."
    }
  ],
  "questions": [
    {
      "q": "Conceptual multiple-choice question testing the core mechanism?",
      "options": ["Plausible Distractor A", "Correct Answer B", "Common Trap C", "Plausible Distractor D"],
      "correct": 1,
      "critique": "Analytical breakdown of why the incorrect choices fail.",
      "accolade": "Direct reinforcement of the correct mechanism."
    }
  ]
}`,
        },
        async (model) => {
          const result = await model.generateContent(promptParts);
          return parseJsonSafe(result.response.text());
        }
      );
    } catch (modelErr) {
      console.warn('Gemini model fallback triggered:', modelErr.message);
      parsedData = buildServerFallbackSynthesis(sanitizedText, activeTitle);
    }

    const finalExtractedText =
      sanitizedText ||
      parsedData.extractedText ||
      (Array.isArray(parsedData.takeaways)
        ? parsedData.takeaways.map((t) => `${t.concept}: ${t.desc}`).join('\n\n')
        : '');

    return res.status(200).json({
      success: true,
      extractedText: finalExtractedText.slice(0, 20000),
      data: parsedData,
    });
  } catch (err) {
    console.error('API Route Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An error occurred while analyzing the document.',
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};
