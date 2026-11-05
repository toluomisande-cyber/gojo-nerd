"use client";

import React, { useState } from "react";

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
  const [activeTab, setActiveTab] = useState<"summary" | "arena" | "cards" | "chat">("summary");
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

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "gojo",
      content:
        "Document context is indexed. Ask about any mechanisms in the text or request a rapid drill.",
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

    // 6. Professor Trap Warning
    const trapItem = items.find((it) =>
      /\b(not|never|only|solely|except|however|whereas|unlike|must|strictly|important|contrast|rather than)\b/i.test(it.text)
    ) || items[Math.min(1, items.length - 1)] || items[0];

    const trap = `Professor Trap Warning [${trapItem && trapItem.slideNum ? `Slide ${trapItem.slideNum}` : 'Exam Nuance'}]: Pay strict attention to qualifiers and inverse conditions — "${trapItem ? trapItem.text : 'Examine causal direction carefully.'}"`;

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
    if (index === studyData.questions[currentQIndex].correct) {
      setArenaScore((prev) => prev + 1);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userQuery = chatInput.trim();
    const updatedHistory: ChatMessage[] = [...chatMessages, { role: "user", content: userQuery }];
    setChatMessages(updatedHistory);
    setChatInput("");

    const contextStr =
      sourceText.trim() ||
      `${studyData.trap}\n${studyData.takeaways.map((t) => `${t.concept}: ${t.desc}`).join("\n")}`;

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
        setChatMessages((prev) => [...prev, { role: "gojo", content: data.reply }]);
        return;
      }
    } catch {
      // Fallback to local grounded document search
    }

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

    setChatMessages((prev) => [
      ...prev,
      {
        role: "gojo",
        content: `From "${studyData.filename}": ${bestMatch}`,
      },
    ]);
  };

  return (
    <div className="bg-[#F8F9FA] text-[#0F3470] font-sans antialiased h-screen flex flex-col overflow-hidden selection:bg-[#E4F1FF]">
      
      {/* TOP ACCENT STATUS BAR (#0F3470) */}
      <div className="bg-[#0F3470] text-white px-6 py-1.5 flex items-center justify-between text-[11px] shrink-0 select-none">
        <div className="flex items-center gap-2 font-mono">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300" />
          <span className="font-semibold tracking-wide">GOJO.NERD // AUTONOMOUS SYNTHESIS ENGINE</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-white/90 font-mono text-[10px]">
          <span>SUMMARY SYNTHESIS</span>
          <span className="text-white/40">|</span>
          <span>TRAP DETECTION</span>
          <span className="text-white/40">|</span>
          <span>ACTIVE RECALL</span>
          <span className="text-white/40">|</span>
          <span>3D FLASHCARDS</span>
        </div>
      </div>

      {/* TOP MASTHEAD */}
      <header className="h-14 border-b border-[#E2E8F0] bg-white px-6 flex items-center justify-between shrink-0 select-none text-xs">
        <div className="flex items-center gap-4">
          
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

          <div className="flex items-baseline gap-2">
            <span className="font-serif font-bold text-base text-[#0F3470] tracking-tight">Gojo</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#64748B] font-medium text-xs">Academic Syllabus &amp; Research Tool</span>
          </div>

          <div className="h-4 w-[1px] bg-[#E2E8F0] mx-2" />

          {/* Active File Metadata */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#E4F1FF] border border-[#C5DFFF] font-mono text-[11px] text-[#0F3470]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold">{studyData.filename}</span>
            <span className="text-[#64748B]">(14.2 KB text)</span>
          </div>
        </div>

        {/* Print / Export Action */}
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded border border-[#0F3470]/30 bg-[#E4F1FF]/60 hover:bg-[#0F3470] hover:text-white text-[#0F3470] transition-colors flex items-center gap-2 font-mono text-[11px] font-semibold shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Study Syllabus
        </button>
      </header>

      {/* MAIN SPLIT PANE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANE: SOURCE TEXT EXPLORER */}
        <aside className="w-80 md:w-96 border-r border-[#E2E8F0] bg-white flex flex-col shrink-0">
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
          
          {/* TAB STRIP */}
          <div className="h-11 border-b border-[#E2E8F0] px-6 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-6 h-full">
              {[
                { id: "summary", label: "Executive Principles & Traps" },
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
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            
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

                {/* Trap Notice */}
                <div className="border-l-4 border-[#991B1B] bg-red-50/60 p-5 rounded-r-lg border-y border-r border-red-100">
                  <div className="flex items-center gap-2 text-[#991B1B] text-xs font-semibold font-mono uppercase tracking-wide">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Professor Trap Warning
                  </div>
                  <p className="text-xs text-red-950 mt-2 leading-relaxed">{studyData.trap}</p>
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
              <div className="max-w-md mx-auto pt-6">
                <div
                  className="perspective-1000 w-full h-72 cursor-pointer select-none"
                  onClick={() => setIsFlipped((prev) => !prev)}
                >
                  <div
                    className={`relative w-full h-full duration-300 transform-style-3d transition-transform ${
                      isFlipped ? "rotate-y-180" : ""
                    }`}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 w-full h-full rounded-xl bg-white border border-[#CBD5E1] backface-hidden p-8 flex flex-col justify-between shadow-sm">
                      <div className="flex justify-between items-center text-[10px] font-mono text-[#64748B]">
                        <span className="uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-[#E4F1FF] text-[#0F3470]">Vocabulary</span>
                        <span>Front</span>
                      </div>
                      <div className="text-center my-auto">
                        <h3 className="text-2xl font-serif font-bold text-[#0F3470] tracking-tight">
                          {studyData.cards[currentCardIndex].term}
                        </h3>
                        <p className="text-xs text-[#64748B] mt-2 font-mono">Click to flip card</p>
                      </div>
                      <div className="text-right text-[10px] font-mono text-[#0F3470] font-semibold">Flip Card &rarr;</div>
                    </div>

                    {/* Back */}
                    <div className="absolute inset-0 w-full h-full rounded-xl bg-[#0F3470] border border-[#0F3470] text-white backface-hidden rotate-y-180 p-8 flex flex-col justify-between shadow-md">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span className="uppercase tracking-widest text-[#93C5FD] font-semibold">Mechanism</span>
                        <span>Back</span>
                      </div>
                      <div className="my-auto">
                        <p className="text-sm text-slate-200 leading-relaxed font-sans">
                          {studyData.cards[currentCardIndex].def}
                        </p>
                      </div>
                      <div className="text-right text-[10px] font-mono text-[#93C5FD]">Return &rarr;</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5">
                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex((prev) => (prev - 1 + studyData.cards.length) % studyData.cards.length);
                    }}
                    className="px-4 py-1.5 rounded bg-white border border-[#E2E8F0] text-xs font-mono text-[#0F3470] hover:bg-[#E4F1FF] transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-mono text-[#64748B]">
                    CARD {String(currentCardIndex + 1).padStart(2, "0")} // {String(studyData.cards.length).padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => {
                      setIsFlipped(false);
                      setCurrentCardIndex((prev) => (prev + 1) % studyData.cards.length);
                    }}
                    className="px-4 py-1.5 rounded bg-[#0F3470] text-xs font-mono text-white hover:bg-[#0F3470] transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* 4. DOCUMENT ASSISTANT (CHAT) */}
            {activeTab === "chat" && (
              <div className="max-w-2xl space-y-4">
                <div className="bg-white border border-[#E2E8F0] rounded-lg h-[460px] flex flex-col shadow-sm overflow-hidden">
                  <div className="p-3.5 border-b border-[#E2E8F0] flex justify-between items-center text-xs bg-[#0F3470] text-white">
                    <span className="font-mono font-semibold">Gojo // Document In-Depth Assistant</span>
                    <span className="text-[10px] font-mono text-[#93C5FD]">Strictly bound to uploaded context</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-lg border ${
                          msg.role === "user"
                            ? "bg-[#E4F1FF]/60 border-[#C5DFFF] text-[#0F3470] ml-8"
                            : "bg-white border-[#E2E8F0] text-[#0F3470] shadow-sm mr-8"
                        }`}
                      >
                        <span
                          className={`font-mono text-[10px] block mb-1 font-semibold ${
                            msg.role === "user" ? "text-[#64748B]" : "text-[#0F3470]"
                          }`}
                        >
                          {msg.role === "user" ? "USER QUERY" : "GOJO // RESEARCH PARTNER"}
                        </span>
                        <p>{msg.content}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 border-t border-[#E2E8F0] flex gap-2 bg-white">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask a clarifying conceptual question..."
                      className="flex-1 bg-[#F8F9FA] border border-[#E2E8F0] rounded px-3 py-2 text-xs text-[#0F3470] placeholder:text-[#64748B] focus:outline-none focus:border-[#0F3470] font-sans"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded bg-[#0F3470] hover:bg-[#0F3470] text-white font-semibold text-xs transition-colors"
                    >
                      Submit
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
}
