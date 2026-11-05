const { GoogleGenerativeAI } = require('@google/generative-ai');

const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

function withModelTimeout(promise, ms = 7500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Model call timed out after ${ms}ms`)), ms)
    ),
  ]);
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBuffer = Buffer.concat(chunks);
    const { fields, fileBuffer, fileMime, fileName } = parseMultipartBuffer(rawBuffer, req.headers['content-type']);

    let contentToAnalyze = (fields.text || '').trim();
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
          try {
            contentToAnalyze = (await extractPdfTextWithTimeout(fileBuffer)).trim();
          } catch (e) {
            console.warn('PDF text parse notice, falling back to multimodal:', e.message);
          }
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
    const promptParts = [...inlineParts];
    if (inlineParts.length > 0 && contentToAnalyze) {
      promptParts.push(
        `Source Title: "${activeTitle}". Analyze the attached image/slide AND extracted text below. Be concise. Populate "extractedText" with a brief summary, and produce 3 takeaways, 6 key terms, 1 professor trap, 3 multiple choice questions, and 5 flashcards:\n\n"""\n${contentToAnalyze.slice(0, 45000)}\n"""`
      );
    } else if (inlineParts.length > 0) {
      promptParts.push(
        `Source Title: "${activeTitle}". Read all visible text, handwriting, slides, equations, or diagrams in the attached image(s) (if minimal text is visible, combine visual cues with the topic "${activeTitle}"). Be concise. Put a brief summary/transcription in "extractedText", and produce 3 takeaways, 6 key terms, 1 professor trap, 3 multiple choice questions, and 5 flashcards.`
      );
    } else {
      promptParts.push(
        `Source Title: "${activeTitle}". Analyze this study material concisely and produce 3 takeaways, 6 key terms, 1 professor trap, 3 multiple choice questions, and 5 flashcards:\n\n"""\n${contentToAnalyze.slice(0, 60000)}\n"""`
      );
    }

    const parsedData = await executeWithModelFallback(
      genAI,
      {
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.25,
          maxOutputTokens: 1400,
        },
        systemInstruction: `You are Gojo.nerd, an elite academic synthesis engine.
Isolate non-negotiable core concepts, spot deceptive exam traps set by professors, and build high-yield diagnostic questions and flashcards from text, slides, or images of lecture notes.
Output must strictly match this JSON schema:
{
  "extractedText": "If analyzing an image or slide, provide a clean, comprehensive transcription/summary of the text and concepts shown in the image.",
  "takeaways": [
    { "num": "01", "concept": "Short Concept Name", "desc": "1-2 sentence core mechanism." }
  ],
  "terms": ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5", "Term 6"],
  "trap": "Direct 1-2 sentence warning about the primary trap professors use on this topic.",
  "questions": [
    {
      "q": "Sharp conceptual question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Direct explanation of why the wrong options fail.",
      "accolade": "Short confirmation of mastery of the concept."
    }
  ],
  "cards": [
    { "term": "Key Term or Concept", "def": "Clear 1-2 sentence definition or mechanism from the material." }
  ]
}`,
      },
      async (model) => {
        const result = await model.generateContent(promptParts);
        return JSON.parse(result.response.text());
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
    return res.status(500).json({ error: err.message || 'Server error during extraction' });
  }
};

module.exports.config = {
  api: {
    bodyParser: false,
  },
};
