const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MEMORY_FILE = path.join(DATA_DIR, 'user-memory.json');

// In-memory fallback store if filesystem is read-only (e.g. serverless runtime)
let memoryStoreCache = { users: {} };

function readMemoryStore() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.users) {
        memoryStoreCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Memory store read notice:', err.message);
  }
  return memoryStoreCache;
}

function writeMemoryStore(store) {
  memoryStoreCache = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('Memory store write notice (using in-memory cache):', err.message);
  }
}

function normalizeUserKey(userId, email) {
  if (userId && String(userId).trim()) return String(userId).trim();
  if (email && String(email).trim()) return String(email).trim().toLowerCase();
  return null;
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (Buffer.isBuffer(req.body)) {
    return JSON.parse(req.body.toString('utf8') || '{}');
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    return JSON.parse(req.body);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const store = readMemoryStore();

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, 'http://localhost');
    const userId = urlObj.searchParams.get('userId');
    const email = urlObj.searchParams.get('email');
    const listAll = urlObj.searchParams.get('list');

    if (listAll === 'all') {
      const profiles = Object.values(store.users).map((u) => u.profile).filter(Boolean);
      return res.status(200).json({ success: true, profiles });
    }

    const key = normalizeUserKey(userId, email);
    if (!key) {
      return res.status(400).json({ error: 'userId or email parameter is required' });
    }

    // Match by id or email
    let record = store.users[key];
    if (!record && email) {
      const lowerEmail = email.toLowerCase();
      record = Object.values(store.users).find(
        (u) => u.profile && String(u.profile.email || '').toLowerCase() === lowerEmail
      );
    }

    return res.status(200).json({
      success: true,
      user: record || {
        profile: { id: key },
        memories: [],
        library: [],
        chatHistory: [],
        stats: { decksAnalyzed: 1, drillsAttempted: 0, drillsMastered: 0, cardsMastered: 0 },
      },
    });
  }

  if (req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { action = 'sync', userId, profile, memory, memoryId, memories, deck, deckId, library, chatHistory, stats, activeDeck } = body;

      const key = normalizeUserKey(userId || (profile && profile.id), profile && profile.email);
      if (!key) {
        return res.status(400).json({ error: 'userId or profile.id is required' });
      }

      const existing = store.users[key] || {
        profile: profile || { id: key },
        memories: [],
        library: [],
        chatHistory: [],
        activeDeck: null,
        stats: { decksAnalyzed: 1, drillsAttempted: 0, drillsMastered: 0, cardsMastered: 0 },
        updatedAt: new Date().toISOString(),
      };

      if (profile && typeof profile === 'object') {
        existing.profile = { ...existing.profile, ...profile, id: key };
      }
      if (stats && typeof stats === 'object') {
        existing.stats = { ...existing.stats, ...stats };
      }
      if (activeDeck && typeof activeDeck === 'object') {
        existing.activeDeck = activeDeck;
      }

      if (action === 'sync') {
        if (Array.isArray(memories)) existing.memories = memories.slice(0, 200);
        if (Array.isArray(library)) existing.library = library.slice(0, 50);
        if (Array.isArray(chatHistory)) existing.chatHistory = chatHistory.slice(-60);
      } else if (action === 'add_memory' && memory && memory.content) {
        const cleanContent = String(memory.content).trim();
        const isDuplicate = existing.memories.some(
          (m) => String(m.content).trim().toLowerCase() === cleanContent.toLowerCase()
        );
        if (!isDuplicate) {
          const item = {
            id: memory.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            category: memory.category || 'note',
            content: cleanContent,
            source: memory.source || 'Study desk',
            createdAt: memory.createdAt || new Date().toISOString(),
          };
          existing.memories = [item, ...existing.memories].slice(0, 200);
        }
      } else if (action === 'delete_memory' && memoryId) {
        existing.memories = existing.memories.filter((m) => m.id !== memoryId);
      } else if (action === 'clear_memories') {
        existing.memories = [];
      } else if (action === 'save_deck' && deck && deck.filename) {
        const filtered = existing.library.filter((d) => d.filename !== deck.filename && d.id !== deck.id);
        const savedDeck = {
          id: deck.id || `deck_${Date.now()}`,
          filename: deck.filename,
          studyData: deck.studyData,
          updatedAt: new Date().toISOString(),
        };
        existing.library = [savedDeck, ...filtered].slice(0, 50);
        existing.activeDeck = deck.studyData || existing.activeDeck;
      } else if (action === 'delete_deck' && deckId) {
        existing.library = existing.library.filter((d) => d.id !== deckId && d.filename !== deckId);
      }

      existing.updatedAt = new Date().toISOString();
      store.users[key] = existing;
      writeMemoryStore(store);

      return res.status(200).json({
        success: true,
        user: existing,
      });
    } catch (err) {
      console.error('Memory API error:', err);
      return res.status(500).json({ error: err.message || 'Failed to update user memory' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
