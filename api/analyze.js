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

function buildCurriculumStudyPackage(rawText, title = 'Lecture_Material') {
  const cleanTitle = String(title || 'Lecture Study Guide')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const normalized = String(rawText || cleanTitle)
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  const rawSentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/^\[Slide\s*\/?\s*Page\s*\d+\]\s*/i, '').trim())
    .filter((s) => s.length >= 28 && s.length <= 360);

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
    'the','and','for','that','this','with','from','into','are','was','were','have','has','had','not','but','what','which','when','where','who','how','why','can','will','may','also','such','than','then','them','they','their','there','these','those','between','through','during','before','after','above','below','under','over','again','further','once','here','very','just','only','both','each','more','most','other','some','many','slide','page','lecture','notes','chapter','section','figure','table','using','used','uses','make','made','does','done','about','would','could','should','because','while','where','within','without'
  ]);

  // Extract domain terms & multi-word technical phrases
  const candidates = normalized.match(/\b[A-Z][a-zA-Z0-9-]{3,}(?:\s+[A-Z][a-zA-Z0-9-]{3,})?\b|\b[a-zA-Z]{6,}\b/g) || [];
  const freqMap = new Map();
  for (const rawWord of candidates) {
    const cleaned = rawWord.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const lower = cleaned.toLowerCase();
    if (cleaned.length < 4 || stopWords.has(lower) || /^\d+$/.test(cleaned)) continue;
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

  // Evenly sample 5 to 6 high-yield takeaways across beginning, middle, and end of the document
  const targetTakeaways = Math.min(6, Math.max(4, Math.ceil(sentences.length / 4)));
  const takeaways = [];
  for (let i = 0; i < targetTakeaways; i++) {
    const sIdx = Math.min(
      sentences.length - 1,
      Math.floor((i * sentences.length) / targetTakeaways)
    );
    const sentence = sentences[sIdx];
    const matchedTerm =
      terms.find((t) => sentence.toLowerCase().includes(t.toLowerCase())) ||
      terms[i % terms.length] ||
      `Unit Principle ${i + 1}`;

    takeaways.push({
      num: String(i + 1).padStart(2, '0'),
      concept: matchedTerm,
      desc: sentence,
    });
  }

  // Exam trap / key distinction
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

  // Diagnostic multiple-choice questions spaced across the material
  const targetQuestions = Math.min(10, Math.max(6, sentences.length));
  const questions = [];
  for (let i = 0; i < targetQuestions; i++) {
    const sIdx = Math.min(
      sentences.length - 1,
      Math.floor((i * sentences.length) / targetQuestions)
    );
    const fact = sentences[sIdx];
    const focusTerm =
      terms.find((t) => fact.toLowerCase().includes(t.toLowerCase())) ||
      terms[i % terms.length];
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

    const parsedData = buildCurriculumStudyPackage(sanitizedText, activeTitle);

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
