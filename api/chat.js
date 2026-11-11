const DAILY_FREE_LIMIT = 15;
const rateLimitStore = new Map();

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getQuotaState(userId, clientUsedCount, resetQuota) {
  const day = getTodayKey();
  const key = `${userId || 'guest'}:${day}`;
  if (resetQuota) {
    rateLimitStore.set(key, 0);
  }
  const serverUsed = rateLimitStore.get(key) || 0;
  const used = resetQuota
    ? 0
    : Math.max(serverUsed, typeof clientUsedCount === 'number' ? clientUsedCount : 0);
  return { key, used, limit: DAILY_FREE_LIMIT, remaining: Math.max(0, DAILY_FREE_LIMIT - used) };
}

function buildDocumentReferenceReply(message, documentContext, userMemory, autoSavedMemory) {
  const q = String(message || '').trim();
  const qLower = q.toLowerCase();
  const doc = String(documentContext || '').trim();
  const studentName = (userMemory && userMemory.name && userMemory.name !== 'Student') ? userMemory.name.split(' ')[0] : '';

  if (autoSavedMemory) {
    return `Got it${studentName ? `, ${studentName}` : ''} — I've saved that to your personal memory under **${autoSavedMemory.category.replace('_', ' ')}**:\n\n"${autoSavedMemory.content}"\n\nI'll keep this in mind as we go through your notes.`;
  }

  const memories = (userMemory && Array.isArray(userMemory.memories)) ? userMemory.memories : [];
  if (/\b(my memory|my memories|weak spot|weak spots|what did i miss|saved notes|what do you remember)\b/i.test(qLower)) {
    if (memories.length === 0) {
      return `You don't have any saved notes in your memory ledger yet. Tell me "Remember that..." or tap **Save to memory** on any takeaway and I'll track it for you.`;
    }
    const summaryList = memories
      .slice(0, 5)
      .map((m, idx) => `${idx + 1}. **[${m.category || 'note'}]** ${m.content}`)
      .join('\n');
    return `Here's what I currently have saved for you:\n\n${summaryList}`;
  }

  if (/^(hi|hello|hey|yo|sup|good morning|good evening)\b/i.test(qLower) && q.length < 25) {
    return `Hey${studentName ? ` ${studentName}` : ''}! Ready to go through your notes. Ask me to break down a mechanism, quiz you on a concept, or point out the main exam trap in this material.`;
  }

  const sentences = doc
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\n+|\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) {
    return `I couldn't find matching passages for "${q}" yet. Upload a PDF or paste your lecture notes on the left so I can read through them with you.`;
  }

  if (/\b(trap|insight|pitfall|mistake|trick|exam)\b/i.test(qLower)) {
    const trapLine = sentences.find((s) => /\b(trap|insight|not|solely|only|however|unlike|whereas|exception)\b/i.test(s)) || sentences[0];
    return `Here is the key exam trap to watch out for in your notes:\n\n**${trapLine}**\n\nMake sure you don't mix up the primary site of action with upstream steps when answering multiple-choice questions.`;
  }

  const keywords = (qLower.match(/\b[a-z0-9]{4,}\b/g) || []).filter(
    (w) => !['what', 'where', 'when', 'which', 'explain', 'describe', 'about', 'from', 'this', 'that', 'with', 'into', 'does', 'mean', 'primary', 'compare'].includes(w)
  );

  const scored = sentences.map((s) => {
    const lower = s.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 3;
    }
    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item) => item.s);

  const selected = topMatches.length > 0 ? topMatches : sentences.slice(0, 3);

  return `Based on your uploaded notes, here's how that works:\n\n${selected.map((line) => `• ${line}`).join('\n\n')}\n\nWant me to test you on this or break it down further?`;
}

async function queryFreeLimitedModel(message, documentContext, userMemory, history) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const memories = (userMemory && Array.isArray(userMemory.memories)) ? userMemory.memories.slice(0, 8) : [];
    const memoryBlock = memories.length > 0
      ? `\nStudent saved notes:\n${memories.map((m) => `- [${m.category}] ${m.content}`).join('\n')}`
      : '';

    const systemPrompt = [
      'You are a sharp, friendly study partner texting a student about their uploaded lecture notes.',
      'Keep replies concise (2 to 4 short paragraphs or bullet points), clear, and natural like a smart tutor texting back.',
      'Never mention AI providers, model names, or OpenAI/Google/Gemini.',
      'Ground your answer strictly in the provided lecture notes and student memory.',
      `Lecture notes context:\n${String(documentContext || '').slice(0, 12000)}${memoryBlock}`,
    ].join('\n\n');

    const recentHistory = Array.isArray(history)
      ? history.slice(-4).map((h) => ({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: String(h.content || '').slice(0, 600),
        }))
      : [];

    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'openai',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentHistory,
          { role: 'user', content: String(message).slice(0, 1000) },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (text && typeof text === 'string' && text.trim().length > 10) {
      return text.trim();
    }
    return null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

    const { message, documentContext, userMemory, history, usedToday, resetQuota } = body;
    const userId = (userMemory && (userMemory.id || userMemory.name)) || 'guest';
    const quota = getQuotaState(userId, usedToday, Boolean(resetQuota));

    if (resetQuota && (!message || !message.trim())) {
      return res.status(200).json({
        reply: 'Your daily free message quota has been reset (15/15 available).',
        quota: { used: 0, limit: DAILY_FREE_LIMIT, remaining: DAILY_FREE_LIMIT },
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Query cannot be empty.' });
    }

    if (quota.remaining <= 0) {
      return res.status(200).json({
        limitReached: true,
        reply: `You've used all **${DAILY_FREE_LIMIT}/${DAILY_FREE_LIMIT} free messages** for today. Your free allowance resets at midnight, or you can tap **Reset Free Quota** below to continue studying right away.`,
        quota: { used: DAILY_FREE_LIMIT, limit: DAILY_FREE_LIMIT, remaining: 0 },
      });
    }

    // Consume 1 message from the free daily quota
    const nextUsed = quota.used + 1;
    rateLimitStore.set(quota.key, nextUsed);
    const updatedQuota = {
      used: nextUsed,
      limit: DAILY_FREE_LIMIT,
      remaining: Math.max(0, DAILY_FREE_LIMIT - nextUsed),
    };

    let autoSavedMemory = null;
    const memMatch = String(message)
      .trim()
      .match(/^(?:please\s+)?(?:remember(?:\s+that)?|save(?:\s+to\s+memory)?|store(?:\s+in\s+memory)?|note\s+that|keep\s+in\s+mind(?:\s+that)?|my\s+exam\s+is|i\s+struggle\s+with)\s*[:,-]?\s*(.+)$/i);
    if (memMatch && memMatch[1] && memMatch[1].trim().length > 3) {
      const lowerMsg = String(message).toLowerCase();
      const isExam = /exam|midterm|final|quiz|test|date/i.test(lowerMsg);
      const isWeak = /struggle|confus|hard|weak|miss/i.test(lowerMsg);
      autoSavedMemory = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category: isExam ? 'exam_focus' : isWeak ? 'weak_spot' : 'note',
        content: String(message).trim(),
        source: 'Course reference',
        createdAt: new Date().toISOString(),
      };
    }

    let reply = null;
    if (!autoSavedMemory) {
      reply = await queryFreeLimitedModel(message, documentContext, userMemory, history);
    }
    if (!reply) {
      reply = buildDocumentReferenceReply(message, documentContext, userMemory, autoSavedMemory);
    }

    return res.status(200).json({
      reply,
      autoSavedMemory,
      quota: updatedQuota,
    });
  } catch (err) {
    console.error('Document lookup error:', err);
    return res.status(500).json({ error: err.message || 'Failed to search document.' });
  }
};
