const { GoogleGenerativeAI } = require('@google/generative-ai');

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
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
        const pdfParseModule = require('pdf-parse');
        if (typeof pdfParseModule === 'function') {
          const data = await pdfParseModule(buffer);
          return data.text || '';
        }
        if (pdfParseModule && typeof pdfParseModule.PDFParse === 'function') {
          const parser = new pdfParseModule.PDFParse({ data: buffer });
          try {
            const result = await parser.getText();
            return result.text || '';
          } finally {
            if (typeof parser.destroy === 'function') await parser.destroy().catch(() => {});
          }
        }
      } catch (e) {
        console.warn('pdf-parse load/extract notice:', e.message);
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
      return await withModelTimeout(operation(model), 7500);
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed: ${err.message?.slice(0, 90)}`);
    }
  }
  throw lastError;
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
  // 1. If Vercel or middleware already parsed req.body as an object
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return { fields: req.body, fileBuffer: null, fileMime: null, fileName: null };
  }
  // 2. If req.body was buffered by Vercel runtime
  if (Buffer.isBuffer(req.body)) {
    return parseMultipartBuffer(req.body, req.headers['content-type']);
  }
  // 3. If req.body is a string
  if (typeof req.body === 'string' && req.body.length > 0) {
    try {
      return { fields: JSON.parse(req.body), fileBuffer: null, fileMime: null, fileName: null };
    } catch {
      return parseMultipartBuffer(Buffer.from(req.body, 'utf8'), req.headers['content-type']);
    }
  }
  // 4. Otherwise read raw request stream (local server.js or unparsed stream)
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const rawBuffer = Buffer.concat(chunks);
  return parseMultipartBuffer(rawBuffer, req.headers['content-type']);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    if (!contentToAnalyze && inlineParts.length === 0) {
      return res.status(400).json({ error: 'No readable text or image provided.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(200).json({
        success: false,
        extractedText: contentToAnalyze.slice(0, 20000),
        demoFallback: true,
        error: 'Gemini API key not set in environment; using local analyzer.',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const activeTitle = fields.filename || fileName || 'Uploaded_Study_Material';
    const isMultiSlideOrLong = (contentToAnalyze.length > 2500) || /\[Slide \/ Page \d+\]/i.test(contentToAnalyze);
    const targetQCount = isMultiSlideOrLong ? '12 to 15' : '10 to 12';
    const targetCardCount = isMultiSlideOrLong ? '15 to 20' : '12 to 15';

    const promptParts = [...inlineParts];
    if (inlineParts.length > 0 && contentToAnalyze) {
      promptParts.push(
        `Source: "${activeTitle}". Analyze the attached visual slide(s) AND the extracted document text below. Perform an end-to-end scan across all slides from beginning to end. Populate "extractedText" with a concise summary/transcription, and generate: 5 to 7 high-yield takeaways, 15 to 20 terms, 1 professor exam insight, ${targetQCount} multiple choice questions (spaced evenly from early, middle, and late slides), and ${targetCardCount} flashcards:\n\n"""\n${contentToAnalyze.slice(0, 65000)}\n"""`
      );
    } else if (inlineParts.length > 0) {
      promptParts.push(
        `Source: "${activeTitle}". Read all visible text, diagrams, and handwriting in the attached slide image(s). Populate "extractedText" with readable transcription, and generate: 5 to 7 high-yield takeaways, 12 to 16 terms, 1 professor exam insight, 10 to 12 multiple choice questions, and 12 to 15 flashcards.`
      );
    } else {
      promptParts.push(
        `Source: "${activeTitle}". Perform a comprehensive, end-to-end scan of the provided lecture/slide material from the first slide to the last slide. You MUST generate ${targetQCount} multiple choice questions (testing different topics and slides evenly across the beginning, middle, and end) and ${targetCardCount} flashcards, plus 5 to 7 takeaways and 15 to 20 terms:\n\n"""\n${contentToAnalyze.slice(0, 75000)}\n"""`
      );
    }

    let userMemoryBlock = '';
    if (fields.userMemory && typeof fields.userMemory === 'object') {
      const um = fields.userMemory;
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
        userMemoryBlock = `\n\nSTUDENT MEMORY CONTEXT (Tailor the Professor's Exam Insight and diagnostic questions to reinforce these areas when relevant to the uploaded slides):\n${lines.join('\n')}`;
      }
    }

    const parsedData = await executeWithModelFallback(
      genAI,
      {
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.25,
          maxOutputTokens: 4000,
        },
        systemInstruction: `You are Gojo.nerd, an elite academic synthesis engine powered by the Six Eyes.${userMemoryBlock}
Your mission is to perform a rigorous, end-to-end scan of the entire uploaded study material across all slides and pages.

NON-NEGOTIABLE QUANTITY & COVERAGE REQUIREMENTS:
1. NEVER output only 3 or 5 questions. The student expects a full, comprehensive diagnostic examination. You MUST output 12 to 15 multiple choice questions (or at least 10 for short notes).
2. Sample questions evenly across the entire slide deck / document:
   - Early questions must test foundational principles from the opening slides.
   - Middle questions must test central mechanisms, pathways, formulas, or derivations from the core slides.
   - Concluding questions must test advanced implications, applications, and conclusions from the later slides.
3. In question stems or critiques, reference the specific mechanism, concept, or slide context so students understand exactly where it was tested.
4. Generate 15 to 20 flashcards covering key terms, definitions, formulas, and mechanisms spanning the entire presentation.
5. Generate 5 to 7 high-yield takeaways (pillars) summarizing the core structural pillars of the presentation.
6. Generate 15 to 20 key vocabulary/nomenclature terms.
7. Include 1 sharp Professor's Exam Insight isolating confusing terminology, inverse relationships, or tricky distinctions professors test on multiple choice.

Output must strictly match this JSON schema:
{
  "extractedText": "Brief 2-3 paragraph summary/transcription of the scanned slides.",
  "takeaways": [
    { "num": "01", "concept": "Short Concept Name", "desc": "1-2 sentence core mechanism." }
  ],
  "terms": ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5", "Term 6", "Term 7", "Term 8"],
  "trap": "Direct 1-2 sentence high-yield exam insight highlighting the primary conceptual pitfall or tricky distinction professors test on this topic.",
  "questions": [
    {
      "q": "Sharp conceptual question spanning a specific slide or concept?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Direct explanation of why the correct answer is true and why wrong options fail.",
      "accolade": "Short confirmation of mastery."
    }
  ],
  "cards": [
    { "term": "Key Term or Concept", "def": "Clear 1-2 sentence definition or mechanism from that slide." }
  ]
}`,
      },
      async (model) => {
        const result = await model.generateContent(promptParts);
        return parseJsonSafe(result.response.text());
      }
    );

    const finalExtractedText =
      contentToAnalyze ||
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
    console.error('Vercel Analyze Error:', err);
    return res.status(200).json({
      success: false,
      demoFallback: true,
      error: err.message || 'Server fallback triggered',
    });
  }
};
