const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

const PORT = process.env.PORT || 4100;

// High-availability model cascade: using rock-solid 200 OK models
const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];

async function executeWithModelFallback(genAI, config, operation) {
  let lastError = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ ...config, model: modelName });
      return await operation(model);
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} encountered issue: ${err.message?.slice(0, 80)}. Trying next candidate...`);
    }
  }
  throw lastError;
}

function parseMultipartBody(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;

    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      if (!boundary) {
        // Fallback: check if JSON
        try {
          const json = JSON.parse(buffer.toString('utf8'));
          return resolve({ fields: json, fileBuffer: null });
        } catch {
          return resolve({ fields: { text: buffer.toString('utf8') }, fileBuffer: null });
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

      resolve({ fields, fileBuffer });
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Handle API route: POST /api/analyze
  if (urlPath === '/api/analyze' && req.method === 'POST') {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          error: "Gemini API key is not configured yet. Add your key to .env.local",
          demoFallback: true
        }));
      }

      const { fields, fileBuffer } = await parseMultipartBody(req);
      let contentToAnalyze = '';

      if (fileBuffer && fileBuffer.length > 0) {
        const pdfData = await pdfParse(fileBuffer);
        contentToAnalyze = pdfData.text;
      } else if (fields.text && fields.text.trim()) {
        contentToAnalyze = fields.text.trim();
      }

      if (!contentToAnalyze.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "No readable text extracted." }));
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const prompt = `Analyze this study material and produce 3 takeaways, 5 key terms, 1 professor trap, and 3 multiple choice questions:\n\n"""\n${contentToAnalyze.slice(0, 80000)}\n"""`;

      const parsedData = await executeWithModelFallback(genAI, {
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
        systemInstruction: `You are Gojo.nerd, an elite academic mind powered by the Six Eyes.
Your mission is to isolate non-negotiable core concepts, spot deceptive exam traps set by professors, and build high-yield diagnostic questions.

CRITICAL RULES:
1. Ground strictly in the provided text. Never hallucinate facts outside the material.
2. The "trap" must pinpoint the exact nuance, confusing terminology, or counter-intuitive detail professors test on multiple choice.
3. Keep takeaways concise and mechanism-focused.

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
      "critique": "Direct, witty explanation of why the wrong options fail.",
      "accolade": "Short praise confirming mastery of the concept."
    }
  ]
}`,
      }, async (model) => {
        const result = await model.generateContent(prompt);
        return JSON.parse(result.response.text());
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, data: parsedData }));
    } catch (err) {
      console.error('API Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message || 'Server error during extraction' }));
    }
  }

  // Handle API route: POST /api/chat
  if (urlPath === '/api/chat' && req.method === 'POST') {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Gemini API key is not configured yet." }));
      }

      const chunks = [];
      req.on('data', c => chunks.push(c));
      await new Promise(r => req.on('end', r));
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const { message, documentContext, history } = body;

      if (!message || !message.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "Message cannot be empty." }));
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const reply = await executeWithModelFallback(genAI, {
        temperature: 0.4,
        systemInstruction: `You are Gojo Sensei from Gojo.nerd. You are an effortlessly brilliant academic mentor who speaks with supreme confidence, wit, and total clarity.

STRICT CONSTRAINTS:
1. Base all answers strictly on the provided DOCUMENT CONTEXT below.
2. If the user asks something completely outside the material, say: "That's not in the lecture notes you gave me, sensei. Keep your focus on what's getting tested."
3. Ban corporate filler ("Certainly!", "I'd be glad to help!"). Jump straight into the explanation.
4. Use punchy everyday analogies to break down difficult mechanisms.
5. Keep responses concise (2 to 4 punchy paragraphs max).

DOCUMENT CONTEXT:
"""
${(documentContext || "").slice(0, 50000)}
"""`,
      }, async (model) => {
        const chat = model.startChat({
          history: (history || []).map((h) => ({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }],
          })),
        });
        const result = await chat.sendMessage(message);
        return result.response.text();
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ reply }));
    } catch (err) {
      console.error("Sensei Chat API Error:", err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message || "Failed to contact Sensei." }));
    }
  }

  // Static file serving
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg'
  };

  let filePath = path.join(__dirname, urlPath === '/' || urlPath === '/app/new' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (urlPath === '/gojo-night-workspace.jpg' || urlPath === '/image_9.png') {
      res.writeHead(302, { 'Location': 'https://images.unsplash.com/photo-1544256718-3bcf237f3974?auto=format&fit=crop&q=80&w=1600' });
      return res.end();
    }
    const reqExt = path.extname(urlPath).toLowerCase();
    if (reqExt && reqExt !== '.html') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mime[ext] || 'text/plain',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Gojo.nerd live server running on http://localhost:${PORT}`);
});

