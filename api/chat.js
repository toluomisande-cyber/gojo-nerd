function buildDocumentReferenceReply(message, documentContext, userMemory, autoSavedMemory) {
  const q = String(message || '').trim();
  const qLower = q.toLowerCase();
  const doc = String(documentContext || '').trim();

  if (autoSavedMemory) {
    return `Saved to your personal memory ledger under **${autoSavedMemory.category.replace('_', ' ')}**:\n\n"${autoSavedMemory.content}"\n\nYou can review or filter this entry anytime in the **Personal Memory** tab.`;
  }

  const memories = (userMemory && Array.isArray(userMemory.memories)) ? userMemory.memories : [];
  if (/\b(my memory|my memories|weak spot|weak spots|what did i miss|saved notes|what do you remember)\b/i.test(qLower)) {
    if (memories.length === 0) {
      return `No entries are stored in your personal memory ledger yet. You can save any syllabus mechanism using **Save to memory** or add a note directly in the **Personal Memory** tab.`;
    }
    const summaryList = memories
      .slice(0, 5)
      .map((m, idx) => `${idx + 1}. **[${m.category || 'note'}]** ${m.content}`)
      .join('\n');
    return `Here are the most recent entries in your personal memory ledger:\n\n${summaryList}`;
  }

  const sentences = doc
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?])\n+|\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) {
    return `No source passages matched "${q}". Upload a syllabus PDF or paste lecture notes in the left pane to index the document.`;
  }

  if (/\b(trap|insight|pitfall|mistake|trick|exam)\b/i.test(qLower)) {
    const trapLine = sentences.find((s) => /\b(trap|insight|not|solely|only|however|unlike|whereas|exception)\b/i.test(s)) || sentences[0];
    return `**Exam nuance from source material:**\n\n${trapLine}\n\nFocus on distinguishing the primary mechanism from secondary steps when reviewing this section.`;
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

  return `**Referenced passages from active syllabus:**\n\n${selected.map((line) => `- ${line}`).join('\n\n')}`;
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

    const { message, documentContext, userMemory } = body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Query cannot be empty.' });
    }

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

    const reply = buildDocumentReferenceReply(message, documentContext, userMemory, autoSavedMemory);
    return res.status(200).json({ reply, autoSavedMemory });
  } catch (err) {
    console.error('Document lookup error:', err);
    return res.status(500).json({ error: err.message || 'Failed to search document.' });
  }
};
