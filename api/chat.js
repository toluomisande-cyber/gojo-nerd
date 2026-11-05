const { GoogleGenerativeAI } = require('@google/generative-ai');

const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash'];

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(400).json({ error: 'Gemini API key is not configured yet.' });
    }

    let body = req.body;
    if (!body || typeof body === 'string') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      body = raw ? JSON.parse(raw) : {};
    }

    const { message, documentContext, history } = body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const reply = await executeWithModelFallback(
      genAI,
      {
        temperature: 0.4,
        systemInstruction: `You are Gojo from Gojo.nerd, an academic syllabus and research partner.
Base all answers strictly on the provided DOCUMENT CONTEXT below.
Keep responses concise (2 to 3 punchy paragraphs max).

DOCUMENT CONTEXT:
"""
${(documentContext || '').slice(0, 50000)}
"""`,
      },
      async (model) => {
        const chat = model.startChat({
          history: (history || []).map((h) => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
          })),
        });
        const result = await chat.sendMessage(message);
        return result.response.text();
      }
    );

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Vercel Chat Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to contact assistant.' });
  }
};

