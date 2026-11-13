import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ADMIN_WORD_PATTERN = /^(index|agenda|outline|contents?|overview|summary|slide\s*\d*|page\s*\d*|table\s*of\s*contents|syllabus|course\s*overview|introduction\s*to\s*course)$/i;

function isAdministrativeTerm(str: string) {
  if (!str) return true;
  const clean = String(str).trim();
  if (clean.length < 3) return true;
  if (ADMIN_WORD_PATTERN.test(clean)) return true;
  if (/^slide\s*\d+/i.test(clean) || /^page\s*\d+/i.test(clean)) return true;
  if (/^index\b/i.test(clean) || /^agenda\b/i.test(clean) || /^outline\b/i.test(clean)) return true;
  return false;
}

function cleanLectureSlideText(rawText: string) {
  if (!rawText) return "";
  return String(rawText)
    .replace(/\r\n/g, "\n")
    .replace(/^\s*(?:\[\s*)?(?:Slide|Page)\s*\d+(?:\s*(?:\/|of)\s*\d+)?(?:\s*\])?\s*[:.-]?\s*$/gim, "")
    .replace(/^\s*(?:index|table\s+of\s+contents|agenda|course\s+outline)\s*[:.-]\s*$/gim, "")
    .trim();
}

function extractJsonFromLlmText(text: string) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  const stripped = trimmed.replace(/^`{3,}(?:json)?\s*/i, "").replace(/`{3,}\s*$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
  }
  return null;
}

function normalizeStudyPackage(raw: any, defaultTitle = "Lecture Study Guide") {
  if (!raw || typeof raw !== "object") return null;

  const unit_title = (raw.unit_title && typeof raw.unit_title === "string" && !isAdministrativeTerm(raw.unit_title))
    ? raw.unit_title.trim()
    : defaultTitle;

  let takeaways: Array<{ num: string; concept: string; desc: string }> = [];
  if (Array.isArray(raw.takeaways)) {
    takeaways = raw.takeaways
      .map((item: any, idx: number) => {
        const num = String(idx + 1).padStart(2, "0");
        if (typeof item === "string") {
          return {
            num,
            concept: `Core Topic ${idx + 1}`,
            desc: item.trim(),
          };
        }
        if (item && typeof item === "object") {
          let concept = String(item.concept || item.title || item.topic || `Core Topic ${idx + 1}`).trim();
          if (isAdministrativeTerm(concept)) {
            concept = `Core Principle ${idx + 1}`;
          }
          const desc = String(item.desc || item.description || item.explanation || item.summary || "").trim();
          return {
            num: item.num ? String(item.num).padStart(2, "0") : num,
            concept,
            desc,
          };
        }
        return null;
      })
      .filter((t: any): t is { num: string; concept: string; desc: string } => !!t && t.desc.length > 10 && !isAdministrativeTerm(t.concept));
  }

  let terms: string[] = [];
  if (Array.isArray(raw.terms)) {
    terms = raw.terms
      .map((t: any) => (typeof t === "string" ? t.trim() : ""))
      .filter((t: string) => t.length > 2 && !isAdministrativeTerm(t));
  }

  let trap = "";
  if (typeof raw.trap === "string") {
    trap = raw.trap.trim();
  } else if (Array.isArray(raw.trap)) {
    trap = raw.trap.map((t: any) => String(t).trim()).join(" ");
  }

  let cards: Array<{ term: string; def: string }> = [];
  if (Array.isArray(raw.cards)) {
    cards = raw.cards
      .map((c: any) => {
        if (!c || typeof c !== "object") return null;
        const term = String(c.term || c.concept || "").trim();
        const def = String(c.def || c.definition || c.desc || "").trim();
        if (isAdministrativeTerm(term) || !term || !def) return null;
        return { term, def };
      })
      .filter((c: any): c is { term: string; def: string } => !!c);
  }

  let questions: Array<{ q: string; options: string[]; correct: number; critique: string; accolade: string }> = [];
  if (Array.isArray(raw.questions)) {
    questions = raw.questions
      .map((q: any) => {
        if (!q || typeof q !== "object") return null;
        const questionText = String(q.q || q.question || "").trim();
        let options = Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [];
        if (options.length < 2) return null;
        while (options.length < 4) {
          options.push(`Alternative perspective ${options.length + 1}`);
        }
        options = options.slice(0, 4);

        let correct = typeof q.correct === "number" ? Math.floor(q.correct) : 0;
        if (correct < 0 || correct >= options.length) correct = 0;

        const critique = String(q.critique || q.explanation || `The correct option is choice ${correct + 1}.`).trim();
        const accolade = String(q.accolade || "Excellent mastery of this concept.").trim();

        return {
          q: questionText,
          options,
          correct,
          critique,
          accolade,
        };
      })
      .filter((q: any): q is { q: string; options: string[]; correct: number; critique: string; accolade: string } => !!q && q.q.length > 10);
  }

  if (takeaways.length === 0 || questions.length === 0) {
    return null;
  }

  return {
    unit_title,
    takeaways: takeaways.slice(0, 6),
    terms: terms.slice(0, 14),
    trap: trap || "Pay close attention to key regulatory mechanisms and boundary conditions that distinguish primary pathways from secondary cascades.",
    cards: cards.slice(0, 14),
    questions: questions.slice(0, 10),
  };
}

async function generateCurriculumWithAI(lectureText: string, title = "Lecture Material") {
  const openRouterKey = (process.env.OPENROUTER_API_KEY || "").trim();
  if (!openRouterKey) return null;

  const model = (process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct").trim().replace(/:free$/, "");
  const cleanTitle = String(title || "Lecture Study Guide")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  const cleanedSlides = cleanLectureSlideText(lectureText).slice(0, 24000);

  const systemPrompt = `You are an elite university professor, academic tutor, and curriculum architect.
Your mission is to read a student's uploaded lecture slides/notes and transform them into a comprehensive, master-level exam study package.

CRITICAL PEDAGOGICAL RULES:
1. NEVER output administrative labels such as "Index", "Agenda", "Outline", "Table of Contents", "Overview", "Slide 1", "Introduction to Course", or professor contact info as a topic or concept title. Discard all slide metadata.
2. INTELLIGENTLY CLUSTER TOPICS: Group the actual academic subject matter across the slides into 4 to 6 distinct, high-yield conceptual topics based on contextual understanding.
3. IN-DEPTH EXPLANATIONS (NO LAZY BULLETS): For every topic, provide an in-depth, thorough, crystal-clear explanation. Use deep academic reasoning to explain the underlying mechanism, background scientific/theoretical context, why it happens, and how it is applied. Go beyond what is on the slides to provide rich conceptual depth for thorough reading and exam preparation!
4. EXAM TRAP: Identify the single most dangerous, subtle exam pitfall, distinction, or trick question area that examiners test to catch students who only memorize superficially.
5. DOMAIN TERMS: Extract 8 to 14 essential technical terms.
6. FLASHCARDS: Generate 8 to 12 flashcards with clear terms and rich, precise definitions.
7. EXAM QUESTIONS: Create 6 to 8 rigorous multiple-choice questions that test conceptual understanding and mechanism, each with 4 distinct options, the 0-based integer index of the correct answer, a detailed critique explaining why the answer is right and why each distractor is wrong, and an accolade.

Return ONLY a valid JSON object matching this schema:
{
  "unit_title": "${cleanTitle}",
  "takeaways": [
    {
      "num": "01",
      "concept": "Conceptual Topic Name",
      "desc": "Thorough, in-depth academic explanation detailing mechanisms, context, and exam significance..."
    }
  ],
  "terms": ["Term 1", "Term 2"],
  "trap": "Detailed exam trap and critical distinction...",
  "cards": [
    {
      "term": "Term Name",
      "def": "Precise, high-yield definition and significance..."
    }
  ],
  "questions": [
    {
      "q": "Thoughtful examination question testing mechanism or distinction?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Comprehensive critique explaining why the correct choice is right and how distractors attempt to trick students...",
      "accolade": "Praise highlighting the concept mastered."
    }
  ]
}
Strictly return valid JSON only. Do not output conversational preamble.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 28000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
        "HTTP-Referer": "https://gojo-nerd.vercel.app",
        "X-Title": "Gojo Study Assistant",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Document Title: ${cleanTitle}\n\nPlease analyze these lecture slides/notes and produce the complete exam study package:\n\n${cleanedSlides}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`OpenRouter analyze request failed with status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const parsed = extractJsonFromLlmText(content);
    return normalizeStudyPackage(parsed, cleanTitle);
  } catch (err: any) {
    clearTimeout(timer);
    console.warn("AI curriculum synthesis error/timeout:", err.message);
    return null;
  }
}

function buildCurriculumStudyPackage(rawText: string, title = "Lecture_Material") {
  const cleanTitle = String(title || "Lecture Study Guide")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  const cleanedText = cleanLectureSlideText(rawText);

  const normalized = String(cleanedText || cleanTitle)
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  const rawSentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/^\[Slide\s*\/?\s*Page\s*\d+\]\s*/i, "").trim())
    .filter((s) => {
      if (s.length < 28 || s.length > 360) return false;
      if (isAdministrativeTerm(s.slice(0, 30))) return false;
      return true;
    });

  const sentences =
    rawSentences.length >= 3
      ? rawSentences
      : [
          `${cleanTitle} establishes the foundational mechanisms, structural definitions, and primary causal relationships covered in this unit.`,
          `Core processes in ${cleanTitle} operate through sequential state transitions regulated by boundary conditions and rate-limiting steps.`,
          `Distinguishing primary mechanisms from secondary outcomes is critical when evaluating quantitative or conceptual problem sets.`,
          `Applied problems require tracing how perturbations in initial inputs propagate through intermediate stages to alter final yield.`,
          `Comparative analysis across sections highlights where standard assumptions hold and where edge-case exceptions occur.`,
        ];

  const stopWords = new Set([
    "the","and","for","that","this","with","from","into","are","was","were","have","has","had","not","but","what","which","when","where","who","how","why","can","will","may","also","such","than","then","them","they","their","there","these","those","between","through","during","before","after","above","below","under","over","again","further","once","here","very","just","only","both","each","more","most","other","some","many","slide","page","lecture","notes","chapter","section","figure","table","using","used","uses","make","made","does","done","about","would","could","should","because","while","where","within","without","index","agenda","outline","contents","overview","summary","syllabus"
  ]);

  const candidates =
    normalized.match(/\b[A-Z][a-zA-Z0-9-]{3,}(?:\s+[A-Z][a-zA-Z0-9-]{3,})?\b|\b[a-zA-Z]{6,}\b/g) || [];
  const freqMap = new Map<string, { display: string; score: number }>();
  for (const rawWord of candidates) {
    const cleaned = rawWord.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
    const lower = cleaned.toLowerCase();
    if (cleaned.length < 4 || stopWords.has(lower) || /^\d+$/.test(cleaned) || isAdministrativeTerm(cleaned)) continue;
    const isCapitalized = /^[A-Z]/.test(cleaned);
    freqMap.set(lower, {
      display: isCapitalized ? cleaned : cleaned.charAt(0).toUpperCase() + cleaned.slice(1),
      score: (freqMap.get(lower)?.score || 0) + (isCapitalized ? 3 : 1),
    });
  }

  const sortedTerms = Array.from(freqMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.display);

  const terms = sortedTerms.slice(0, 14);
  const fallbackTerms = [
    "Primary Mechanism",
    "Rate-Limiting Step",
    "Boundary Condition",
    "Equilibrium State",
    "Regulatory Feedback",
    "Substrate Coupling",
    "Structural Domain",
    "Terminal Output",
  ];
  for (const ft of fallbackTerms) {
    if (terms.length >= 10) break;
    if (!terms.some((t) => t.toLowerCase() === ft.toLowerCase())) {
      terms.push(ft);
    }
  }

  const targetTakeaways = Math.min(6, Math.max(4, Math.ceil(sentences.length / 4)));
  const takeaways = [];
  for (let i = 0; i < targetTakeaways; i++) {
    const sIdx = Math.min(
      sentences.length - 1,
      Math.floor((i * sentences.length) / targetTakeaways)
    );
    const sentence = sentences[sIdx];
    let matchedTerm =
      terms.find((t) => sentence.toLowerCase().includes(t.toLowerCase())) ||
      terms[i % terms.length] ||
      `Core Principle ${i + 1}`;

    if (isAdministrativeTerm(matchedTerm)) {
      matchedTerm = `Core Principle ${i + 1}`;
    }

    takeaways.push({
      num: String(i + 1).padStart(2, "0"),
      concept: matchedTerm,
      desc: sentence,
    });
  }

  const contrastSentence =
    sentences.find((s) =>
      /\b(not|however|unlike|whereas|only|except|instead|rather|solely|never|must)\b/i.test(s)
    ) ||
    sentences[Math.floor(sentences.length / 2)] ||
    sentences[0];
  const trap = `Pay close attention to the distinction between ${
    terms[0] || "the primary mechanism"
  } and ${terms[1] || "secondary stages"}: ${contrastSentence}`;

  const cards = terms.slice(0, 12).map((term, idx) => {
    const matchingSentence =
      sentences.find((s) => s.toLowerCase().includes(term.toLowerCase())) ||
      sentences[idx % sentences.length];
    return {
      term,
      def: matchingSentence,
    };
  });

  const targetQuestions = Math.min(10, Math.max(6, sentences.length));
  const questions = [];
  for (let i = 0; i < targetQuestions; i++) {
    const sIdx = Math.min(
      sentences.length - 1,
      Math.floor((i * sentences.length) / targetQuestions)
    );
    const fact = sentences[sIdx];
    let focusTerm =
      terms.find((t) => fact.toLowerCase().includes(t.toLowerCase())) ||
      terms[i % terms.length];
    if (isAdministrativeTerm(focusTerm)) focusTerm = "the active mechanism";

    const altTermA = terms[(i + 1) % terms.length] || "secondary intermediates";
    const altTermB = terms[(i + 2) % terms.length] || "external buffers";
    const correctSlot = i % 4;

    const distractors = [
      `It bypasses ${focusTerm} entirely and proceeds without ${altTermA} involvement.`,
      `It reverses the direction of ${altTermA} prior to reaching the ${altTermB} threshold.`,
      `It restricts ${focusTerm} exclusively to passive equilibrium without net output.`,
    ];

    const conciseFact = fact.length > 155 ? fact.slice(0, 152) + "..." : fact;
    const options: string[] = [];
    let dIdx = 0;
    for (let slot = 0; slot < 4; slot++) {
      if (slot === correctSlot) {
        options.push(conciseFact);
      } else {
        options.push(distractors[dIdx++]);
      }
    }

    questions.push({
      q: `Regarding ${focusTerm} in ${cleanTitle}, which statement accurately reflects the mechanism documented in the material?`,
      options,
      correct: correctSlot,
      critique: `Reference from source text: "${fact}" — The other choices misstate the sequence or dependency of ${focusTerm}.`,
      accolade: `Correct. "${conciseFact}" accurately states the documented mechanism for ${focusTerm}.`,
    });
  }

  return {
    unit_title: cleanTitle,
    takeaways,
    terms,
    trap,
    cards,
    questions,
  };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let contentToAnalyze = "";
    let activeTitle = "Lecture_Material";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      contentToAnalyze = String(body.text || "").trim();
      activeTitle = body.filename || activeTitle;
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const rawText = formData.get("text") as string | null;

      if (file && file.size > 0) {
        activeTitle = file.name || activeTitle;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const isPdf =
          file.type === "application/pdf" ||
          (file.name || "").toLowerCase().endsWith(".pdf") ||
          buffer.slice(0, 4).toString("ascii") === "%PDF";

        if (isPdf) {
          // @ts-ignore
          const pdfMod: any = await import("pdf-parse-fork");
          const pdf = pdfMod.default || pdfMod;
          const pdfData = await pdf(buffer);
          contentToAnalyze = pdfData.text;
        } else {
          contentToAnalyze = buffer.toString("utf-8");
        }
      }

      if (!contentToAnalyze && rawText && rawText.trim().length > 0) {
        contentToAnalyze = rawText;
      }
    }

    if (!contentToAnalyze || !contentToAnalyze.trim()) {
      return NextResponse.json(
        { success: false, error: "Could not extract readable text from the file." },
        { status: 400 }
      );
    }

    const cleanContext = contentToAnalyze.replace(/\s+/g, " ").slice(0, 30000);

    // 1. Try AI-powered contextual topic clustering with deep academic explanations
    let parsedData = await generateCurriculumWithAI(cleanContext, activeTitle);

    // 2. Fall back to heuristic rule-based curriculum builder
    if (!parsedData) {
      parsedData = buildCurriculumStudyPackage(cleanContext, activeTitle);
    }

    return NextResponse.json({
      success: true,
      extractedText: cleanContext.slice(0, 20000),
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Document indexing error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
