const { GoogleGenerativeAI } = require('@google/generative-ai');

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

function withModelTimeout(promise, ms = 7500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Model call timed out after ${ms}ms`)), ms)
    ),
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
      console.warn(`[Gemini Fallback] Model ${modelName} failed: ${err.message?.slice(0, 80)}`);
    }
  }
  throw lastError;
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
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(400).json({ error: 'Gemini API key is not configured yet.' });
    }

    let body = req.body;
    if (!body || typeof body === 'string' || Buffer.isBuffer(body)) {
      if (Buffer.isBuffer(body)) {
        body = JSON.parse(body.toString('utf8') || '{}');
      } else if (typeof body === 'string' && body.length > 0) {
        body = JSON.parse(body);
      } else {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        body = raw ? JSON.parse(raw) : {};
      }
    }

    const { message, documentContext, history, userMemory } = body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    // Detect explicit memory storage commands from the user message
    let autoSavedMemory = null;
    const memMatch = String(message).trim().match(/^(?:please\s+)?(?:remember(?:\s+that)?|save(?:\s+to\s+memory)?|store(?:\s+in\s+memory)?|note\s+that|keep\s+in\s+mind(?:\s+that)?|my\s+exam\s+is|i\s+struggle\s+with)\s*[:,-]?\s*(.+)$/i);
    if (memMatch && memMatch[1] && memMatch[1].trim().length > 3) {
      const lowerMsg = String(message).toLowerCase();
      const isExam = /exam|midterm|final|quiz|test|date/i.test(lowerMsg);
      const isWeak = /struggle|confus|hard|weak|miss/i.test(lowerMsg);
      autoSavedMemory = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category: isExam ? 'exam_focus' : isWeak ? 'weak_spot' : 'note',
        content: String(message).trim(),
        source: 'Document assistant',
        createdAt: new Date().toISOString(),
      };
    }

    const memoryContextLines = [];
    if (userMemory && typeof userMemory === 'object') {
      if (userMemory.name || userMemory.major) {
        memoryContextLines.push(`Student: ${userMemory.name || 'Student'} (${userMemory.major || 'General studies'})`);
      }
      if (Array.isArray(userMemory.memories) && userMemory.memories.length > 0) {
        const formatted = userMemory.memories
          .slice(0, 25)
          .map((m) => `- [${m.category || 'note'}] ${m.content} (${m.source || 'Saved'})`)
          .join('\n');
        memoryContextLines.push(`Stored User Memories & Weak Spots:\n${formatted}`);
      }
    }
    const memoryBlock = memoryContextLines.length > 0
      ? `\n\nINTEGRATED STUDENT MEMORY (Use this to personalize explanations and connect to the student's stored notes, exam focus, and past weak spots):\n"""\n${memoryContextLines.join('\n\n')}\n"""`
      : '';

    const genAI = new GoogleGenerativeAI(apiKey);
    const reply = await executeWithModelFallback(
      genAI,
      {
        temperature: 0.4,
        systemInstruction: `You are Gojo from Gojo.nerd, an academic syllabus and research partner with integrated personal memory for the current student.
Base your academic explanations on the provided DOCUMENT CONTEXT and INTEGRATED STUDENT MEMORY below.
If the student asks about their stored memories, weak spots, or notes, reference their INTEGRATED STUDENT MEMORY directly.
If the student tells you to remember a preference, exam date, or note, confirm that you have stored it in their personal memory ledger.
Keep responses concise (2 to 3 punchy paragraphs max).

DOCUMENT CONTEXT:
"""
${(documentContext || '').slice(0, 50000)}
"""${memoryBlock}`,
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

    return res.status(200).json({ reply, autoSavedMemory });
  } catch (err) {
    console.error('Vercel Chat Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to contact assistant.' });
  }
};
