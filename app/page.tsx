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

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  pin: string;
  major: string;
  institution: string;
  avatarColor: string;
  avatarInitials: string;
  stats: {
    streak: number;
    drillsAttempted: number;
    drillsMastered: number;
    cardsMastered: number;
    decksAnalyzed: number;
  };
}

export const DEFAULT_STUDENTS: StudentProfile[] = [
  {
    id: "GOJO-2027-4819",
    name: "Alex Chen",
    email: "alex.chen@harvard.edu",
    pin: "1234",
    major: "Bioengineering '27",
    institution: "Harvard University",
    avatarColor: "#0F3470",
    avatarInitials: "AC",
    stats: {
      streak: 5,
      drillsAttempted: 25,
      drillsMastered: 22,
      cardsMastered: 24,
      decksAnalyzed: 3,
    },
  },
  {
    id: "GOJO-2026-1104",
    name: "Maya Lin",
    email: "maya.lin@stanford.edu",
    pin: "1234",
    major: "Cognitive Neuroscience '26",
    institution: "Stanford University",
    avatarColor: "#7C3AED",
    avatarInitials: "ML",
    stats: {
      streak: 12,
      drillsAttempted: 40,
      drillsMastered: 38,
      cardsMastered: 42,
      decksAnalyzed: 6,
    },
  },
  {
    id: "GOJO-2028-3921",
    name: "Marcus Vance",
    email: "marcus.vance@mit.edu",
    pin: "1234",
    major: "AI & Quantitative Biology '28",
    institution: "MIT",
    avatarColor: "#0D9488",
    avatarInitials: "MV",
    stats: {
      streak: 3,
      drillsAttempted: 18,
      drillsMastered: 15,
      cardsMastered: 18,
      decksAnalyzed: 2,
    },
  },
];

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
  const [activeTab, setActiveTab] = useState<"summary" | "arena" | "cards" | "chat" | "source">("summary");
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
  const [students, setStudents] = useState<StudentProfile[]>(DEFAULT_STUDENTS);
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [authTab, setAuthTab] = useState<"quick" | "login" | "enroll">("quick");

  // Sign In inputs
  const [loginIdentifier, setLoginIdentifier] = useState<string>("");
  const [loginPin, setLoginPin] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  // Enrollment inputs
  const [enrollName, setEnrollName] = useState<string>("");
  const [enrollMajor, setEnrollMajor] = useState<string>("");
  const [enrollInstitution, setEnrollInstitution] = useState<string>("");
  const [enrollEmail, setEnrollEmail] = useState<string>("");
  const [enrollPin, setEnrollPin] = useState<string>("");
  const [enrollError, setEnrollError] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("gojo_students_v1");
      let list = DEFAULT_STUDENTS;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      } else {
        localStorage.setItem("gojo_students_v1", JSON.stringify(DEFAULT_STUDENTS));
      }
      setStudents(list);

      const savedId = localStorage.getItem("gojo_current_student_id_v1");
      const isGuest = sessionStorage.getItem("gojo_guest_session") === "true";
      if (savedId) {
        const found = list.find((s) => s.id === savedId);
        if (found) setCurrentStudent(found);
      } else if (!isGuest && list.length > 0) {
        setCurrentStudent(list[0]);
        localStorage.setItem("gojo_current_student_id_v1", list[0].id);
      }
    } catch (e) {
      console.warn("Failed to load student session", e);
    }
  }, []);

  const saveStudent = (updated: StudentProfile) => {
    setCurrentStudent(updated);
    setStudents((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      try {
        localStorage.setItem("gojo_students_v1", JSON.stringify(next));
        localStorage.setItem("gojo_current_student_id_v1", updated.id);
      } catch (e) {}
      return next;
    });
  };

  const handleSelectStudent = (studentId: string) => {
    const found = students.find((s) => s.id === studentId);
    if (found) {
      setCurrentStudent(found);
      try {
        localStorage.setItem("gojo_current_student_id_v1", found.id);
        sessionStorage.removeItem("gojo_guest_session");
      } catch (e) {}
      setIsLoginModalOpen(false);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = loginIdentifier.trim().toLowerCase();
    const pinClean = loginPin.trim();
    const matched = students.find(
      (s) =>
        (s.id.toLowerCase() === idClean || s.email.toLowerCase() === idClean) &&
        (!s.pin || s.pin === pinClean || pinClean === "1234")
    );
    if (matched) {
      setLoginError("");
      setCurrentStudent(matched);
      try {
        localStorage.setItem("gojo_current_student_id_v1", matched.id);
        sessionStorage.removeItem("gojo_guest_session");
      } catch (err) {}
      setIsLoginModalOpen(false);
    } else {
      setLoginError("Invalid Student ID / Email or PIN. (Demo PIN: 1234 or use 1-Click Profiles)");
    }
  };

  const handleEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollName || !enrollMajor || !enrollInstitution || !enrollEmail) return;
    const initials = enrollName
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    const colors = ["#0F3470", "#1E40AF", "#0369A1", "#0D9488", "#7C3AED", "#B91C1C"];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const studentId = `GOJO-2027-${Math.floor(1000 + Math.random() * 9000)}`;

    const newStudent: StudentProfile = {
      id: studentId,
      name: enrollName.trim(),
      email: enrollEmail.trim(),
      pin: enrollPin.trim() || "1234",
      major: enrollMajor.trim(),
      institution: enrollInstitution.trim(),
      avatarColor,
      avatarInitials: initials,
      stats: {
        streak: 1,
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
      localStorage.setItem("gojo_students_v1", JSON.stringify(nextList));
      localStorage.setItem("gojo_current_student_id_v1", newStudent.id);
      sessionStorage.removeItem("gojo_guest_session");
    } catch (e) {}
    setIsLoginModalOpen(false);
  };

  const handleSignOut = () => {
    setCurrentStudent(null);
    try {
      localStorage.removeItem("gojo_current_student_id_v1");
      sessionStorage.setItem("gojo_guest_session", "true");
    } catch (e) {}
    setIsProfileModalOpen(false);
    setIsLoginModalOpen(true);
  };

  const continueAsGuest = () => {
    try {
      sessionStorage.setItem("gojo_guest_session", "true");
      localStorage.removeItem("gojo_current_student_id_v1");
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
        setStudyData({
          filename: activeFilename,
          takeaways: Array.isArray(apiData.takeaways) && apiData.takeaways.length ? apiData.takeaways : fallback.takeaways,
          terms: Array.isArray(apiData.terms) && apiData.terms.length ? apiData.terms : fallback.terms,
          trap: apiData.trap || fallback.trap,
          questions: Array.isArray(apiData.questions) && apiData.questions.length ? apiData.questions : fallback.questions,
          cards: Array.isArray(apiData.cards) && apiData.cards.length ? apiData.cards : fallback.cards,
        });
      } else {
        const localData = synthesizeFromTextLocally(cleanText || `Visual Study Material: ${activeFilename}. Analyze key diagrams, labels, and core mechanisms.`, activeFilename);
        setStudyData(localData);
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
    const isCorrect = index === studyData.questions[currentQIndex].correct;
    if (isCorrect) {
      setArenaScore((prev) => prev + 1);
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
          history: updatedHistory.slice(0, -1).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.reply) {
        replyText = data.reply;
      }
    } catch {
      // Fallback to local grounded document search
    }

    if (!replyText) {
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
              className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full border border-[#0F3470]/30 bg-white hover:bg-[#E4F1FF]/70 text-[#0F3470] transition-all shadow-2xs"
              title="Open Student ID & Academic Record"
            >
              <div
                className="w-6 h-6 rounded-full text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs"
                style={{ backgroundColor: currentStudent.avatarColor || "#0F3470" }}
              >
                {currentStudent.avatarInitials}
              </div>
              <div className="text-left hidden sm:block leading-tight min-w-0">
                <div className="font-bold text-[11px] truncate max-w-[90px] md:max-w-[120px] text-[#0F3470]">
                  {currentStudent.name}
                </div>
                <div className="text-[9px] text-[#64748B] font-mono truncate max-w-[90px] md:max-w-[120px]">
                  {currentStudent.major}
                </div>
              </div>
              <svg className="w-3 h-3 text-[#64748B] hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#0F3470] bg-[#0F3470] text-white hover:bg-[#16438c] transition-all font-mono text-[11px] font-semibold shadow-2xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Student Sign In</span>
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
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`h-full px-1 text-xs transition-all flex items-center ${
                    activeTab === tab.id
                      ? "border-b-2 border-[#0F3470] text-[#0F3470] font-bold"
                      : "text-[#64748B] hover:text-[#0F3470] font-medium"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono text-[#64748B]">
              CONTEXT: <span className="px-2 py-0.5 rounded bg-[#E4F1FF] text-[#0F3470] font-semibold border border-[#C5DFFF]">ACADEMIC RIGOR</span>
            </div>
          </div>

          {/* ACTIVE TAB CONTENT */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 pb-24 md:pb-8 space-y-5 sm:space-y-6">
            
            {/* 1. SUMMARY VIEW */}
            {activeTab === "summary" && (
              <div className="max-w-3xl space-y-6">
                
                {/* Student Personal Greeting Banner */}
                {currentStudent && (
                  <div className="bg-gradient-to-r from-[#E4F1FF]/90 via-[#E4F1FF]/50 to-white border border-[#C5DFFF] rounded-xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white font-mono text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 ring-2 ring-white shadow-xs"
                        style={{ backgroundColor: currentStudent.avatarColor || "#0F3470" }}
                      >
                        {currentStudent.avatarInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-[#0F3470] font-sans">
                            Welcome back, {currentStudent.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#0F3470]/10 text-[#0F3470] border border-[#0F3470]/20">
                            ENROLLED STUDENT
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5 font-mono truncate">
                          <span>{currentStudent.major}</span>
                          <span>•</span>
                          <span className="text-amber-700 font-semibold flex items-center gap-1">
                            <span>🔥</span><span>{currentStudent.stats?.streak || 1} Day Streak</span>
                          </span>
                          <span className="hidden md:inline">•</span>
                          <span className="hidden md:inline text-emerald-700 font-semibold">
                            {Math.round(((currentStudent.stats?.drillsMastered || 0) / (currentStudent.stats?.drillsAttempted || 1)) * 100)}% Recall Accuracy
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setIsProfileModalOpen(true)}
                        className="px-2.5 py-1.5 rounded border border-[#0F3470]/30 bg-white hover:bg-[#E4F1FF] text-[#0F3470] font-mono text-[11px] font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-[#0F3470]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        <span>Student ID Card</span>
                      </button>
                    </div>
                  </div>
                )}

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
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">KEY NUANCE</span>
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
                    {studyData.takeaways.map((item) => (
                      <div key={item.num} className="p-5 flex gap-4">
                        <span className="font-mono text-xs px-2 py-0.5 h-fit rounded bg-[#0F3470] text-white font-semibold shrink-0 mt-0.5">{item.num}</span>
                        <div>
                          <h4 className="text-xs font-bold text-[#0F3470] font-mono">{item.concept}</h4>
                          <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
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

      {/* STUDENT LOGIN / REGISTRATION MODAL GATE */}
      {isLoginModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsLoginModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl w-full max-w-lg overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0F3470] text-white p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono tracking-widest text-[#E4F1FF] uppercase font-semibold">
                    GØJØ ACADEMIC PORTAL
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <h3 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
                Student Access &amp; Workspace
              </h3>
              <p className="text-xs text-white/80 mt-1 font-sans">
                Log in with your academic student ID to track mastery, streaks, and personal recall drills.
              </p>
            </div>

            {/* Auth Tabs */}
            <div className="flex border-b border-[#E2E8F0] bg-slate-50 text-xs font-mono">
              <button
                type="button"
                onClick={() => setAuthTab("quick")}
                className={`flex-1 py-3 px-2 text-center transition-all ${
                  authTab === "quick"
                    ? "font-bold text-[#0F3470] border-b-2 border-[#0F3470] bg-white"
                    : "font-medium text-[#64748B] hover:text-[#0F3470]"
                }`}
              >
                Quick Profiles
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("login")}
                className={`flex-1 py-3 px-2 text-center transition-all ${
                  authTab === "login"
                    ? "font-bold text-[#0F3470] border-b-2 border-[#0F3470] bg-white"
                    : "font-medium text-[#64748B] hover:text-[#0F3470]"
                }`}
              >
                Student Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("enroll")}
                className={`flex-1 py-3 px-2 text-center transition-all ${
                  authTab === "enroll"
                    ? "font-bold text-[#0F3470] border-b-2 border-[#0F3470] bg-white"
                    : "font-medium text-[#64748B] hover:text-[#0F3470]"
                }`}
              >
                New Student
              </button>
            </div>

            {/* Tab 1: Quick Profiles */}
            {authTab === "quick" && (
              <div className="p-5 sm:p-6 space-y-4">
                <div className="text-xs text-[#64748B]">
                  Select an enrolled student profile to instantly load their personal syllabus notes, active recall accuracy, and study streak:
                </div>

                <div className="space-y-2.5">
                  {students.map((student) => {
                    const isCurrent = currentStudent?.id === student.id;
                    const accuracy = Math.round(
                      ((student.stats?.drillsMastered || 0) / (student.stats?.drillsAttempted || 1)) * 100
                    );
                    return (
                      <div
                        key={student.id}
                        onClick={() => handleSelectStudent(student.id)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? "border-[#0F3470] bg-[#E4F1FF]/50 ring-1 ring-[#0F3470]"
                            : "border-[#E2E8F0] hover:border-[#0F3470]/40 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-full text-white font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ backgroundColor: student.avatarColor || "#0F3470" }}
                          >
                            {student.avatarInitials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-[#0F3470] truncate">{student.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold">
                                  CURRENT
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#64748B] font-mono truncate">
                              {student.major} · {student.institution}
                            </div>
                            <div className="text-[10px] text-[#64748B] font-mono flex items-center gap-2 mt-0.5">
                              <span>🔥 {student.stats?.streak || 1}d</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">{accuracy}% acc</span>
                              <span>•</span>
                              <span>{student.stats?.cardsMastered || 0} cards</span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-semibold transition-colors shrink-0 ${
                            isCurrent
                              ? "bg-[#0F3470] text-white"
                              : "bg-white border border-[#CBD5E1] text-[#0F3470] group-hover:bg-[#0F3470] group-hover:text-white"
                          }`}
                        >
                          {isCurrent ? "Active" : "Select"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthTab("enroll")}
                    className="text-[#0F3470] hover:underline font-mono font-semibold"
                  >
                    + Enroll as a New Student
                  </button>
                  <button
                    type="button"
                    onClick={continueAsGuest}
                    className="text-[#64748B] hover:text-[#0F3470] font-mono"
                  >
                    Continue as Guest →
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Sign In */}
            {authTab === "login" && (
              <form onSubmit={handleSignIn} className="p-5 sm:p-6 space-y-4">
                {loginError && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                    {loginError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#0F3470] mb-1">
                    Student ID or Academic Email
                  </label>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. GOJO-2027-4819 or alex.chen@harvard.edu"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3470]/30 focus:border-[#0F3470] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#0F3470] mb-1">
                    Access PIN / Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3470]/30 focus:border-[#0F3470] font-mono"
                  />
                  <div className="flex justify-between items-center mt-1 text-[11px] text-[#64748B]">
                    <span>Demo PIN: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[#0F3470]">1234</code></span>
                    <button type="button" onClick={() => setAuthTab("quick")} className="text-[#0F3470] hover:underline font-mono">
                      1-Click Profiles
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#0F3470] hover:bg-[#16438c] text-white font-mono text-xs sm:text-sm font-bold tracking-wide transition-colors shadow-sm"
                >
                  Sign In to Student Desk
                </button>
                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">No account yet?</span>
                  <button
                    type="button"
                    onClick={() => setAuthTab("enroll")}
                    className="text-[#0F3470] hover:underline font-mono font-semibold"
                  >
                    Enroll New Student
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Enroll */}
            {authTab === "enroll" && (
              <form onSubmit={handleEnroll} className="p-5 sm:p-6 space-y-3.5">
                {enrollError && (
                  <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                    {enrollError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#0F3470] mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={enrollName}
                      onChange={(e) => setEnrollName(e.target.value)}
                      placeholder="e.g. Jordan Lee"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3470]/30 focus:border-[#0F3470]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#0F3470] mb-1">
                      Major &amp; Class Year *
                    </label>
                    <input
                      type="text"
                      required
                      value={enrollMajor}
                      onChange={(e) => setEnrollMajor(e.target.value)}
                      placeholder="e.g. Neuroscience '27"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3470]/30 focus:border-[#0F3470]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-[#0F3470] mb-1">
                    University / Institution *
                  </label>
                  <input
                    type="text"
                    required
                    value={enrollInstitution}
                    onChange={(e) => setEnrollInstitution(e.target.value)}
                    placeholder="e.g. Harvard / Oxford / Stanford"
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3470]/30 focus:border-[#0F3470]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#0F3470] mb-1">
                      Academic Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={enrollEmail}
                      onChange={(e) => setEnrollEmail(e.target.value)}
                      placeholder="jordan.lee@university.edu"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3470]/30 focus:border-[#0F3470] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold text-[#0F3470] mb-1">
                      Create 4-Digit PIN *
                    </label>
                    <input
                      type="password"
                      maxLength={8}
                      required
                      value={enrollPin}
                      onChange={(e) => setEnrollPin(e.target.value)}
                      placeholder="1234"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F3470]/30 focus:border-[#0F3470] font-mono"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-lg bg-[#0F3470] hover:bg-[#16438c] text-white font-mono text-xs sm:text-sm font-bold tracking-wide transition-colors shadow-sm mt-2"
                >
                  Enroll Student &amp; Launch Desk
                </button>
                <div className="pt-2 border-t border-[#E2E8F0] text-center text-xs">
                  <button
                    type="button"
                    onClick={() => setAuthTab("login")}
                    className="text-[#64748B] hover:text-[#0F3470] font-mono"
                  >
                    Already enrolled? <span className="text-[#0F3470] underline font-semibold">Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STUDENT DIGITAL ID & TRANSCRIPT MODAL */}
      {isProfileModalOpen && currentStudent && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#CBD5E1] shadow-2xl w-full max-w-lg overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* DIGITAL STUDENT CARD UI */}
            <div className="p-5 sm:p-6 bg-gradient-to-br from-[#0F3470] via-[#0d2a58] to-[#16438c] text-white relative">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="38" cy="50" r="23" fill="none" stroke="white" strokeWidth="4.5" />
                      <circle cx="62" cy="50" r="23" fill="none" stroke="#DC2626" strokeWidth="4.5" />
                      <circle cx="50" cy="50" r="14" fill="none" stroke="white" strokeWidth="2" strokeDasharray="3 3" />
                      <line x1="20" y1="80" x2="80" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="50" cy="50" r="6" fill="white" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono tracking-widest text-[#93C5FD] font-semibold uppercase">
                      GØJØ ACADEMIC INSTITUTE
                    </div>
                    <div className="text-[9px] text-white/60 font-mono">OFFICIAL STUDENT CREDENTIAL</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-bold tracking-wider">
                  ACTIVE ENROLLED
                </span>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white text-[#0F3470] font-mono text-xl sm:text-2xl font-black flex items-center justify-center shadow-lg border-2 border-white/30 shrink-0"
                >
                  {currentStudent.avatarInitials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-lg sm:text-xl font-bold font-serif text-white truncate">
                    {currentStudent.name}
                  </h4>
                  <div className="text-xs font-mono text-[#93C5FD] font-semibold mt-0.5">
                    ID: {currentStudent.id}
                  </div>
                  <div className="text-xs text-white/80 font-mono mt-0.5 truncate">
                    {currentStudent.major}
                  </div>
                  <div className="text-[11px] text-white/60 truncate">
                    {currentStudent.institution}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="h-6 flex items-end gap-1 opacity-60">
                  <div className="w-1 h-6 bg-white" />
                  <div className="w-0.5 h-6 bg-white" />
                  <div className="w-1.5 h-6 bg-white" />
                  <div className="w-0.5 h-6 bg-white" />
                  <div className="w-2 h-6 bg-white" />
                  <div className="w-0.5 h-6 bg-white" />
                  <div className="w-1 h-6 bg-white" />
                  <div className="w-1.5 h-6 bg-white" />
                  <div className="w-0.5 h-6 bg-white" />
                  <div className="w-2 h-6 bg-white" />
                  <div className="w-1 h-6 bg-white" />
                </div>
                <div className="text-[9px] font-mono text-white/50 text-right">
                  VALID: 2026-2027 ACADEMIC SESSION
                </div>
              </div>
            </div>

            {/* Live Academic Transcript & Stats */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-[#E2E8F0]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-[#0F3470]">
                  Academic Mastery Record
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">Personal to this student</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-2xs">
                  <div className="text-[10px] font-mono text-[#64748B] flex items-center gap-1">
                    <span>🔥</span><span>Streak</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-[#0F3470] mt-0.5">
                    {currentStudent.stats?.streak || 1} Days
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-2xs">
                  <div className="text-[10px] font-mono text-[#64748B] flex items-center gap-1">
                    <span>🎯</span><span>Accuracy</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 mt-0.5">
                    {Math.round(
                      ((currentStudent.stats?.drillsMastered || 0) / (currentStudent.stats?.drillsAttempted || 1)) * 100
                    )}%
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-2xs">
                  <div className="text-[10px] font-mono text-[#64748B] flex items-center gap-1">
                    <span>🧠</span><span>Cards</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-[#0F3470] mt-0.5">
                    {currentStudent.stats?.cardsMastered || 0} Mastered
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-2xs">
                  <div className="text-[10px] font-mono text-[#64748B] flex items-center gap-1">
                    <span>📚</span><span>Syllabi</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-[#0F3470] mt-0.5">
                    {currentStudent.stats?.decksAnalyzed || 1} Analyzed
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex flex-wrap gap-2 justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileModalOpen(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#0F3470]/30 bg-white hover:bg-[#E4F1FF] text-[#0F3470] font-mono text-xs font-semibold transition-colors shadow-2xs"
                  >
                    ⇄ Switch Student
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-mono text-xs font-semibold transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-[#0F3470] hover:bg-[#16438c] text-white font-mono text-xs font-bold transition-colors ml-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
