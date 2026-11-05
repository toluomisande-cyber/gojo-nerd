const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];

async function executeWithModelFallback(genAI, config, operation) {
  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ ...config, model: modelName });
      return await operation(model);
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed: ${err.message?.slice(0, 80)}`);
    }
  }
  throw lastError;
}

function parseMultipartBuffer(buffer, contentType) {
  const boundaryMatch = (contentType || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;
  if (!boundary) {
    try {
      return { fields: JSON.parse(buffer.toString('utf8')), fileBuffer: null };
    } catch {
      return { fields: { text: buffer.toString('utf8') }, fileBuffer: null };
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
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerStr = part.slice(0, headerEnd).toString('utf8');
    const bodyBuf = part.slice(headerEnd + 4);
    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
    const fieldName = nameMatch ? nameMatch[1] : null;
    if (filenameMatch && fieldName === 'file') {
      fileBuffer = bodyBuf;
    } else if (fieldName) {
      fields[fieldName] = bodyBuf.toString('utf8');
    }
  }
  return { fields, fileBuffer };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(400).json({
        error: 'Gemini API key is not configured yet.',
        demoFallback: true,
      });
    }

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const rawBuffer = Buffer.concat(chunks);
    const { fields, fileBuffer } = parseMultipartBuffer(rawBuffer, req.headers['content-type']);

    let contentToAnalyze = '';
    if (fileBuffer && fileBuffer.length > 0) {
      const pdfData = await pdfParse(fileBuffer);
      contentToAnalyze = pdfData.text;
    } else if (fields.text && fields.text.trim()) {
      contentToAnalyze = fields.text.trim();
    } else if (req.body && typeof req.body.text === 'string') {
      contentToAnalyze = req.body.text.trim();
    }

    if (!contentToAnalyze.trim()) {
      return res.status(400).json({ error: 'No readable text extracted.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Analyze this study material and produce 3 takeaways, 5 key terms, 1 professor trap, and 3 multiple choice questions:\n\n"""\n${contentToAnalyze.slice(0, 80000)}\n"""`;

    const parsedData = await executeWithModelFallback(
      genAI,
      {
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
        systemInstruction: `You are Gojo.nerd, an elite academic synthesis engine.
Isolate non-negotiable core concepts, spot deceptive exam traps set by professors, and build high-yield diagnostic questions.
Output must strictly match this JSON schema:
{
  "takeaways": [
    { "num": "01", "concept": "Short Concept Name", "desc": "1-2 sentence core mechanism." }
  ],
  "terms": ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5"],
  "trap": "Direct 1-2 sentence warning about the primary trap professors use on this topic.",
  "questions": [
    {
      "q": "Sharp conceptual question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Direct explanation of why the wrong options fail.",
      "accolade": "Short confirmation of mastery of the concept."
    }
  ]
}`,
      },
      async (model) => {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
      }
    );

    return res.status(200).json({ success: true, data: parsedData });
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

