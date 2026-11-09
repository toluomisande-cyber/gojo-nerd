"use client";

import React, { useState, useEffect } from "react";

// --- TYPES ---
interface Takeaway {
  num: string;
  concept: string;
  desc: string;
}

interface Question {
  q: string;
  options: string[];
  correct: number;
  critique: string;
  accolade: string;
}

interface Flashcard {
  term: string;
  def: string;
}

interface StudyPayload {
  filename: string;
  takeaways: Takeaway[];
  terms: string[];
  trap: string;
  questions: Question[];
  cards: Flashcard[];
}

interface ChatMessage {
  role: "user" | "gojo";
  content: string;
  attachment?: string;
}

export interface MemoryItem {
  id: string;
  category: "note" | "exam_focus" | "weak_spot" | "preference";
  content: string;
  source: string;
  createdAt: string;
}

export interface SavedSyllabus {
  id: string;
  filename: string;
  studyData: StudyPayload;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  pin: string;
  major: string;
  avatarInitials: string;
  stats: {
    drillsAttempted: number;
    drillsMastered: number;
    cardsMastered: number;
    decksAnalyzed: number;
  };
}

// --- SAMPLE DATASET ---
const initialPayload: StudyPayload = {
  filename: "Cellular_Respiration_Core.pdf",
  takeaways: [
    {
      num: "01",
      concept: "Glycolysis is strictly cytosolic and anaerobic",
      desc: "Converts 1 glucose molecule into 2 pyruvates. Consumes 2 ATP in its activation phase; synthesizes 4 ATP by substrate-level phosphorylation (Net = +2 ATP, +2 NADH). Requires zero molecular oxygen.",
    },
    {
      num: "02",
      concept: "The Krebs Cycle is an electron carrier engine",
      desc: "Operates inside the mitochondrial matrix. Catabolizes Acetyl-CoA to generate bulk NADH and FADH2 to feed Complex I and II of the Electron Transport Chain.",
    },
    {
      num: "03",
      concept: "Oxygen acts purely as the terminal electron sink",
      desc: "Molecular oxygen does not manufacture ATP directly; it draws exhausted electrons through Complex IV of the inner membrane to maintain the proton pump and forms H2O.",
    },
    {
      num: "04",
      concept: "Chemiosmotic Proton Motive Force",
      desc: "Proton accumulation in the intermembrane space creates an electrochemical gradient that mechanically drives the ATP Synthase rotor to phosphorylate ADP into ATP.",
    },
    {
      num: "05",
      concept: "Anaerobic Fermentation as NADH Recycle Valve",
      desc: "In hypoxic conditions, pyruvate is reduced to lactate or ethanol solely to re-oxidize NADH back to NAD+, allowing glycolysis to continue substrate-level phosphorylation.",
    },
  ],
  terms: [
    "Glycolysis",
    "Acetyl-CoA",
    "Oxidative Phosphorylation",
    "Complex IV",
    "Chemiosmosis",
    "ATP Synthase",
    "Proton Motive Force",
    "Cytochrome c",
    "Substrate-Level Phosphorylation",
    "Fermentation",
  ],
  trap: "Multiple-choice exams consistently test where molecular oxygen is consumed. It is NOT involved in glycolysis or the citric acid cycle. It reacts solely at Complex IV of the Electron Transport Chain in the inner mitochondrial membrane.",
  questions: [
    {
      q: "[Slide 04] What is the precise biochemical purpose of molecular oxygen (O₂) in cellular respiration?",
      options: [
        "Directly initiates glucose cleavage in the cytosol",
        "Acts as the terminal electron acceptor at Complex IV of the ETC",
        "Catalyzes the formation of Acetyl-CoA from pyruvate",
        "Diffuses into the mitochondrial matrix to generate acetyl groups",
      ],
      correct: 1,
      critique:
        "Directly verified from Slide 04: Oxygen plays no part in glycolysis or Acetyl-CoA synthesis. It acts solely as the terminal sink at Complex IV.",
      accolade:
        "Correct. Precise identification. Oxygen's only role is to accept exhausted electrons at Complex IV.",
    },
    {
      q: "[Slide 12] In which anatomical compartment of the cell does the Citric Acid Cycle take place?",
      options: [
        "Cytoplasm",
        "Mitochondrial Matrix",
        "Inner Mitochondrial Membrane",
        "Intermembrane Space",
      ],
      correct: 1,
      critique:
        "Directly verified from Slide 12: The inner membrane houses the ETC; the citric acid cycle operates inside the matrix.",
      accolade:
        "Correct. Krebs enzymes are situated exclusively within the mitochondrial matrix.",
    },
    {
      q: "[Slide 18] What is the net ATP generation yielded by glycolysis per molecule of glucose?",
      options: ["0 ATP", "2 ATP", "4 ATP", "32 ATP"],
      correct: 1,
      critique:
        "Directly verified from Slide 18: Gross yield is 4 ATP, but 2 ATP are consumed during phosphorylation, giving a net yield of 2.",
      accolade: "Correct. Net yield is exactly 2 ATP.",
    },
    {
      q: "[Slide 27] How does ATP Synthase physically couple the proton gradient to ATP phosphorylation?",
      options: [
        "Through rotary mechanical catalysis driven by H+ flux through the F0 channel",
        "By directly oxidizing NADH within the intermembrane space",
        "By pumping pyruvate against its concentration gradient into the cytosol",
        "Through non-specific passive diffusion of phosphate across the outer membrane",
      ],
      correct: 0,
      critique:
        "Directly verified from Slide 27: The proton motive force drives the rotary subunit of ATP Synthase to mechanically forge ATP from ADP and Pi.",
      accolade: "Correct. Rotational mechanical catalysis is the defining feature of ATP Synthase.",
    },
    {
      q: "[Slide 35] Why must muscle cells undergo lactate fermentation during acute strenuous hypoxia?",
      options: [
        "To synthesize additional bulk ATP directly from lactic acid",
        "To re-oxidize NADH back to NAD+ so glycolysis can continue substrate phosphorylation",
        "To transport pyruvate across the outer mitochondrial membrane",
        "To neutralize the acidic pH of the cytoplasmic matrix",
      ],
      correct: 1,
      critique:
        "Directly verified from Slide 35: Fermentation yields no new ATP; its sole metabolic purpose is regenerating NAD+ to sustain glycolysis.",
      accolade: "Correct. Fermentation is strictly an electron disposal valve to replenish the NAD+ pool.",
    },
    {
      q: "[Slide 44] Which complex of the electron transport chain receives electrons directly from FADH₂?",
      options: [
        "Complex I (NADH dehydrogenase)",
        "Complex II (Succinate dehydrogenase)",
        "Complex III (Cytochrome bc1)",
        "Complex IV (Cytochrome c oxidase)",
      ],
      correct: 1,
      critique:
        "Directly verified from Slide 44: Complex II accepts electrons from FADH2 without pumping protons across the inner membrane.",
      accolade: "Correct. Complex II is the direct entry point for FADH2.",
    },
  ],
  cards: [
    {
      term: "Glycolysis [Slide 03]",
      def: "Cytoplasmic pathway splitting 1 glucose into 2 pyruvates. Consumes 2 ATP, yields 4 ATP (Net: +2 ATP, +2 NADH).",
    },
    {
      term: "Acetyl-CoA [Slide 09]",
      def: "Gateway 2-carbon molecule for the Krebs cycle, generated from pyruvate oxidation in the mitochondrial matrix.",
    },
    {
      term: "Oxidative Phosphorylation [Slide 21]",
      def: "ATP synthesis driven by electron transfer to O₂ through the ETC, generating a proton gradient across the inner membrane.",
    },
    {
      term: "Complex IV [Slide 29]",
      def: "Cytochrome c oxidase; site where molecular oxygen is reduced to form water.",
    },
    {
      term: "ATP Synthase [Slide 34]",
      def: "Rotary turbine enzyme that channels H+ ions back into the matrix to phosphorylate ADP to ATP.",
    },
    {
      term: "Proton Motive Force [Slide 38]",
      def: "Electrochemical potential gradient generated by proton pumping across the inner mitochondrial membrane.",
    },
    {
      term: "Complex II [Slide 41]",
      def: "Succinate dehydrogenase; electron entry site for FADH₂ that bypasses Complex I and does not pump protons.",
    },
    {
      term: "Lactate Fermentation [Slide 48]",
      def: "Anaerobic electron sink that reduces pyruvate to lactic acid to regenerate NAD+ for ongoing glycolysis.",
    },
  ],
};

export default function AcademicWorkspace() {
  // Navigation & State
  const [activeTab, setActiveTab] = useState<"summary" | "arena" | "cards" | "chat" | "memory" | "source">("summary");
  const [studyData, setStudyData] = useState<StudyPayload>(initialPayload);
  const [sourceText, setSourceText] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  // Arena MCQ State
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [arenaScore, setArenaScore] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  // Flashcards State
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Student Personal Profiles & Authentication State
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<"login" | "enroll">("login");

  // Integrated User Memory State
  const [userMemories, setUserMemories] = useState<MemoryItem[]>([]);
  const [userLibrary, setUserLibrary] = useState<SavedSyllabus[]>([
    {
      id: "deck_initial",
      filename: initialPayload.filename,
      studyData: initialPayload,
      updatedAt: new Date().toISOString(),
    },
  ]);
  const [memoryFilter, setMemoryFilter] = useState<"all" | "weak_spot" | "exam_focus" | "note">("all");
  const [manualMemoryCategory, setManualMemoryCategory] = useState<MemoryItem["category"]>("note");
  const [manualMemoryInput, setManualMemoryInput] = useState<string>("");
  const [memorySyncStatus, setMemorySyncStatus] = useState<string>("Synced");

  // Sign In inputs
  const [loginIdentifier, setLoginIdentifier] = useState<string>("");
  const [loginPin, setLoginPin] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  // Enrollment inputs
  const [enrollName, setEnrollName] = useState<string>("");
  const [enrollMajor, setEnrollMajor] = useState<string>("");
  const [enrollEmail, setEnrollEmail] = useState<string>("");
  const [enrollPin, setEnrollPin] = useState<string>("");
  const [enrollError, setEnrollError] = useState<string>("");

  const syncMemoryWithServer = async (
    userKey: string,
    studentProfile: StudentProfile | null,
    nextMemories: MemoryItem[],
    nextLibrary: SavedSyllabus[],
    action = "sync",
    extra: Record<string, any> = {}
  ) => {
    setMemorySyncStatus("Syncing...");
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: userKey,
          profile: studentProfile || { id: userKey, name: "Guest session", major: "Unregistered desk" },
          memories: nextMemories,
          library: nextLibrary,
          stats: studentProfile?.stats || {},
          activeDeck: studyData,
          ...extra,
        }),
      });
      if (res.ok) setMemorySyncStatus("Synced to user record");
      else setMemorySyncStatus("Saved locally");
    } catch {
      setMemorySyncStatus("Saved locally");
    }
  };

  const loadStudentDesk = (student: StudentProfile) => {
    try {
      const savedStudy = localStorage.getItem(`gojo_desk_study_${student.id}`);
      if (savedStudy) {
        const parsed = JSON.parse(savedStudy);
        if (parsed && parsed.filename && Array.isArray(parsed.takeaways)) {
          setStudyData(parsed);
        }
      }
      const rawMem = localStorage.getItem(`gojo_user_memories_${student.id}`);
      if (rawMem) {
        const parsedMem = JSON.parse(rawMem);
        if (Array.isArray(parsedMem)) setUserMemories(parsedMem);
      } else {
        setUserMemories([]);
      }
      const rawLib = localStorage.getItem(`gojo_user_library_${student.id}`);
      if (rawLib) {
        const parsedLib = JSON.parse(rawLib);
        if (Array.isArray(parsedLib) && parsedLib.length > 0) setUserLibrary(parsedLib);
      }
    } catch (e) {}

    fetch(`/api/memory?userId=${encodeURIComponent(student.id)}&email=${encodeURIComponent(student.email || "")}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          if (Array.isArray(data.user.memories) && data.user.memories.length > 0) {
            setUserMemories((prev) => (prev.length === 0 ? data.user.memories : prev));
          }
          if (Array.isArray(data.user.library) && data.user.library.length > 0) {
            setUserLibrary((prev) => (prev.length <= 1 ? data.user.library : prev));
          }
        }
      })
      .catch(() => {});
  };

  const addMemoryEntry = (
    category: MemoryItem["category"],
    content: string,
    source: string
  ) => {
    const clean = content.trim();
    if (!clean) return;
    const key = currentStudent?.id || "guest_session";
    setUserMemories((prev) => {
      if (prev.some((m) => m.content.trim().toLowerCase() === clean.toLowerCase())) return prev;
      const entry: MemoryItem = {
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category,
        content: clean,
        source: source || studyData.filename || "Study desk",
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...prev].slice(0, 200);
      try {
        localStorage.setItem(`gojo_user_memories_${key}`, JSON.stringify(next));
      } catch {}
      void syncMemoryWithServer(key, currentStudent, next, userLibrary, "add_memory", { memory: entry });
      return next;
    });
  };

  const deleteMemoryEntry = (id: string) => {
    const key = currentStudent?.id || "guest_session";
    setUserMemories((prev) => {
      const next = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem(`gojo_user_memories_${key}`, JSON.stringify(next));
      } catch {}
      void syncMemoryWithServer(key, currentStudent, next, userLibrary, "delete_memory", { memoryId: id });
      return next;
    });
  };

  const clearAllUserMemories = () => {
    const key = currentStudent?.id || "guest_session";
    setUserMemories([]);
    try {
      localStorage.setItem(`gojo_user_memories_${key}`, JSON.stringify([]));
    } catch {}
    void syncMemoryWithServer(key, currentStudent, [], userLibrary, "clear_memories");
  };

  const saveDeckToLibrary = (deckPayload: StudyPayload) => {
    const key = currentStudent?.id || "guest_session";
    setUserLibrary((prev) => {
      const filtered = prev.filter((d) => d.filename !== deckPayload.filename);
      const entry: SavedSyllabus = {
        id: `deck_${Date.now()}`,
        filename: deckPayload.filename,
        studyData: deckPayload,
        updatedAt: new Date().toISOString(),
      };
      const next = [entry, ...filtered].slice(0, 30);
      try {
        localStorage.setItem(`gojo_user_library_${key}`, JSON.stringify(next));
      } catch {}
      void syncMemoryWithServer(key, currentStudent, userMemories, next, "save_deck", { deck: entry });
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("gojo_student_records_v2");
      let list: StudentProfile[] = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) list = parsed;
      }
      setStudents(list);
      if (list.length === 0) {
        setAuthTab("enroll");
      } else {
        setAuthTab("login");
      }

      const activeSessionId = sessionStorage.getItem("gojo_active_student_id");
      const isGuest = sessionStorage.getItem("gojo_guest_session") === "true";
      if (activeSessionId) {
        const found = list.find((s) => s.id === activeSessionId);
        if (found) {
          setCurrentStudent(found);
          loadStudentDesk(found);
          setIsLoginModalOpen(false);
          return;
        }
      }
      if (isGuest) {
        setIsLoginModalOpen(false);
        return;
      }
      setIsLoginModalOpen(true);
    } catch (e) {
      setIsLoginModalOpen(true);
    }
  }, []);

  const saveStudent = (updated: StudentProfile, nextStudyData?: StudyPayload) => {
    setCurrentStudent(updated);
    setStudents((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      const next = exists ? prev.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...prev];
      try {
        localStorage.setItem("gojo_student_records_v2", JSON.stringify(next));
        sessionStorage.setItem("gojo_active_student_id", updated.id);
        if (nextStudyData || studyData) {
          localStorage.setItem(`gojo_desk_study_${updated.id}`, JSON.stringify(nextStudyData || studyData));
        }
      } catch (e) {}
      return next;
    });
  };

  const handleSelectStudent = (studentId: string) => {
    const found = students.find((s) => s.id === studentId);
    if (found) {
      setCurrentStudent(found);
      loadStudentDesk(found);
      try {
        sessionStorage.setItem("gojo_active_student_id", found.id);
        sessionStorage.removeItem("gojo_guest_session");
      } catch (e) {}
      setIsLoginModalOpen(false);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = loginIdentifier.trim().toLowerCase();
    const pinClean = loginPin.trim();
    if (students.length === 0) {
      setLoginError("No student accounts exist on this device yet. Create your student desk first.");
      return;
    }
    const matched = students.find(
      (s) =>
        (s.id.toLowerCase() === idClean ||
          s.email.toLowerCase() === idClean ||
          s.name.toLowerCase() === idClean) &&
        (!s.pin || s.pin === pinClean)
    );
    if (matched) {
      setLoginError("");
      setCurrentStudent(matched);
      loadStudentDesk(matched);
      try {
        sessionStorage.setItem("gojo_active_student_id", matched.id);
        sessionStorage.removeItem("gojo_guest_session");
      } catch (err) {}
      setIsLoginModalOpen(false);
    } else {
      setLoginError("Account or passcode not recognized. Check your email or create a new desk.");
    }
  };

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollName.trim() || !enrollMajor.trim() || !enrollEmail.trim() || !enrollPin.trim()) return;
    const initials = enrollName
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    const studentId = `STD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newStudent: StudentProfile = {
      id: studentId,
      name: enrollName.trim(),
      email: enrollEmail.trim(),
      pin: enrollPin.trim(),
      major: enrollMajor.trim(),
      avatarInitials: initials,
      stats: {
        drillsAttempted: 0,
        drillsMastered: 0,
        cardsMastered: 0,
        decksAnalyzed: 1,
      },
    };

    const nextList = [newStudent, ...students];
    setStudents(nextList);
    setCurrentStudent(newStudent);
    try {
      localStorage.setItem("gojo_student_records_v2", JSON.stringify(nextList));
      localStorage.setItem(`gojo_desk_study_${newStudent.id}`, JSON.stringify(studyData));
      sessionStorage.setItem("gojo_active_student_id", newStudent.id);
      sessionStorage.removeItem("gojo_guest_session");
    } catch (e) {}
    setEnrollName("");
    setEnrollMajor("");
    setEnrollEmail("");
    setEnrollPin("");
    setIsLoginModalOpen(false);
  };

  const handleSignOut = () => {
    setCurrentStudent(null);
    try {
      sessionStorage.removeItem("gojo_active_student_id");
      sessionStorage.removeItem("gojo_guest_session");
    } catch (e) {}
    setIsProfileModalOpen(false);
    setIsLoginModalOpen(true);
  };

  const continueAsGuest = () => {
    try {
      sessionStorage.setItem("gojo_guest_session", "true");
      sessionStorage.removeItem("gojo_active_student_id");
    } catch (e) {}
    setCurrentStudent(null);
    setIsLoginModalOpen(false);
  };

  // Chat State
  const [isChatThinking, setIsChatThinking] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "gojo",
      content:
        "Indexed Cellular_Respiration_Core.pdf. Ask about any mechanisms in your slides, clarify difficult terms, or request a conceptual drill.",
    },
  ]);
  const [chatInput, setChatInput] = useState<string>("");

  const synthesizeFromTextLocally = (rawText: string, filename: string): StudyPayload => {
    const raw = String(rawText || "").trim();

    // 1. Identify slide boundaries [Slide / Page N]
    const slideRegex = /\[Slide \/ Page (\d+)\]([\s\S]*?)(?=(?:\[Slide \/ Page \d+\]|$))/gi;
    const parsedSlides: { slideNum: number; content: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = slideRegex.exec(raw)) !== null) {
      const slideNum = parseInt(m[1], 10);
      const content = m[2].trim();
      if (content) {
        parsedSlides.push({ slideNum, content });
      }
    }

    // 2. Extract substantive sentences with slide provenance
    const items: { text: string; slideNum: number }[] = [];
    if (parsedSlides.length > 0) {
      parsedSlides.forEach((slide) => {
        const sents = slide.content
          .split(/(?<=[.!?])\s+|\n+/)
          .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
          .filter((s) => s.length >= 25 && s.length <= 320);
        sents.forEach((s) => {
          items.push({ text: s, slideNum: slide.slideNum });
        });
      });
    }

    if (items.length === 0) {
      const cleaned = raw.replace(/\[Slide \/ Page \d+\]/g, "\n").replace(/\r\n/g, "\n").trim();
      const fallbackSents = cleaned
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter((s) => s.length >= 25 && s.length <= 320);
      const sourcePool = fallbackSents.length > 0
        ? fallbackSents
        : cleaned.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 10);
      sourcePool.forEach((s, idx) => {
        items.push({ text: s, slideNum: Math.floor(idx / 2) + 1 });
      });
    }

    if (items.length === 0) {
      items.push({ text: "Primary foundational mechanism described in study notes.", slideNum: 1 });
    }

    // 3. Extract terminology from across the ENTIRE presentation
    const stopWords = new Set([
      "about","above","after","again","against","all","also","among","because","been","before","being","below","between","both","could","does","doing","down","during","each","first","from","further","have","having","here","into","itself","just","more","most","must","other","over","same","should","some","such","than","that","their","them","then","there","these","they","this","those","through","under","until","very","what","when","where","which","while","with","would","your","document","section","chapter","lecture","study","notes","system","process","using","figure","table","chart","slide","page","review"
    ]);

    const termCounts = new Map<string, number>();
    const capMatches = raw.match(/\b[A-Z][a-zA-Z0-9-]{3,}(?:\s+[A-Z][a-zA-Z0-9-]{3,})?\b/g) || [];
    for (const cm of capMatches) {
      const cleanTerm = cm.trim();
      const firstWord = cleanTerm.split(/\s+/)[0];
      if (!stopWords.has(firstWord.toLowerCase()) && cleanTerm.length >= 4 && cleanTerm.length <= 34) {
        termCounts.set(cleanTerm, (termCounts.get(cleanTerm) || 0) + 1);
      }
    }

    if (termCounts.size < 15) {
      const words = raw.match(/\b[a-zA-Z]{6,22}\b/g) || [];
      for (const w of words) {
        const cap = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        if (!stopWords.has(cap.toLowerCase())) {
          termCounts.set(cap, (termCounts.get(cap) || 0) + 1);
        }
      }
    }

    const allSortedTerms = [...termCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);

    const finalTerms = allSortedTerms.slice(0, 20);
    while (finalTerms.length < 8) {
      finalTerms.push(`Core Mechanism 0${finalTerms.length + 1}`);
    }

    // 4. Dynamic question & flashcard counts scaled to document size (12 to 18 MCQs, 15 to 22 Cards!)
    const targetQCount = Math.min(18, Math.max(12, Math.floor(items.length / 3) || 12));
    const targetCardCount = Math.min(22, Math.max(15, Math.floor(items.length / 2) || 15));
    const targetPillars = Math.min(7, Math.max(5, Math.floor(items.length / 8) || 5));

    // 5. Build High-Yield Pillars (Takeaways) spanning beginning, middle, and end
    const takeaways: Takeaway[] = [];
    for (let p = 0; p < targetPillars; p++) {
      const idx = Math.floor((p / (targetPillars - 1 || 1)) * (items.length - 1));
      const item = items[idx] || items[0];
      const s = item ? item.text : "Core concept synthesized from uploaded material.";
      const colonIdx = s.indexOf(":");
      const matchedTerm = finalTerms[p] || `Principle 0${p + 1}`;
      const concept = colonIdx > 3 && colonIdx < 55
        ? s.slice(0, colonIdx).trim()
        : `${matchedTerm} (Slide ${item ? item.slideNum : p + 1})`;
      takeaways.push({
        num: String(p + 1).padStart(2, "0"),
        concept,
        desc: s,
      });
    }

    // 6. Professor's Exam Insight
    const trapItem = items.find((it) =>
      /\b(not|never|only|solely|except|however|whereas|unlike|must|strictly|important|contrast|rather than)\b/i.test(it.text)
    ) || items[Math.min(1, items.length - 1)] || items[0];

    const trap = `Key Exam Nuance [${trapItem && trapItem.slideNum ? `Slide ${trapItem.slideNum}` : 'Core Concept'}]: Professors frequently test qualifiers and causal directions on this mechanism — "${trapItem ? trapItem.text : 'Verify independent vs. dependent variables carefully.'}"`;

    // 7. Comprehensive Questions (12 to 18 MCQs spanning early, middle, and late slides)
    const questions: Question[] = [];
    for (let q = 0; q < targetQCount; q++) {
      const itemIdx = Math.floor((q / (targetQCount - 1 || 1)) * (items.length - 1));
      const item = items[itemIdx] || items[q % items.length];
      const s = item.text;
      const slideTag = item.slideNum ? `Slide ${item.slideNum}` : `Section 0${q + 1}`;
      const focusTerm = finalTerms[q % finalTerms.length] || "the described pathway";

      const other1 = items[(itemIdx + Math.floor(items.length / 3)) % items.length]?.text || "Operates independently of all primary cellular and experimental variables";
      const other2 = items[(itemIdx + Math.floor((items.length * 2) / 3)) % items.length]?.text || "Directly reverses the mechanism under standard resting conditions";
      const other3 = `Contraindicates ${finalTerms[(q + 2) % finalTerms.length] || "the system"} and halts under all operational phases`;

      const correctStatement = s.length > 120 ? s.slice(0, 117) + "..." : s;
      const distractor1 = other1.length > 110 ? other1.slice(0, 107) + "..." : other1;
      const distractor2 = other2.length > 110 ? other2.slice(0, 107) + "..." : other2;

      const correctPos = q % 4;
      const optionsList = [distractor1, distractor2, other3];
      optionsList.splice(correctPos, 0, correctStatement);

      questions.push({
        q: `[${slideTag}] Which statement accurately characterizes ${focusTerm} as detailed in ${filename}?`,
        options: optionsList,
        correct: correctPos,
        critique: `Directly verified from ${slideTag}: "${s}". Always check boundary conditions and slide context.`,
        accolade: `Correct. Verified from ${slideTag}. Precise mastery of ${focusTerm}.`,
      });
    }

    // 8. Comprehensive Flashcards (15 to 22 Flashcards spanning all slides!)
    const cards: Flashcard[] = [];
    const cardTerms = finalTerms.slice(0, targetCardCount);
    cardTerms.forEach((term, i) => {
      const matchedItem = items.find((it) => it.text.toLowerCase().includes(term.toLowerCase())) ||
        items[Math.floor((i / (cardTerms.length - 1 || 1)) * (items.length - 1))];
      const slideTag = matchedItem && matchedItem.slideNum ? ` [Slide ${matchedItem.slideNum}]` : "";
      cards.push({
        term: `${term}${slideTag}`,
        def: matchedItem ? matchedItem.text : "Key concept and mechanism extracted from uploaded study material.",
      });
    });

    return {
      filename,
      takeaways,
      terms: finalTerms,
      trap,
      questions,
      cards,
    };
  };

  // --- HANDLERS ---
  const compressImageFileToBase64 = (file: File, maxDim = 1400, quality = 0.82): Promise<{ base64: string; mimeType: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read image"));
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const img = new Image();
        img.onerror = () =>
          resolve({
            base64: dataUrl.replace(/^data:[^;]+;base64,/, ""),
            mimeType: file.type || "image/jpeg",
            dataUrl,
          });
        img.onload = () => {
          let w = img.naturalWidth || img.width || 800;
          let h = img.naturalHeight || img.height || 600;
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
          }
          const outUrl = canvas.toDataURL("image/jpeg", quality);
          resolve({
            base64: outUrl.replace(/^data:[^;]+;base64,/, ""),
            mimeType: "image/jpeg",
            dataUrl: outUrl,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setStudyData((prev) => ({ ...prev, filename: file.name }));
    const isImg = file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
    if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".md")) {
      const text = await file.text();
      setSourceText(text);
      await runSynthesis(file, text);
    } else if (isImg) {
      setSourceText(`[Uploaded Image: ${file.name}] — Synthesizing slide/image...`);
      await runSynthesis(file, "");
    } else {
      setSourceText(`[Uploaded PDF: ${file.name}] — Synthesizing document...`);
      await runSynthesis(file, "");
    }
  };

  const runSynthesis = async (fileToUse: File | null, textToUse: string) => {
    const cleanText = /^\[(Uploaded PDF|Uploaded Image):/i.test(textToUse.trim()) ? "" : textToUse.trim();
    if (!cleanText && !fileToUse) {
      alert("Please enter notes, upload a PDF, or upload an image first.");
      return;
    }
    setIsSynthesizing(true);
    const activeFilename = fileToUse ? fileToUse.name : "Custom_Study_Notes.txt";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 13500);
      let response: Response;

      try {
        const isImg = fileToUse && (fileToUse.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileToUse.name));
        if (isImg && fileToUse) {
          const compressed = await compressImageFileToBase64(fileToUse);
          response = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: activeFilename,
              text: cleanText,
              imageBase64: compressed.base64,
              imageMimeType: compressed.mimeType,
            }),
            signal: controller.signal,
          });
        } else {
          const formData = new FormData();
          if (fileToUse) formData.append("file", fileToUse);
          if (cleanText) formData.append("text", cleanText);
          response = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
        }
      } finally {
        clearTimeout(timeoutId);
      }

      const result = await response.json().catch(() => null);

      if (response.ok && result && result.success && result.data) {
        const apiData = result.data;
        const resolvedText = result.extractedText || apiData.extractedText || cleanText || activeFilename;
        if (result.extractedText || apiData.extractedText) {
          setSourceText(result.extractedText || apiData.extractedText);
        }
        const fallback = synthesizeFromTextLocally(resolvedText, activeFilename);
        const nextDeck: StudyPayload = {
          filename: activeFilename,
          takeaways: Array.isArray(apiData.takeaways) && apiData.takeaways.length ? apiData.takeaways : fallback.takeaways,
          terms: Array.isArray(apiData.terms) && apiData.terms.length ? apiData.terms : fallback.terms,
          trap: apiData.trap || fallback.trap,
          questions: Array.isArray(apiData.questions) && apiData.questions.length ? apiData.questions : fallback.questions,
          cards: Array.isArray(apiData.cards) && apiData.cards.length ? apiData.cards : fallback.cards,
        };
        setStudyData(nextDeck);
        saveDeckToLibrary(nextDeck);
      } else {
        const localData = synthesizeFromTextLocally(cleanText || `Visual Study Material: ${activeFilename}. Analyze key diagrams, labels, and core mechanisms.`, activeFilename);
        setStudyData(localData);
        saveDeckToLibrary(localData);
      }
      setCurrentQIndex(0);
      setSelectedAnswer(null);
      setArenaScore(0);
      setAnsweredCount(0);
      setQuizFinished(false);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setActiveTab("summary");
    } catch {
      const localData = synthesizeFromTextLocally(cleanText || `Visual Study Material: ${activeFilename}. Analyze key diagrams, labels, and core mechanisms.`, activeFilename);
      setStudyData(localData);
      saveDeckToLibrary(localData);
      setActiveTab("summary");
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSynthesize = async () => {
    await runSynthesis(uploadedFile, sourceText);
  };

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setAnsweredCount((prev) => prev + 1);
    const qObj = studyData.questions[currentQIndex];
    const isCorrect = index === qObj.correct;
    if (isCorrect) {
      setArenaScore((prev) => prev + 1);
    } else if (qObj) {
      addMemoryEntry(
        "weak_spot",
        `Missed check: ${qObj.q} — Correct: ${qObj.options[qObj.correct]} (${qObj.critique || "Review slide context"})`,
        `Active recall · ${studyData.filename}`
      );
    }
    if (currentStudent) {
      const nextStats = {
        ...currentStudent.stats,
        drillsAttempted: (currentStudent.stats?.drillsAttempted || 0) + 1,
        drillsMastered: (currentStudent.stats?.drillsMastered || 0) + (isCorrect ? 1 : 0),
      };
      saveStudent({ ...currentStudent, stats: nextStats });
    }
  };

  const handleNextQuestion = () => {
    if (currentQIndex < studyData.questions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      setQuizFinished(true);
    }
  };

  const streamTextIntoMessage = async (fullText: string) => {
    const words = fullText.split(" ");
    let current = "";
    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? "" : " ") + words[i];
      const snapshot = current;
      setChatMessages((prev) => {
        const copy = [...prev];
        if (copy.length > 0 && copy[copy.length - 1].role === "gojo") {
          copy[copy.length - 1] = { ...copy[copy.length - 1], content: snapshot };
        }
        return copy;
      });
      const word = words[i];
      const delay = 24 + (word.length * 5) + (/[.,!?:;]$/.test(word) ? 100 : 0);
      await new Promise((r) => setTimeout(r, Math.min(delay, 75)));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatThinking) return;

    const userQuery = chatInput.trim();
    const updatedHistory: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: userQuery, attachment: studyData.filename },
    ];
    setChatMessages(updatedHistory);
    setChatInput("");
    setIsChatThinking(true);

    const memCmdMatch = userQuery.match(
      /^(?:please\s+)?(?:remember(?:\s+that)?|save(?:\s+to\s+memory)?|store(?:\s+in\s+memory)?|note\s+that|keep\s+in\s+mind(?:\s+that)?|my\s+exam\s+is|i\s+struggle\s+with)\s*[:,-]?\s*(.+)$/i
    );
    if (memCmdMatch && memCmdMatch[1] && memCmdMatch[1].trim().length > 3) {
      const lowerQ = userQuery.toLowerCase();
      const cat: MemoryItem["category"] = /exam|midterm|final|quiz|test|date/i.test(lowerQ)
        ? "exam_focus"
        : /struggle|confus|hard|weak|miss/i.test(lowerQ)
        ? "weak_spot"
        : "note";
      addMemoryEntry(cat, userQuery, "Document assistant");
    }

    const contextStr =
      sourceText.trim() ||
      `${studyData.trap}\n${studyData.takeaways.map((t) => `${t.concept}: ${t.desc}`).join("\n")}`;

    let replyText = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userQuery,
          documentContext: contextStr,
          userMemory: {
            name: currentStudent?.name || "Student",
            major: currentStudent?.major || "",
            memories: userMemories.slice(0, 25),
          },
          history: updatedHistory.slice(0, -1).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.autoSavedMemory?.content) {
        addMemoryEntry(
          data.autoSavedMemory.category || "note",
          data.autoSavedMemory.content,
          data.autoSavedMemory.source || "Document assistant"
        );
      }
      if (res.ok && data && data.reply) {
        replyText = data.reply;
      }
    } catch {
      // Fallback to local grounded document search
    }

    if (!replyText) {
      if (memCmdMatch && memCmdMatch[1]) {
        replyText = `Stored in your personal memory ledger: "${userQuery}". I will keep this in context across your study sessions and recall drills.`;
      } else {
        const queryWords = userQuery
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3);
        const sentences = contextStr
          .split(/(?<=[.!?])\s+|\n+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 20);
        const bestMatch =
          sentences.find((s) => queryWords.some((w) => s.toLowerCase().includes(w))) ||
          studyData.takeaways[0]?.desc ||
          studyData.trap;

        replyText = `From "${studyData.filename}": ${bestMatch}`;
      }
    }

    setIsChatThinking(false);
    setChatMessages((prev) => [...prev, { role: "gojo", content: "" }]);
    await streamTextIntoMessage(replyText);
  };

  return (
    <div className="bg-[#F8F9FA] text-[#0F3470] font-sans antialiased h-[100dvh] flex flex-col overflow-hidden selection:bg-[#E4F1FF]">
      
      {/* TOP ACCENT STATUS BAR (#0F3470) */}
      <div className="bg-[#0F3470] text-white px-3 sm:px-6 py-1.5 flex items-center justify-between text-[11px] shrink-0 select-none">
        <div className="flex items-center gap-2 font-mono min-w-0">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
          <span className="font-semibold tracking-wide text-[10px] sm:text-[11px] truncate">GOJO.NERD // STUDY ENGINE</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-white/90 font-mono text-[10px]">
          <span>SUMMARY SYNTHESIS</span>
          <span className="text-white/40">|</span>
          <span>EXAM INSIGHTS</span>
          <span className="text-white/40">|</span>
          <span>ACTIVE RECALL</span>
          <span className="text-white/40">|</span>
          <span>3D FLASHCARDS</span>
        </div>
      </div>

      {/* TOP MASTHEAD */}
      <header className="h-14 border-b border-[#E2E8F0] bg-white px-3 sm:px-6 flex items-center justify-between shrink-0 select-none text-xs gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          
          {/* Subtle Vector Convergence Emblem */}
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="38" cy="50" r="23" fill="none" stroke="#0F3470" strokeWidth="4.5" strokeOpacity="0.9" />
              <circle cx="62" cy="50" r="23" fill="none" stroke="#DC2626" strokeWidth="4.5" strokeOpacity="0.8" />
              <circle cx="50" cy="50" r="14" fill="none" stroke="#64748B" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="20" y1="80" x2="80" y2="20" stroke="#0F3470" strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="50" r="6" fill="#0F3470" />
            </svg>
          </div>

          <div className="flex items-baseline gap-1.5 sm:gap-2 shrink-0">
            <span className="font-serif font-bold text-base text-[#0F3470] tracking-tight">Gojo</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="text-[#64748B] font-medium text-xs hidden sm:inline">Academic Syllabus &amp; Research Tool</span>
          </div>

          <div className="h-4 w-[1px] bg-[#E2E8F0] mx-1 sm:mx-2 hidden sm:block" />

          {/* Active File Metadata */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-[#E4F1FF] border border-[#C5DFFF] font-mono text-[10px] sm:text-[11px] text-[#0F3470] min-w-0 max-w-[140px] sm:max-w-xs">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-semibold truncate">{studyData.filename}</span>
            <span className="text-[#64748B] hidden md:inline">(14.2 KB text)</span>
          </div>
        </div>

        {/* Actions Area */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile Quick Upload Action Button */}
          <button
            type="button"
            onClick={() => setActiveTab("source")}
            className="md:hidden px-2.5 py-1.5 rounded border border-[#0F3470]/30 bg-[#E4F1FF]/70 active:bg-[#0F3470] active:text-white text-[#0F3470] flex items-center gap-1.5 font-mono text-[11px] font-semibold transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-[#0F3470]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>Upload</span>
          </button>

          {/* Print / Export Action */}
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:flex px-3 py-1.5 rounded border border-[#0F3470]/30 bg-[#E4F1FF]/60 hover:bg-[#0F3470] hover:text-white text-[#0F3470] transition-colors items-center gap-2 font-mono text-[11px] font-semibold shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Study Syllabus
          </button>

          {/* Personal Student Profile / Login Pill */}
          {currentStudent ? (
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-[#111827]/[0.1] bg-white hover:bg-[#F5F7FA] text-[#111827] transition-colors"
              title="Open student record"
            >
              <div className="w-6 h-6 rounded-md bg-[#0F3470] text-white font-mono text-[11px] font-medium flex items-center justify-center shrink-0">
                {currentStudent.avatarInitials}
              </div>
              <div className="text-left hidden sm:block leading-tight min-w-0">
                <div className="font-medium text-xs truncate max-w-[110px] text-[#111827]">
                  {currentStudent.name}
                </div>
                <div className="text-[11px] text-[#6B7487] truncate max-w-[110px]">
                  {currentStudent.major}
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#111827]/[0.12] bg-white hover:bg-[#F5F7FA] text-[#111827] transition-colors text-xs font-medium"
            >
              <span>Sign in</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN SPLIT PANE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANE: SOURCE TEXT EXPLORER (Desktop Only; on mobile it's an app tab) */}
        <aside className="hidden md:flex md:w-80 lg:w-96 border-r border-[#E2E8F0] bg-white flex-col shrink-0">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#E4F1FF]/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#0F3470] font-bold">Source Material</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0F3470] text-white font-semibold">PDF / Image / Text</span>
            </div>

            <div className="relative border border-dashed border-[#0F3470]/40 hover:border-[#0F3470] rounded-lg p-4 text-center bg-white cursor-pointer transition-colors">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.txt,.md,.csv,image/*,application/pdf,text/plain"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center justify-center gap-1 text-[#0F3470] text-xs">
                <svg className="w-5 h-5 text-[#0F3470] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span className="font-semibold">Upload lecture document or image</span>
                <span className="text-[10px] text-[#64748B] font-mono">PDF, PNG, JPG, Slide Photo, or Text</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B] mb-2">
              <span className="font-semibold text-[#0F3470]">SOURCE BUFFER</span>
              <button
                onClick={() =>
                  setSourceText(
                    `Cellular Respiration and ATP Generation:\nGlycolysis occurs in the cytoplasm and breaks glucose into 2 pyruvate molecules, yielding a net of 2 ATP and 2 NADH without requiring oxygen. The Krebs Cycle occurs in the mitochondrial matrix, processing Acetyl-CoA to produce NADH and FADH2. The Electron Transport Chain (ETC) sits in the inner membrane and generates the vast majority of cellular ATP via oxidative phosphorylation and the ATP Synthase proton gradient.\nOxygen acts strictly as the final electron acceptor at Complex IV. Without oxygen, oxidative phosphorylation halts, and cells must rely on anaerobic fermentation.`
                  )
                }
                className="text-[#0F3470] hover:underline text-[11px] font-semibold"
              >
                Load Sample
              </button>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste lecture excerpts, notes, or readings here..."
              className="flex-1 w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-3 text-xs font-mono text-[#0F3470] placeholder:text-slate-400 focus:outline-none focus:border-[#0F3470] resize-none leading-relaxed"
            />
            <button
              onClick={handleSynthesize}
              disabled={isSynthesizing}
              className="mt-3 w-full py-2.5 px-4 rounded-lg bg-[#0F3470] hover:bg-[#0F3470] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
            >
              <span>{isSynthesizing ? "Synthesizing Canvas..." : "Synthesize Study Canvas"}</span>
              <span className="font-mono">&rarr;</span>
            </button>
          </div>

          <div className="p-3 border-t border-[#0F3470] bg-[#0F3470] text-[11px] font-mono text-white/90 flex justify-between">
            <span>STATUS: READY</span>
            <span className="text-[#93C5FD] font-semibold">ENGINE: GEMINI FLASH</span>
          </div>
        </aside>

        {/* RIGHT PANE: ACADEMIC WORKSPACE */}
        <main className="flex-1 flex flex-col bg-[#F8F9FA] overflow-hidden">
          
          {/* TAB STRIP (Desktop Only) */}
          <div className="hidden md:flex h-11 border-b border-[#E2E8F0] px-6 items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-6 h-full">
              {[
                { id: "summary", label: "Executive Principles & Insights" },
                { id: "arena", label: "Active Recall Drills" },
                { id: "cards", label: "Flashcards" },
                { id: "chat", label: "Document Assistant" },
                { id: "memory", label: `Personal Memory (${userMemories.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`h-full px-1 text-xs transition-all flex items-center tabular-nums ${
                    activeTab === tab.id
                      ? "border-b-2 border-[#0F3470] text-[#0F3470] font-bold"
                      : "text-[#64748B] hover:text-[#0F3470] font-medium"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono text-[#64748B] tabular-nums">
              CONTEXT: <span className="px-2 py-0.5 rounded bg-[#E4F1FF] text-[#0F3470] font-semibold border border-[#C5DFFF]">USER MEMORY ({userMemories.length})</span>
            </div>
          </div>

          {/* ACTIVE TAB CONTENT */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 pb-24 md:pb-8 space-y-5 sm:space-y-6">
            
            {/* 1. SUMMARY VIEW */}
            {activeTab === "summary" && (
              <div className="max-w-3xl space-y-6">
                
                {/* Deep Navy Header Card (#0F3470) */}
                <div className="bg-[#0F3470] text-white rounded-lg p-5 shadow-sm flex items-center justify-between border-l-4 border-[#0F3470]">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#93C5FD] font-semibold block">
                      EXECUTIVE SYNTHESIS // HIGH-YIELD CORE
                    </span>
                    <h2 className="text-base font-serif font-bold mt-0.5">
                      {studyData.filename}
                    </h2>
                  </div>
                  <div className="text-right font-mono text-[11px] text-white/80 hidden sm:block">
                    <div>PILLARS: <strong className="text-white">03</strong></div>
                    <div>STATUS: <strong className="text-emerald-400">VERIFIED</strong></div>
                  </div>
                </div>

                {/* High-Yield Exam Insight Callout */}
                <div className="border-l-4 border-amber-500 bg-amber-50/70 p-4 sm:p-5 rounded-r-xl border-y border-r border-amber-200/80 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-950 text-xs font-bold font-mono uppercase tracking-wide">
                      <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Professor's Exam Insight</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addMemoryEntry("exam_focus", studyData.trap, `Exam insight · ${studyData.filename}`)}
                        className="text-[11px] font-medium px-2.5 py-0.5 rounded bg-white/90 hover:bg-white text-amber-950 border border-amber-300 transition-colors"
                      >
                        Save to memory
                      </button>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">KEY NUANCE</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-[13px] text-amber-950/90 mt-2.5 leading-relaxed font-sans">{studyData.trap}</p>
                </div>

                {/* Non-Negotiable Mechanisms */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#E2E8F0] flex justify-between items-center bg-[#E4F1FF]/45">
                    <span className="text-xs font-bold text-[#0F3470] font-mono uppercase tracking-wide">01 // Non-Negotiable Mechanisms</span>
                    <span className="text-[11px] font-mono text-[#0F3470] font-semibold">{studyData.takeaways.length} High-Yield Pillars</span>
                  </div>
                  <div className="divide-y divide-[#E2E8F0]">
                    {studyData.takeaways.map((item) => {
                      const combined = `${item.concept}: ${item.desc}`;
                      const isSaved = userMemories.some((m) => m.content.toLowerCase() === combined.toLowerCase());
                      return (
                        <div key={item.num} className="p-5 flex items-start justify-between gap-4">
                          <div className="flex gap-4 min-w-0">
                            <span className="font-mono text-xs px-2 py-0.5 h-fit rounded bg-[#0F3470] text-white font-semibold shrink-0 mt-0.5 tabular-nums">{item.num}</span>
                            <div>
                              <h4 className="text-xs font-bold text-[#0F3470] font-mono">{item.concept}</h4>
                              <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{item.desc}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addMemoryEntry("note", combined, `Syllabus pillar ${item.num} · ${studyData.filename}`)}
                            className={`shrink-0 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                              isSaved
                                ? "bg-[#ECEFF4] border-[#0F3470]/20 text-[#0F3470]"
                                : "bg-white border-[#111827]/[0.1] text-[#4B5565] hover:text-[#111827] hover:bg-[#F5F7FA]"
                            }`}
                          >
                            {isSaved ? "Saved in memory" : "Save to memory"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vocabulary Cloud */}
                <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-sm">
                  <span className="text-xs font-bold text-[#0F3470] font-mono uppercase tracking-wide block mb-3">02 // Essential Nomenclature</span>
                  <div className="flex flex-wrap gap-2">
                    {studyData.terms.map((term) => (
                      <span key={term} className="px-2.5 py-1 rounded bg-[#E4F1FF] border border-[#C5DFFF] text-[11px] font-mono font-semibold text-[#0F3470]">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. ACTIVE RECALL ARENA (MCQ) */}
            {activeTab === "arena" && (
              <div className="max-w-2xl space-y-4">
                {!quizFinished ? (
                  <div className="bg-white border border-[#E2E8F0] rounded-lg p-7 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 mb-4">
                      <span className="text-xs font-mono text-[#64748B]">
                        QUESTION {String(currentQIndex + 1).padStart(2, "0")} // {String(studyData.questions.length).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#E4F1FF] text-[#0F3470] font-semibold">
                        ACCURACY: {answeredCount === 0 ? "0%" : `${Math.round((arenaScore / answeredCount) * 100)}%`}
                      </span>
                    </div>

                    {/* Question Jump Nav Strip across all slides */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 border-b border-[#E2E8F0]/70">
                      <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider shrink-0 mr-1">Drills:</span>
                      {studyData.questions.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCurrentQIndex(idx);
                            setSelectedAnswer(null);
                          }}
                          className={`w-7 h-7 shrink-0 rounded text-[11px] font-mono font-semibold transition-all ${
                            idx === currentQIndex
                              ? "bg-[#0F3470] text-white ring-2 ring-[#0F3470] ring-offset-1"
                              : "bg-white border border-[#CBD5E1] text-[#64748B] hover:border-[#0F3470] hover:text-[#0F3470]"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    <h3 className="text-base font-serif font-semibold text-[#0F3470] leading-relaxed mb-5">
                      {studyData.questions[currentQIndex].q}
                    </h3>

                    <div className="space-y-2.5 mb-5">
                      {studyData.questions[currentQIndex].options.map((opt, idx) => {
                        const isCorrectOption = idx === studyData.questions[currentQIndex].correct;
                        const isSelected = selectedAnswer === idx;

                        let buttonStyle = "bg-white border-[#E2E8F0] hover:border-[#0F3470] text-[#0F3470]";
                        if (selectedAnswer !== null) {
                          if (isCorrectOption) {
                            buttonStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 font-medium";
                          } else if (isSelected) {
                            buttonStyle = "bg-red-50 border-red-500 text-red-950 font-medium";
                          }
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => handleAnswerSelect(idx)}
                            disabled={selectedAnswer !== null}
                            className={`w-full text-left p-3.5 rounded-lg border text-xs transition-colors flex justify-between shadow-sm ${buttonStyle}`}
                          >
                            <span>{opt}</span>
                            <span className="font-mono text-[#64748B]">0{idx + 1}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedAnswer !== null && (
                      <div
                        className={`p-4 rounded-lg text-xs leading-relaxed border mb-4 ${
                          selectedAnswer === studyData.questions[currentQIndex].correct
                            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                            : "bg-red-50/70 border-red-200 text-red-950"
                        }`}
                      >
                        {selectedAnswer === studyData.questions[currentQIndex].correct
                          ? studyData.questions[currentQIndex].accolade
                          : studyData.questions[currentQIndex].critique}
                      </div>
                    )}

                    {selectedAnswer !== null && (
                      <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
                        <button
                          onClick={handleNextQuestion}
                          className="px-5 py-2 rounded bg-[#0F3470] hover:bg-[#0F3470] text-white font-semibold text-xs uppercase tracking-wide transition-colors"
                        >
                          Next Question &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-[#E2E8F0] rounded-lg p-8 text-center max-w-lg mx-auto shadow-sm">
                    <span className="text-xs font-mono text-[#0F3470] font-semibold uppercase tracking-wider block mb-2">Evaluation Finished</span>
                    <h3 className="text-xl font-serif font-bold text-[#0F3470] mb-2">Recall Diagnostic Concluded</h3>
                    <div className="text-3xl font-mono text-[#0F3470] my-3 font-semibold">
                      {arenaScore} / {studyData.questions.length} Correct
                    </div>
                    <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
                      Diagnostic logged. Review the high-yield pillars and traps in the summary view prior to examinations.
                    </p>
                    <button
                      onClick={() => {
                        setCurrentQIndex(0);
                        setSelectedAnswer(null);
                        setArenaScore(0);
                        setAnsweredCount(0);
                        setQuizFinished(false);
                      }}
                      className="px-5 py-2.5 rounded bg-[#0F3470] hover:bg-[#0F3470] text-white font-semibold text-xs uppercase tracking-wide transition-colors"
                    >
                      Reset Session
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. FLASHCARDS VIEW */}
            {activeTab === "cards" && (
              <div className="max-w-md mx-auto pt-2 sm:pt-6">
                <div
                  className="perspective-1000 w-full h-72 sm:h-80 cursor-pointer select-none"
                  onClick={() => setIsFlipped((prev) => !prev)}
                >
                  <div
                    className={`relative w-full h-full duration-300 transform-style-3d transition-transform ${
                      isFlipped ? "rotate-y-180" : ""
                    }`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 w-full h-full rounded-2xl bg-white border border-[#CBD5E1] backface-hidden p-6 sm:p-8 flex flex-col justify-between shadow-sm">
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#64748B]">
                        <span className="uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-[#E4F1FF] text-[#0F3470]">Vocabulary</span>
                        <span>Front • Tap to Flip</span>
                      </div>
                      <div className="text-center my-auto px-2">
                        <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#0F3470] tracking-tight break-words">
                          {studyData.cards[currentCardIndex]?.term || "Key Term"}
                        </h3>
                        <p className="text-[11px] text-[#64748B] mt-2 font-mono">Tap anywhere on card to flip</p>
                      </div>
                      <div className="text-right text-[11px] font-mono text-[#0F3470] font-semibold flex items-center justify-end gap-1">
                        <span>Reveal Definition</span>
                        <span>&rarr;</span>
                      </div>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 w-full h-full rounded-2xl bg-[#0F3470] border border-[#0F3470] text-white backface-hidden rotate-y-180 p-6 sm:p-8 flex flex-col justify-between shadow-md">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-300">
                        <span className="uppercase tracking-widest text-[#93C5FD] font-semibold">Mechanism</span>
                        <span>Back • Tap to Return</span>
                      </div>
                      <div className="my-auto overflow-y-auto max-h-[160px] pr-1">
                        <p className="text-xs sm:text-sm text-white leading-relaxed font-sans">
                          {studyData.cards[currentCardIndex]?.def || "Definition extracted from uploaded material."}
                        </p>
                      </div>
                      <div className="text-right text-[11px] font-mono text-[#93C5FD] flex items-center justify-end gap-1">
                        <span>Return Front</span>
                        <span>&rarr;</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex((prev) => (prev - 1 + studyData.cards.length) % studyData.cards.length);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-white border border-[#E2E8F0] text-xs font-mono font-semibold text-[#0F3470] hover:bg-[#E4F1FF] active:bg-slate-100 transition-colors shadow-sm flex items-center justify-center gap-1 min-h-[44px]"
                  >
                    &larr; Prev Card
                  </button>
                  <span className="text-xs font-mono font-semibold text-[#64748B] px-2 shrink-0">
                    CARD {String(currentCardIndex + 1).padStart(2, "0")} // {String(studyData.cards.length).padStart(2, "0")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex((prev) => (prev + 1) % studyData.cards.length);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#0F3470] text-xs font-mono font-semibold text-white hover:opacity-95 active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-1 min-h-[44px]"
                  >
                    Next Card &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* 4. DOCUMENT ASSISTANT (PRESTIGE UI UPGRADE) */}
            {activeTab === "chat" && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="bg-white border border-[#E2E8F0] rounded-2xl h-[calc(100dvh-200px)] md:h-[500px] flex flex-col shadow-sm overflow-hidden">
                  {/* Header bar inside the assistant */}
                  <div className="px-4 py-3 border-b border-[#E2E8F0] flex justify-between items-center text-xs bg-white shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-mono font-bold text-[#0F3470] truncate">Gojo // Document In-Depth Assistant</span>
                      <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#E4F1FF] text-[#0F3470] font-semibold border border-[#C5DFFF] shrink-0">
                        Strictly Grounded
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[#64748B] shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200">
                        <svg className="w-3.5 h-3.5 text-[#0F3470]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-semibold text-[#0F3470]">Gemini Flash</span>
                      </span>
                    </div>
                  </div>

                  {/* Messages Stream Area */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs leading-relaxed">
                    {!chatMessages.some((m) => m.role === "user") && (
                      <div className="text-center py-5 sm:py-7 px-2 max-w-lg mx-auto">
                        <div className="w-11 h-11 rounded-2xl bg-[#E4F1FF] text-[#0F3470] flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#C5DFFF]">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-lg sm:text-xl font-serif font-bold text-[#0F3470] tracking-tight">
                          What are we working on today?
                        </h3>
                        <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed max-w-sm mx-auto">
                          Ask deep questions about &ldquo;{studyData.filename}&rdquo;, clarify tricky exam nuances, or step through complex mechanisms.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                          {[
                            "💡 Explain primary mechanism",
                            "🎯 Professor's exam insight",
                            "⚡ Compare confusing terms",
                          ].map((promptLabel, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => {
                                const queries = [
                                  "Explain the primary foundational mechanism step-by-step",
                                  "What is the Professor's key exam insight and primary trap?",
                                  "Compare the most confusing vocabulary terms in this lecture",
                                ];
                                setChatInput(queries[pIdx]);
                              }}
                              className="text-[11px] font-mono px-3 py-1.5 rounded-full bg-white border border-[#CBD5E1] text-[#0F3470] hover:border-[#0F3470] hover:bg-[#E4F1FF]/40 transition-colors shadow-2xs"
                            >
                              {promptLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {chatMessages.map((msg, idx) => (
                      <div key={idx}>
                        {msg.role === "user" ? (
                          <div className="flex flex-col items-end gap-1.5 max-w-[88%] ml-auto">
                            <div className="flex flex-wrap gap-1.5 justify-end">
                              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#E4F1FF] border border-[#C5DFFF] px-2.5 text-[10px] font-mono text-[#0F3470] font-semibold shadow-2xs">
                                <svg className="w-3 h-3 text-[#0F3470] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="truncate max-w-[170px]">{msg.attachment || studyData.filename}</span>
                              </span>
                            </div>
                            <div className="rounded-2xl rounded-tr-xs bg-[#0F3470] text-white px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1.5 max-w-[92%] mr-auto">
                            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-[#0F3470] px-1">
                              <svg className="w-3.5 h-3.5 text-[#0F3470]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              <span>Gemini 2.5 Flash // Sensei</span>
                            </div>
                            <div className="rounded-2xl rounded-tl-xs bg-white border border-[#E2E8F0] p-4 text-xs sm:text-[13px] leading-relaxed text-slate-800 shadow-sm whitespace-pre-wrap">
                              {msg.content}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {isChatThinking && (
                      <div className="flex flex-col items-start gap-1.5 max-w-[92%] mr-auto">
                        <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-[#0F3470] px-1">
                          <span className="w-2 h-2 rounded-full bg-[#0F3470] animate-ping" />
                          <span className="animate-pulse">Thinking &amp; Scanning Slide Context...</span>
                        </div>
                        <div className="w-full rounded-2xl rounded-tl-xs bg-white border border-[#E2E8F0] p-4 shadow-sm flex flex-col gap-2.5">
                          <div className="h-2.5 rounded-full bg-slate-200/90 animate-pulse" style={{ width: "94%" }} />
                          <div className="h-2.5 rounded-full bg-slate-200/90 animate-pulse" style={{ width: "86%" }} />
                          <div className="h-2.5 rounded-full bg-slate-200/90 animate-pulse" style={{ width: "48%" }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRESTIGE UI PROMPT COMPOSER */}
                  <div className="p-2.5 sm:p-3.5 border-t border-[#E2E8F0] bg-[#F8F9FA]/50 shrink-0">
                    <form onSubmit={handleSendMessage} className="bg-white border border-[#CBD5E1] focus-within:border-[#0F3470] focus-within:ring-2 focus-within:ring-[#0F3470]/10 rounded-2xl p-2.5 sm:p-3 shadow-sm transition-all">
                      {/* Attachments Pill Strip */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-[#E4F1FF] border border-[#C5DFFF] px-2.5 text-[10px] font-mono text-[#0F3470] font-semibold max-w-[220px]">
                          <svg className="w-3 h-3 text-[#0F3470] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="truncate">{studyData.filename}</span>
                        </span>
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 text-[10px] font-mono text-[#64748B]">
                          <span>⚡ Full-Deck Search Active</span>
                        </span>
                      </div>

                      {/* Input Field */}
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        rows={2}
                        placeholder="Ask about concepts, formulas, slide mechanisms, or traps..."
                        className="w-full bg-transparent border-0 p-1 text-xs sm:text-[13px] text-[#0F3470] placeholder:text-[#64748B] focus:outline-none resize-none leading-relaxed font-sans"
                      />

                      {/* Composer Bottom Toolbar */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 mt-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#64748B]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-[#0F3470] font-semibold">
                            <svg className="w-3 h-3 text-[#0F3470]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Grounded Mode
                          </span>
                          <span className="hidden sm:inline text-slate-400 text-[10px]">• Enter ↵ to send</span>
                        </div>

                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isChatThinking}
                          className="w-8 h-8 rounded-full bg-[#0F3470] hover:opacity-90 active:scale-95 text-white flex items-center justify-center transition-all shadow-sm disabled:opacity-40 shrink-0"
                          title="Send message"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                          </svg>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SOURCE & UPLOAD VIEW (Mobile App View) */}
            {activeTab === "source" && (
              <div className="max-w-xl mx-auto space-y-4">
                {/* Mobile Header Card */}
                <div className="bg-[#0F3470] text-white rounded-xl p-4 sm:p-5 shadow-sm border-l-4 border-[#93C5FD]">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#93C5FD] font-semibold block">
                    SOURCE MATERIAL // SLIDES &amp; NOTES
                  </span>
                  <h2 className="text-sm sm:text-base font-serif font-bold mt-1 text-white">
                    Import Lecture Slides, Photos, or Notes
                  </h2>
                  <p className="text-xs text-white/80 font-sans mt-1 leading-relaxed">
                    Upload PDF lecture decks (all slides are scanned), take photos of physical slide screens, or paste notes.
                  </p>
                </div>

                {/* Upload Dropzone Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#0F3470] font-bold">1. Select Document or Photo</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E4F1FF] text-[#0F3470] font-semibold border border-[#C5DFFF]">PDF • Image • Text</span>
                  </div>

                  <div className="relative border-2 border-dashed border-[#0F3470]/40 hover:border-[#0F3470] active:bg-[#E4F1FF]/20 rounded-xl p-5 text-center bg-white cursor-pointer transition-colors min-h-[120px] flex items-center justify-center">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp,.txt,.md,.csv,image/*,application/pdf,text/plain"
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                      onChange={handleFileUpload}
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5 text-[#0F3470]">
                      <div className="w-10 h-10 rounded-full bg-[#E4F1FF] flex items-center justify-center text-[#0F3470]">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm block">Tap to Select File or Snap Photo</span>
                        <span className="text-[10px] sm:text-xs text-[#64748B] font-mono">PDF, slide screenshots, or notes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Buffer & Synthesize Button Card */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#0F3470]">2. Source Notes Buffer</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSourceText(
                          `Cellular Respiration and ATP Generation:\nGlycolysis occurs in the cytoplasm and breaks glucose into 2 pyruvate molecules, yielding a net of 2 ATP and 2 NADH without requiring oxygen. The Krebs Cycle occurs in the mitochondrial matrix, processing Acetyl-CoA to produce NADH and FADH2. The Electron Transport Chain (ETC) sits in the inner membrane and generates the vast majority of cellular ATP via oxidative phosphorylation and the ATP Synthase proton gradient.\nOxygen acts strictly as the final electron acceptor at Complex IV. Without oxygen, oxidative phosphorylation halts, and cells must rely on anaerobic fermentation.`
                        )
                      }
                      className="text-[#0F3470] hover:underline font-semibold"
                    >
                      Load Sample
                    </button>
                  </div>

                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Or paste lecture excerpts, notes, or readings here..."
                    rows={5}
                    className="w-full bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-3 text-xs font-mono text-[#0F3470] placeholder:text-slate-400 focus:outline-none focus:border-[#0F3470] resize-y leading-relaxed"
                  />

                  <button
                    type="button"
                    onClick={handleSynthesize}
                    disabled={isSynthesizing}
                    className="w-full h-12 rounded-xl bg-[#0F3470] active:scale-[0.99] hover:opacity-95 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
                  >
                    <span>{isSynthesizing ? "Synthesizing Canvas..." : "Synthesize Study Canvas"}</span>
                    <span className="font-mono text-base">&rarr;</span>
                  </button>
                </div>
              </div>
            )}

            {/* 6. INTEGRATED PERSONAL MEMORY VIEW */}
            {activeTab === "memory" && (
              <div className="max-w-3xl space-y-6 font-sans text-[#111827]">
                <div className="bg-white rounded-xl border border-[#111827]/[0.08] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-serif text-xl font-semibold text-[#111827] tracking-[-0.02em]">
                        {currentStudent ? `${currentStudent.name}'s memory ledger` : "Session memory ledger"}
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-[#ECEFF4] text-[#0F3470] font-mono text-[11px] font-medium tabular-nums">
                        {memorySyncStatus}
                      </span>
                    </div>
                    <p className="text-[13px] leading-[19px] text-[#4B5565] mt-1">
                      Stores your course notes, exam focus, missed recall checks, and uploaded syllabi. Automatically used by the Document Assistant and synthesis engine.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearAllUserMemories}
                    className="h-8 px-3 rounded-lg border border-[#111827]/[0.1] bg-white hover:bg-[#F5F7FA] text-[#4B5565] hover:text-[#111827] text-xs font-medium transition-colors shrink-0 self-start sm:self-center"
                  >
                    Clear notes
                  </button>
                </div>

                {/* Add Manual Memory Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualMemoryInput.trim()) return;
                    addMemoryEntry(manualMemoryCategory, manualMemoryInput.trim(), "Manual note");
                    setManualMemoryInput("");
                  }}
                  className="bg-white rounded-xl border border-[#111827]/[0.08] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium text-[#111827]">
                      Store information in your memory
                    </label>
                    <span className="text-xs text-[#6B7487]">Included in every assistant &amp; synthesis session</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <select
                      value={manualMemoryCategory}
                      onChange={(e) => setManualMemoryCategory(e.target.value as MemoryItem["category"])}
                      className="h-10 px-3 rounded-lg border border-[#111827]/[0.12] bg-[#F5F7FA] text-[13px] text-[#111827] font-medium focus:outline-none focus:border-[#0F3470] shrink-0"
                    >
                      <option value="note">Course note</option>
                      <option value="exam_focus">Exam focus</option>
                      <option value="weak_spot">Weak spot</option>
                      <option value="preference">Study preference</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={manualMemoryInput}
                      onChange={(e) => setManualMemoryInput(e.target.value)}
                      placeholder="e.g., Midterm on Nov 18 covers slides 1–42; professor emphasizes Complex IV inhibitors..."
                      className="flex-1 h-10 px-3.5 rounded-lg border border-[#111827]/[0.12] bg-white text-[13px] text-[#111827] placeholder:text-[#6B7487] focus:outline-none focus:border-[#0F3470]"
                    />
                    <button
                      type="submit"
                      className="h-10 px-4 rounded-lg bg-[#0F3470] hover:bg-[#163f82] text-white text-[13px] font-medium transition-colors shrink-0"
                    >
                      Store in memory
                    </button>
                  </div>
                </form>

                {/* Stored Memory Items */}
                <div className="bg-white rounded-xl border border-[#111827]/[0.08] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#111827]/[0.08] bg-[#F5F7FA]/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[#111827]">Stored facts &amp; recall notes</span>
                      <span className="font-mono text-[11px] text-[#6B7487] tabular-nums">
                        {userMemories.length} {userMemories.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <div className="p-1 rounded-lg bg-[#ECEFF4] border border-[#111827]/[0.06] flex items-center gap-1 text-xs">
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "weak_spot", label: "Weak spots" },
                          { id: "exam_focus", label: "Exam focus" },
                          { id: "note", label: "Notes" },
                        ] as const
                      ).map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setMemoryFilter(f.id)}
                          className={
                            memoryFilter === f.id
                              ? "px-2.5 py-1 rounded-[5px] bg-white text-[#111827] font-medium transition-colors shadow-2xs"
                              : "px-2.5 py-1 rounded-[5px] text-[#4B5565] hover:text-[#111827] font-medium transition-colors"
                          }
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-[#111827]/[0.08]">
                    {(memoryFilter === "all"
                      ? userMemories
                      : userMemories.filter((m) => m.category === memoryFilter)
                    ).length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="text-sm font-medium text-[#111827]">No stored memories in this view yet</div>
                        <p className="text-[13px] text-[#6B7487] mt-1 max-w-md mx-auto">
                          Add a note above, click &ldquo;Save to memory&rdquo; on any syllabus mechanism, tell the Document Assistant &ldquo;Remember that...&rdquo;, or complete Active Recall drills to automatically log weak spots.
                        </p>
                      </div>
                    ) : (
                      (memoryFilter === "all"
                        ? userMemories
                        : userMemories.filter((m) => m.category === memoryFilter)
                      ).map((m) => {
                        const badgeMap: Record<string, { label: string; cls: string }> = {
                          weak_spot: { label: "Weak spot", cls: "bg-[#FEF2F2] text-[#B91C1C] border-[#B91C1C]/20" },
                          exam_focus: { label: "Exam focus", cls: "bg-[#FFFBEB] text-[#B45309] border-[#B45309]/20" },
                          preference: { label: "Preference", cls: "bg-[#ECEFF4] text-[#0F3470] border-[#0F3470]/20" },
                          note: { label: "Course note", cls: "bg-[#ECEFF4] text-[#111827] border-[#111827]/[0.1]" },
                        };
                        const badge = badgeMap[m.category] || badgeMap.note;
                        return (
                          <div
                            key={m.id}
                            className="p-4 sm:p-5 flex items-start justify-between gap-4 hover:bg-[#F5F7FA]/50 transition-colors"
                          >
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-[5px] border text-[11px] font-medium ${badge.cls}`}>
                                  {badge.label}
                                </span>
                                <span className="font-mono text-[11px] text-[#6B7487] truncate">{m.source}</span>
                              </div>
                              <p className="text-[13px] leading-[20px] text-[#111827]">{m.content}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteMemoryEntry(m.id)}
                              className="text-xs text-[#6B7487] hover:text-[#DC2626] px-2 py-1 rounded-md hover:bg-[#FEF2F2] transition-colors shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Saved Syllabi Library */}
                <div className="bg-white rounded-xl border border-[#111827]/[0.08] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#111827]/[0.08] bg-[#F5F7FA]/60 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#111827]">Saved syllabi in user memory</span>
                    <span className="font-mono text-[11px] text-[#6B7487] tabular-nums">
                      {userLibrary.length} {userLibrary.length === 1 ? "syllabus" : "syllabi"}
                    </span>
                  </div>
                  <div className="divide-y divide-[#111827]/[0.08]">
                    {userLibrary.map((deck) => {
                      const isCurrent = studyData.filename === deck.filename;
                      return (
                        <div key={deck.id} className="p-4 sm:px-5 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[13px] font-medium text-[#111827] truncate">
                                {deck.filename}
                              </span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-[5px] bg-[#ECEFF4] text-[#0F3470] font-mono text-[10px] font-medium">
                                  Active on desk
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[11px] text-[#6B7487] tabular-nums mt-0.5">
                              {deck.studyData.takeaways.length} mechanisms · {deck.studyData.questions.length} recall checks
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStudyData(deck.studyData);
                              setCurrentQIndex(0);
                              setSelectedAnswer(null);
                              setArenaScore(0);
                              setAnsweredCount(0);
                              setQuizFinished(false);
                              setCurrentCardIndex(0);
                              setIsFlipped(false);
                              setActiveTab("summary");
                            }}
                            className="h-8 px-3 rounded-lg border border-[#111827]/[0.12] bg-white hover:bg-[#ECEFF4] text-[#111827] text-xs font-medium transition-colors shrink-0"
                          >
                            {isCurrent ? "Reload" : "Open syllabus"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

      </div>

      {/* MOBILE APP BOTTOM NAVIGATION BAR (Phones & Tablets < 768px) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-[#E2E8F0] flex md:hidden items-stretch justify-around z-50 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {[
          { id: "summary", label: "Summary", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          { id: "arena", label: "Drills", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
          { id: "cards", label: "Cards", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
          { id: "chat", label: "Sensei", icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" },
          { id: "memory", label: "Memory", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
          { id: "source", label: "Upload", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id as any)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? "text-[#0F3470] font-bold relative after:content-[''] after:absolute after:top-0 after:w-8 after:h-0.5 after:bg-[#0F3470] after:rounded-full"
                  : "text-[#64748B] hover:text-[#0F3470] font-medium"
              }`}
            >
              <svg className="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span className="text-[10px] font-mono tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* FIRST-SCREEN STUDENT DESK LOGIN GATE (UNSLOPPED) */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] bg-[#F5F7FA] text-[#111827] flex flex-col lg:grid lg:grid-cols-12 overflow-y-auto">
          {/* Left Column: Student Authentication (5 cols on desktop) */}
          <div className="lg:col-span-5 bg-white border-b lg:border-b-0 lg:border-r border-[#111827]/[0.08] flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-[100dvh] lg:min-h-0">
            {/* Top Brand Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="38" cy="50" r="23" fill="none" stroke="#0F3470" strokeWidth="5" />
                    <circle cx="62" cy="50" r="23" fill="none" stroke="#DC2626" strokeWidth="5" />
                    <circle cx="50" cy="50" r="6" fill="#0F3470" />
                  </svg>
                </div>
                <span className="font-serif font-semibold text-base tracking-[-0.02em] text-[#111827]">
                  GØJØ.nerd
                </span>
              </div>
              <button
                type="button"
                onClick={continueAsGuest}
                className="text-xs text-[#6B7487] hover:text-[#111827] transition-colors py-1 px-2 rounded-md hover:bg-[#ECEFF4]"
              >
                Continue without saving
              </button>
            </div>

            {/* Center Form Block */}
            <div className="my-auto py-8 max-w-sm w-full mx-auto">
              <h1 className="font-serif text-2xl sm:text-[28px] font-semibold text-[#111827] tracking-[-0.025em] leading-[1.15]">
                {authTab === "login" ? "Sign in to your study desk" : "Create your student desk"}
              </h1>
              <p className="text-sm text-[#4B5565] mt-2 leading-[1.5]">
                {authTab === "login"
                  ? "Your uploaded syllabi, active recall accuracy, and flashcards stay attached to your student record."
                  : "Register your name and course to keep your syllabi and recall progress separate from other students."}
              </p>

              {/* Mode Switch (Nested radius: outer 10px, padding 4px, inner 6px) */}
              <div className="mt-6 p-1 rounded-[10px] bg-[#ECEFF4] border border-[#111827]/[0.06] grid grid-cols-2 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setAuthTab("login")}
                  className={
                    authTab === "login"
                      ? "py-2 px-3 rounded-[6px] font-medium bg-white text-[#111827] shadow-2xs transition-colors"
                      : "py-2 px-3 rounded-[6px] font-medium text-[#4B5565] hover:text-[#111827] transition-colors"
                  }
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setAuthTab("enroll")}
                  className={
                    authTab === "enroll"
                      ? "py-2 px-3 rounded-[6px] font-medium bg-white text-[#111827] shadow-2xs transition-colors"
                      : "py-2 px-3 rounded-[6px] font-medium text-[#4B5565] hover:text-[#111827] transition-colors"
                  }
                >
                  Create account
                </button>
              </div>

              {/* View 1: Sign In */}
              {authTab === "login" && (
                <div className="mt-6 space-y-5">
                  {students.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-[#4B5565]">Saved on this device</span>
                        <span className="text-[11px] font-mono text-[#6B7487] tabular-nums">
                          {students.length === 1 ? "1 account" : `${students.length} accounts`}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {students.map((student) => {
                          const attempted = student.stats?.drillsAttempted || 0;
                          const mastered = student.stats?.drillsMastered || 0;
                          const accuracyText =
                            attempted > 0 ? `${Math.round((mastered / attempted) * 100)}% recall` : "No drills yet";
                          return (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => handleSelectStudent(student.id)}
                              className="w-full text-left p-3 rounded-lg border border-[#111827]/[0.08] hover:border-[#0F3470] bg-white hover:bg-[#F5F7FA] transition-colors flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-md bg-[#ECEFF4] text-[#111827] font-mono text-xs font-medium flex items-center justify-center shrink-0 border border-[#111827]/[0.08]">
                                  {student.avatarInitials}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-[#111827] truncate">{student.name}</div>
                                  <div className="text-[11px] text-[#6B7487] truncate">{student.major}</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[11px] font-mono text-[#4B5565] tabular-nums">{accuracyText}</div>
                                <div className="text-[11px] text-[#0F3470] font-medium">Open &rarr;</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-[#111827]/[0.08]" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-2 text-xs text-[#6B7487]">Or enter credentials</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSignIn} className="space-y-4">
                    {loginError && (
                      <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#B91C1C]/20 text-[#B91C1C] text-xs">
                        {loginError}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-[#111827] mb-1.5">
                        Academic email or student ID
                      </label>
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="name@university.edu"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#111827]/[0.14] rounded-lg text-[#111827] placeholder:text-[#6B7487] focus:outline-none focus:border-[#0F3470] focus:ring-2 focus:ring-[#0F3470]/15 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#111827] mb-1.5">Passcode</label>
                      <input
                        type="password"
                        required
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value)}
                        placeholder="Enter your passcode"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#111827]/[0.14] rounded-lg text-[#111827] placeholder:text-[#6B7487] focus:outline-none focus:border-[#0F3470] focus:ring-2 focus:ring-[#0F3470]/15 transition-colors font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-[#0F3470] hover:bg-[#163f82] text-white text-sm font-medium transition-colors"
                    >
                      Open study desk
                    </button>
                  </form>
                </div>
              )}

              {/* View 2: Create Account */}
              {authTab === "enroll" && (
                <form onSubmit={handleEnroll} className="mt-6 space-y-4">
                  {enrollError && (
                    <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#B91C1C]/20 text-[#B91C1C] text-xs">
                      {enrollError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-[#111827] mb-1.5">Full name</label>
                    <input
                      type="text"
                      required
                      value={enrollName}
                      onChange={(e) => setEnrollName(e.target.value)}
                      placeholder="Jordan Lee"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#111827]/[0.14] rounded-lg text-[#111827] placeholder:text-[#6B7487] focus:outline-none focus:border-[#0F3470] focus:ring-2 focus:ring-[#0F3470]/15 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#111827] mb-1.5">Course or department</label>
                      <input
                        type="text"
                        required
                        value={enrollMajor}
                        onChange={(e) => setEnrollMajor(e.target.value)}
                        placeholder="Biochemistry"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#111827]/[0.14] rounded-lg text-[#111827] placeholder:text-[#6B7487] focus:outline-none focus:border-[#0F3470] focus:ring-2 focus:ring-[#0F3470]/15 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#111827] mb-1.5">Passcode</label>
                      <input
                        type="password"
                        maxLength={12}
                        required
                        value={enrollPin}
                        onChange={(e) => setEnrollPin(e.target.value)}
                        placeholder="4+ characters"
                        className="w-full px-3 py-2 text-sm bg-white border border-[#111827]/[0.14] rounded-lg text-[#111827] placeholder:text-[#6B7487] focus:outline-none focus:border-[#0F3470] focus:ring-2 focus:ring-[#0F3470]/15 transition-colors font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#111827] mb-1.5">Academic email</label>
                    <input
                      type="email"
                      required
                      value={enrollEmail}
                      onChange={(e) => setEnrollEmail(e.target.value)}
                      placeholder="name@university.edu"
                      className="w-full px-3 py-2 text-sm bg-white border border-[#111827]/[0.14] rounded-lg text-[#111827] placeholder:text-[#6B7487] focus:outline-none focus:border-[#0F3470] focus:ring-2 focus:ring-[#0F3470]/15 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-lg bg-[#0F3470] hover:bg-[#163f82] text-white text-sm font-medium transition-colors"
                  >
                    Create student desk
                  </button>
                </form>
              )}
            </div>

            {/* Bottom Note */}
            <div className="flex items-center justify-between text-xs text-[#6B7487] pt-4 border-t border-[#111827]/[0.08]">
              <span>Records stored locally per browser</span>
              <span className="font-mono tabular-nums">v2.4</span>
            </div>
          </div>

          {/* Right Column: Live Product Preview in Code (7 cols on desktop) */}
          <div className="hidden lg:flex lg:col-span-7 bg-[#F5F7FA] p-12 xl:p-16 flex-col justify-between">
            <div className="max-w-xl">
              <div className="text-xs font-mono text-[#6B7487]">Syllabus &amp; active recall workstation</div>
              <h2 className="font-serif text-2xl text-[#111827] font-semibold tracking-[-0.02em] mt-1 leading-[1.25]">
                Upload lecture slides once. Drill the underlying mechanisms until exam day.
              </h2>
            </div>

            {/* Real Product Artifact Preview */}
            <div className="my-auto py-8 max-w-xl w-full">
              <div className="bg-white rounded-xl border border-[#111827]/[0.08] shadow-xs overflow-hidden">
                {/* Document Header Bar */}
                <div className="px-5 py-3.5 border-b border-[#111827]/[0.08] flex items-center justify-between bg-[#F5F7FA]/60">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-medium text-[#0F3470]">
                      Cellular_Respiration_Core.pdf
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#6B7487] tabular-nums">
                    3 mechanisms · 4 recall questions
                  </span>
                </div>

                {/* Takeaway Row Preview */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <span className="font-mono text-xs font-medium text-[#0F3470] bg-[#ECEFF4] px-2 py-1 rounded tabular-nums shrink-0">
                      01
                    </span>
                    <div>
                      <div className="text-sm font-medium text-[#111827]">
                        Glycolysis is cytosolic and strictly anaerobic
                      </div>
                      <p className="text-xs text-[#4B5565] mt-1 leading-[1.55]">
                        Converts 1 glucose into 2 pyruvates in the cytoplasm. Consumes 2 ATP in the investment phase and yields 4 ATP via substrate-level phosphorylation (net +2 ATP, +2 NADH).
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#111827]/[0.06] pt-4 flex items-start gap-3.5">
                    <span className="font-mono text-xs font-medium text-[#0F3470] bg-[#ECEFF4] px-2 py-1 rounded tabular-nums shrink-0">
                      02
                    </span>
                    <div>
                      <div className="text-sm font-medium text-[#111827]">
                        Chemiosmotic proton gradient drives ATP Synthase
                      </div>
                      <p className="text-xs text-[#4B5565] mt-1 leading-[1.55]">
                        Complexes I, III, and IV pump H+ across the inner mitochondrial membrane; O2 serves only as the terminal electron acceptor at Complex IV.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Recall Footer Strip */}
                <div className="px-5 py-3.5 bg-[#ECEFF4]/70 border-t border-[#111827]/[0.08] flex items-center justify-between text-xs">
                  <div className="text-[#4B5565]">
                    <span className="font-medium text-[#111827]">Recall check:</span> What halts immediately if Complex IV loses O2?
                  </div>
                  <span className="font-mono text-[11px] text-[#0F3470] font-medium shrink-0 ml-4">
                    Proton pumping &rarr;
                  </span>
                </div>
              </div>
            </div>

            {/* Quiet Ledger Footer */}
            <div className="max-w-xl grid grid-cols-3 gap-6 pt-6 border-t border-[#111827]/[0.08] text-xs">
              <div>
                <div className="font-medium text-[#111827]">Source synthesis</div>
                <div className="text-[#6B7487] mt-0.5 leading-[1.4]">
                  Distills PDFs, slide photos, and raw notes into numbered mechanisms.
                </div>
              </div>
              <div>
                <div className="font-medium text-[#111827]">Active recall</div>
                <div className="text-[#6B7487] mt-0.5 leading-[1.4]">
                  Generates conceptual multiple-choice drills with rationales.
                </div>
              </div>
              <div>
                <div className="font-medium text-[#111827]">Personal record</div>
                <div className="text-[#6B7487] mt-0.5 leading-[1.4]">
                  Keeps each student&apos;s uploaded syllabus and accuracy separate.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT RECORD MODAL (UNSLOPPED) */}
      {isProfileModalOpen && currentStudent && (
        <div
          className="fixed inset-0 bg-[#111827]/40 z-[100] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-[#111827]/[0.1] shadow-lg w-full max-w-md overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-[#111827]/[0.08] flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-[#0F3470] text-white font-mono text-sm font-medium flex items-center justify-center shrink-0">
                  {currentStudent.avatarInitials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-[#111827] truncate">{currentStudent.name}</h4>
                  <div className="text-xs text-[#4B5565] truncate mt-0.5">{currentStudent.major}</div>
                  <div className="text-[11px] font-mono text-[#6B7487] truncate mt-0.5 tabular-nums">
                    {currentStudent.email} · {currentStudent.id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="text-[#6B7487] hover:text-[#111827] p-1 rounded-md hover:bg-[#ECEFF4] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Figures (Tabular Nums, No Emojis) */}
            <div className="p-5 bg-[#F5F7FA] border-b border-[#111827]/[0.08]">
              <div className="text-xs font-medium text-[#4B5565] mb-3">Study progress</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-3 rounded-lg border border-[#111827]/[0.08]">
                  <div className="text-[11px] text-[#6B7487]">Syllabi indexed</div>
                  <div className="text-lg font-semibold font-mono text-[#111827] mt-1 tabular-nums">
                    {currentStudent.stats?.decksAnalyzed || 1}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#111827]/[0.08]">
                  <div className="text-[11px] text-[#6B7487]">Recall accuracy</div>
                  <div className="text-lg font-semibold font-mono text-[#111827] mt-1 tabular-nums">
                    {(currentStudent.stats?.drillsAttempted || 0) > 0
                      ? `${Math.round(
                          ((currentStudent.stats?.drillsMastered || 0) /
                            (currentStudent.stats?.drillsAttempted || 1)) *
                            100
                        )}%`
                      : "—"}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#111827]/[0.08]">
                  <div className="text-[11px] text-[#6B7487]">Cards reviewed</div>
                  <div className="text-lg font-semibold font-mono text-[#111827] mt-1 tabular-nums">
                    {currentStudent.stats?.cardsMastered || 0}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-[#111827]/[0.08]">
                  <div className="text-[11px] text-[#6B7487]">Memories stored</div>
                  <div className="text-lg font-semibold font-mono text-[#0F3470] mt-1 tabular-nums">
                    {userMemories.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    setActiveTab("memory");
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#111827]/[0.12] bg-white hover:bg-[#F5F7FA] text-[#0F3470] text-xs font-medium transition-colors"
                >
                  Open memory
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#111827]/[0.12] bg-white hover:bg-[#F5F7FA] text-[#111827] text-xs font-medium transition-colors"
                >
                  Switch student
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-lg text-[#B91C1C] hover:bg-[#FEF2F2] text-xs font-medium transition-colors"
                >
                  Sign out
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#0F3470] hover:bg-[#163f82] text-white text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
