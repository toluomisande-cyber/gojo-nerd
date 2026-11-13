const fs = require('fs');
const path = require('path');

// Ensure environment variables are loaded
if (!process.env.OPENROUTER_API_KEY) {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
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

async function extractPdfTextWithTimeout(buffer, timeoutMs = 8000) {
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
        console.warn('PDF text extraction notice:', e.message);
      }
      return '';
    })(),
    new Promise((resolve) => setTimeout(() => resolve(''), timeoutMs)),
  ]);
}

const ADMIN_WORD_PATTERN = /^(index|agenda|outline|contents?|overview|summary|slide\s*\d*|page\s*\d*|table\s*of\s*contents|syllabus|course\s*overview|introduction\s*to\s*course)$/i;

function isAdministrativeTerm(str) {
  if (!str) return true;
  const clean = String(str).trim();
  if (clean.length < 3) return true;
  if (ADMIN_WORD_PATTERN.test(clean)) return true;
  if (/^slide\s*\d+/i.test(clean) || /^page\s*\d+/i.test(clean)) return true;
  if (/^index\b/i.test(clean) || /^agenda\b/i.test(clean) || /^outline\b/i.test(clean)) return true;
  return false;
}

function cleanLectureSlideText(rawText) {
  if (!rawText) return '';
  return String(rawText)
    .replace(/\r\n/g, '\n')
    // Remove standalone slide header lines like "Slide 1", "[Slide 12]", "Page 3 of 40"
    .replace(/^\s*(?:\[\s*)?(?:Slide|Page)\s*\d+(?:\s*(?:\/|of)\s*\d+)?(?:\s*\])?\s*[:.-]?\s*$/gim, '')
    // Remove "Index:" or "Table of Contents:" or "Agenda:" header lines
    .replace(/^\s*(?:index|table\s+of\s+contents|agenda|course\s+outline)\s*[:.-]\s*$/gim, '')
    .trim();
}

function extractJsonFromLlmText(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^`{3,}(?:json)?\s*/i, '').replace(/`{3,}\s*$/i, '').trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
  }
  return null;
}

function normalizeStudyPackage(raw, defaultTitle = 'Lecture Study Guide') {
  if (!raw || typeof raw !== 'object') return null;

  const unit_title = (raw.unit_title && typeof raw.unit_title === 'string' && !isAdministrativeTerm(raw.unit_title))
    ? raw.unit_title.trim()
    : defaultTitle;

  // Normalize takeaways
  let takeaways = [];
  if (Array.isArray(raw.takeaways)) {
    takeaways = raw.takeaways
      .map((item, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        if (typeof item === 'string') {
          return {
            num,
            concept: `Core Topic ${idx + 1}`,
            desc: item.trim(),
          };
        }
        if (item && typeof item === 'object') {
          let concept = String(item.concept || item.title || item.topic || `Core Topic ${idx + 1}`).trim();
          if (isAdministrativeTerm(concept)) {
            concept = `Core Principle ${idx + 1}`;
          }
          const desc = String(item.desc || item.description || item.explanation || item.summary || '').trim();
          return {
            num: item.num ? String(item.num).padStart(2, '0') : num,
            concept,
            desc,
          };
        }
        return null;
      })
      .filter((t) => t && t.desc.length > 10 && !isAdministrativeTerm(t.concept));
  }

  // Normalize terms
  let terms = [];
  if (Array.isArray(raw.terms)) {
    terms = raw.terms
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t.length > 2 && !isAdministrativeTerm(t));
  }

  // Normalize trap
  let trap = '';
  if (typeof raw.trap === 'string') {
    trap = raw.trap.trim();
  } else if (Array.isArray(raw.trap)) {
    trap = raw.trap.map((t) => String(t).trim()).join(' ');
  }

  // Normalize flashcards
  let cards = [];
  if (Array.isArray(raw.cards)) {
    cards = raw.cards
      .map((c) => {
        if (!c || typeof c !== 'object') return null;
        const term = String(c.term || c.concept || '').trim();
        const def = String(c.def || c.definition || c.desc || '').trim();
        if (isAdministrativeTerm(term) || !term || !def) return null;
        return { term, def };
      })
      .filter(Boolean);
  }

  // Normalize questions
  let questions = [];
  if (Array.isArray(raw.questions)) {
    questions = raw.questions
      .map((q) => {
        if (!q || typeof q !== 'object') return null;
        const questionText = String(q.q || q.question || '').trim();
        let options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
        if (options.length < 2) return null;
        while (options.length < 4) {
          options.push(`Alternative perspective ${options.length + 1}`);
        }
        options = options.slice(0, 4);

        let correct = typeof q.correct === 'number' ? Math.floor(q.correct) : 0;
        if (correct < 0 || correct >= options.length) correct = 0;

        const critique = String(q.critique || q.explanation || `The correct option is choice ${correct + 1}.`).trim();
        const accolade = String(q.accolade || 'Excellent mastery of this concept.').trim();

        return {
          q: questionText,
          options,
          correct,
          critique,
          accolade,
        };
      })
      .filter((q) => q && q.q.length > 10);
  }

  if (takeaways.length === 0 || questions.length === 0) {
    return null;
  }

  return {
    unit_title,
    takeaways: takeaways.slice(0, 6),
    terms: terms.slice(0, 14),
    trap: trap || 'Pay close attention to key regulatory mechanisms and boundary conditions that distinguish primary pathways from secondary cascades.',
    cards: cards.slice(0, 14),
    questions: questions.slice(0, 10),
  };
}

async function generateCurriculumWithAI(lectureText, title = 'Lecture Material') {
  const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!openRouterKey) return null;

  const model = (process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct').trim().replace(/:free$/, '');
  const cleanTitle = String(title || 'Lecture Study Guide')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const cleanedSlides = cleanLectureSlideText(lectureText).slice(0, 24000);

  const systemPrompt = `You are an elite university professor, academic tutor, and curriculum architect.
Your mission is to read a student's uploaded lecture slides/notes and transform them into a comprehensive, master-level exam study package.

CRITICAL PEDAGOGICAL RULES:
1. NEVER output administrative labels such as "Index", "Agenda", "Outline", "Table of Contents", "Overview", "Slide 1", "Introduction to Course", or professor contact info as a topic or concept title. Discard all slide metadata.
2. INTELLIGENTLY CLUSTER TOPICS: Group the actual academic subject matter across the slides into 4 to 6 distinct, high-yield conceptual topics based on contextual understanding.
3. IN-DEPTH EXPLANATIONS (NO LAZY BULLETS): For every topic, provide an in-depth, thorough, crystal-clear explanation. Use deep academic reasoning to explain the underlying mechanism, background scientific/theoretical context, why it happens, and how it is applied. Go beyond what is on the slides to provide rich conceptual depth for thorough reading and exam preparation!
4. EXAM TRAP: Identify the single most dangerous, subtle exam pitfall, distinction, or trick question area that examiners test to catch students who only memorize superficially.
5. DOMAIN TERMS: Extract 8 to 14 essential technical terms.
6. FLASHCARDS: Generate 8 to 12 flashcards with clear terms and rich, precise definitions.
7. EXAM QUESTIONS: Create 6 to 8 rigorous multiple-choice questions that test conceptual understanding and mechanism, each with 4 distinct options, the 0-based integer index of the correct answer, a detailed critique explaining why the answer is right and why each distractor is wrong, and an accolade.

Return ONLY a valid JSON object matching this schema:
{
  "unit_title": "${cleanTitle}",
  "takeaways": [
    {
      "num": "01",
      "concept": "Conceptual Topic Name",
      "desc": "Thorough, in-depth academic explanation detailing mechanisms, context, and exam significance..."
    }
  ],
  "terms": ["Term 1", "Term 2"],
  "trap": "Detailed exam trap and critical distinction...",
  "cards": [
    {
      "term": "Term Name",
      "def": "Precise, high-yield definition and significance..."
    }
  ],
  "questions": [
    {
      "q": "Thoughtful examination question testing mechanism or distinction?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Comprehensive critique explaining why the correct choice is right and how distractors attempt to trick students...",
      "accolade": "Praise highlighting the concept mastered."
    }
  ]
}
Strictly return valid JSON only. Do not output conversational preamble.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28000);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://gojo-nerd.vercel.app',
        'X-Title': 'Gojo Study Assistant',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Document Title: ${cleanTitle}\n\nPlease analyze these lecture slides/notes and produce the complete exam study package:\n\n${cleanedSlides}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`OpenRouter analyze request failed with status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const parsed = extractJsonFromLlmText(content);
    return normalizeStudyPackage(parsed, cleanTitle);
  } catch (err) {
    clearTimeout(timer);
    console.warn('AI curriculum synthesis error/timeout:', err.message);
    return null;
  }
}

function buildCurriculumStudyPackage(rawText, title = 'Lecture_Material') {
  const cleanTitle = String(title || 'Lecture Study Guide')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const cleanedText = cleanLectureSlideText(rawText);

  const normalized = String(cleanedText || cleanTitle)
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  const rawSentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/^\[Slide\s*\/?\s*Page\s*\d+\]\s*/i, '').trim())
    .filter((s) => {
      if (s.length < 28 || s.length > 360) return false;
      if (isAdministrativeTerm(s.slice(0, 30))) return false;
      return true;
    });

  const sentences =
    rawSentences.length >= 3
      ? rawSentences
      : [
          `${cleanTitle} establishes the foundational mechanisms, structural definitions, and primary causal relationships covered in this unit.`,
          `Core processes in ${cleanTitle} operate through sequential state transitions regulated by boundary conditions and rate-limiting steps.`,
          `Distinguishing primary mechanisms from secondary outcomes is critical when evaluating quantitative or conceptual problem sets.`,
          `Applied problems require tracing how perturbations in initial inputs propagate through intermediate stages to alter final yield.`,
          `Comparative analysis across sections highlights where standard assumptions hold and where edge-case exceptions occur.`,
        ];

  const stopWords = new Set([
    'the','and','for','that','this','with','from','into','are','was','were','have','has','had','not','but','what','which','when','where','who','how','why','can','will','may','also','such','than','then','them','they','their','there','these','those','between','through','during','before','after','above','below','under','over','again','further','once','here','very','just','only','both','each','more','most','other','some','many','slide','page','lecture','notes','chapter','section','figure','table','using','used','uses','make','made','does','done','about','would','could','should','because','while','where','within','without','index','agenda','outline','contents','overview','summary','syllabus'
  ]);

  // Extract domain terms & multi-word technical phrases, excluding administrative terms
  const candidates = normalized.match(/\b[A-Z][a-zA-Z0-9-]{3,}(?:\s+[A-Z][a-zA-Z0-9-]{3,})?\b|\b[a-zA-Z]{6,}\b/g) || [];
  const freqMap = new Map();
  for (const rawWord of candidates) {
    const cleaned = rawWord.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const lower = cleaned.toLowerCase();
    if (cleaned.length < 4 || stopWords.has(lower) || /^\d+$/.test(cleaned) || isAdministrativeTerm(cleaned)) continue;
    const isCapitalized = /^[A-Z]/.test(cleaned);
    freqMap.set(lower, {
      display: isCapitalized ? cleaned : cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
      score: (freqMap.get(lower)?.score || 0) + (isCapitalized ? 3 : 1),
    });
  }

  const sortedTerms = Array.from(freqMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.display);

  const terms = sortedTerms.slice(0, 14);
  const fallbackTerms = [
    'Primary Mechanism',
    'Rate-Limiting Step',
    'Boundary Condition',
    'Equilibrium State',
    'Regulatory Feedback',
    'Substrate Coupling',
    'Structural Domain',
    'Terminal Output',
  ];
  for (const ft of fallbackTerms) {
    if (terms.length >= 10) break;
    if (!terms.some((t) => t.toLowerCase() === ft.toLowerCase())) {
      terms.push(ft);
    }
  }

  // 4 to 6 high-yield takeaways
  const targetTakeaways = Math.min(6, Math.max(4, Math.ceil(sentences.length / 4)));
  const takeaways = [];
  for (let i = 0; i < targetTakeaways; i++) {
    const sIdx = Math.min(
      sentences.length - 1,
      Math.floor((i * sentences.length) / targetTakeaways)
    );
    const sentence = sentences[sIdx];
    let matchedTerm =
      terms.find((t) => sentence.toLowerCase().includes(t.toLowerCase())) ||
      terms[i % terms.length] ||
      `Core Principle ${i + 1}`;

    if (isAdministrativeTerm(matchedTerm)) {
      matchedTerm = `Core Principle ${i + 1}`;
    }

    takeaways.push({
      num: String(i + 1).padStart(2, '0'),
      concept: matchedTerm,
      desc: sentence,
    });
  }

  // Exam trap
  const contrastSentence =
    sentences.find((s) => /\b(not|however|unlike|whereas|only|except|instead|rather|solely|never|must)\b/i.test(s)) ||
    sentences[Math.floor(sentences.length / 2)] ||
    sentences[0];
  const trap = `Pay close attention to the distinction between ${terms[0] || 'the primary mechanism'} and ${terms[1] || 'secondary stages'}: ${contrastSentence}`;

  // Flashcards
  const cards = terms.slice(0, 12).map((term, idx) => {
    const matchingSentence =
      sentences.find((s) => s.toLowerCase().includes(term.toLowerCase())) ||
      sentences[idx % sentences.length];
    return {
      term,
      def: matchingSentence,
    };
  });

  // Diagnostic multiple-choice questions
  const targetQuestions = Math.min(10, Math.max(6, sentences.length));
  const questions = [];
  for (let i = 0; i < targetQuestions; i++) {
    const sIdx = Math.min(
      sentences.length - 1,
      Math.floor((i * sentences.length) / targetQuestions)
    );
    const fact = sentences[sIdx];
    let focusTerm =
      terms.find((t) => fact.toLowerCase().includes(t.toLowerCase())) ||
      terms[i % terms.length];
    if (isAdministrativeTerm(focusTerm)) focusTerm = 'the active mechanism';

    const altTermA = terms[(i + 1) % terms.length] || 'secondary intermediates';
    const altTermB = terms[(i + 2) % terms.length] || 'external buffers';
    const correctSlot = i % 4;

    const distractors = [
      `It bypasses ${focusTerm} entirely and proceeds without ${altTermA} involvement.`,
      `It reverses the direction of ${altTermA} prior to reaching the ${altTermB} threshold.`,
      `It restricts ${focusTerm} exclusively to passive equilibrium without net output.`,
    ];

    const conciseFact = fact.length > 155 ? fact.slice(0, 152) + '...' : fact;
    const options = [];
    let dIdx = 0;
    for (let slot = 0; slot < 4; slot++) {
      if (slot === correctSlot) {
        options.push(conciseFact);
      } else {
        options.push(distractors[dIdx++]);
      }
    }

    questions.push({
      q: `Regarding ${focusTerm} in ${cleanTitle}, which statement accurately reflects the mechanism documented in the material?`,
      options,
      correct: correctSlot,
      critique: `Reference from source text: "${fact}" — The other choices misstate the sequence or dependency of ${focusTerm}.`,
      accolade: `Correct. "${conciseFact}" accurately states the documented mechanism for ${focusTerm}.`,
    });
  }

  return {
    unit_title: cleanTitle,
    takeaways,
    terms,
    trap,
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
    const activeTitle = fields.filename || fileName || 'Lecture_Material';

    if (fileBuffer && fileBuffer.length > 0 && !contentToAnalyze) {
      const detectedMime = detectMimeFromBuffer(fileBuffer, fileMime, activeTitle);
      if (detectedMime === 'application/pdf') {
        contentToAnalyze = (await extractPdfTextWithTimeout(fileBuffer)).trim();
      } else if (!detectedMime.startsWith('image/')) {
        contentToAnalyze = fileBuffer.toString('utf8').trim();
      }
    }

    if (!contentToAnalyze && !fileBuffer && !fields.imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a document or paste notes.',
      });
    }

    const sanitizedText = (contentToAnalyze || activeTitle)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30000);

    // 1. Try AI-powered analysis with contextual clustering & deep academic explanations
    let parsedData = await generateCurriculumWithAI(sanitizedText, activeTitle);

    // 2. Seamlessly fall back to enhanced rule-based heuristics if offline or AI call fails
    if (!parsedData) {
      parsedData = buildCurriculumStudyPackage(sanitizedText, activeTitle);
    }

    return res.status(200).json({
      success: true,
      extractedText: sanitizedText.slice(0, 20000),
      data: parsedData,
    });
  } catch (err) {
    console.error('Document analysis error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An error occurred while indexing the document.',
    });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};
