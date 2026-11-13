import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE = path.join(DATA_DIR, "user-memory.json");

let memoryStoreCache: { users: Record<string, any> } = { users: {} };

function readMemoryStore() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.users) {
        memoryStoreCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    // Fallback to in-memory cache
  }
  return memoryStoreCache;
}

function writeMemoryStore(store: { users: Record<string, any> }) {
  memoryStoreCache = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    // Read-only filesystem in serverless; in-memory cache stays active
  }
}

export async function GET(req: NextRequest) {
  const store = readMemoryStore();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const email = searchParams.get("email");
  const listAll = searchParams.get("list");

  if (listAll === "all") {
    const profiles = Object.values(store.users)
      .map((u: any) => u.profile)
      .filter(Boolean);
    return NextResponse.json({ success: true, profiles });
  }

  const key = (userId && userId.trim()) || (email && email.trim().toLowerCase()) || null;
  if (!key) {
    return NextResponse.json({ error: "userId or email parameter is required" }, { status: 400 });
  }

  let record = store.users[key];
  if (!record && email) {
    const lowerEmail = email.toLowerCase();
    record = Object.values(store.users).find(
      (u: any) => u.profile && String(u.profile.email || "").toLowerCase() === lowerEmail
    );
  }

  return NextResponse.json({
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = "sync",
      userId,
      profile,
      memory,
      memoryId,
      memories,
      deck,
      deckId,
      library,
      chatHistory,
      stats,
      activeDeck,
    } = body;

    const key =
      (userId && String(userId).trim()) ||
      (profile?.id && String(profile.id).trim()) ||
      (profile?.email && String(profile.email).trim().toLowerCase()) ||
      null;

    if (!key) {
      return NextResponse.json({ error: "userId or profile.id is required" }, { status: 400 });
    }

    const store = readMemoryStore();
    const existing = store.users[key] || {
      profile: profile || { id: key },
      memories: [],
      library: [],
      chatHistory: [],
      activeDeck: null,
      stats: { decksAnalyzed: 1, drillsAttempted: 0, drillsMastered: 0, cardsMastered: 0 },
      updatedAt: new Date().toISOString(),
    };

    if (profile && typeof profile === "object") {
      existing.profile = { ...existing.profile, ...profile, id: key };
    }
    if (stats && typeof stats === "object") {
      existing.stats = { ...existing.stats, ...stats };
    }
    if (activeDeck && typeof activeDeck === "object") {
      existing.activeDeck = activeDeck;
    }

    if (action === "sync") {
      if (Array.isArray(memories)) existing.memories = memories.slice(0, 200);
      if (Array.isArray(library)) existing.library = library.slice(0, 50);
      if (Array.isArray(chatHistory)) existing.chatHistory = chatHistory.slice(-60);
    } else if (action === "add_memory" && memory && memory.content) {
      const cleanContent = String(memory.content).trim();
      const isDuplicate = existing.memories.some(
        (m: any) => String(m.content).trim().toLowerCase() === cleanContent.toLowerCase()
      );
      if (!isDuplicate) {
        const item = {
          id: memory.id || `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          category: memory.category || "note",
          content: cleanContent,
          source: memory.source || "Study desk",
          createdAt: memory.createdAt || new Date().toISOString(),
        };
        existing.memories = [item, ...existing.memories].slice(0, 200);
      }
    } else if (action === "delete_memory" && memoryId) {
      existing.memories = existing.memories.filter((m: any) => m.id !== memoryId);
    } else if (action === "clear_memories") {
      existing.memories = [];
    } else if (action === "save_deck" && deck && deck.filename) {
      const filtered = existing.library.filter((d: any) => d.filename !== deck.filename && d.id !== deck.id);
      const savedDeck = {
        id: deck.id || `deck_${Date.now()}`,
        filename: deck.filename,
        studyData: deck.studyData,
        updatedAt: new Date().toISOString(),
      };
      existing.library = [savedDeck, ...filtered].slice(0, 50);
      existing.activeDeck = deck.studyData || existing.activeDeck;
    } else if (action === "delete_deck" && deckId) {
      existing.library = existing.library.filter((d: any) => d.id !== deckId && d.filename !== deckId);
    }

    existing.updatedAt = new Date().toISOString();
    store.users[key] = existing;
    writeMemoryStore(store);

    return NextResponse.json({ success: true, user: existing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update user memory" }, { status: 500 });
  }
}

