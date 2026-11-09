import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
// @ts-ignore
import * as pdfParseModule from "pdf-parse";

const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

function parseJsonSafe(rawText: string) {
  const cleaned = String(rawText || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

function withModelTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Model call timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function extractPdfTextWithTimeout(buffer: Buffer, timeoutMs = 6000): Promise<string> {
  return Promise.race([
    (async () => {
      const mod: any = pdfParseModule;
      if (typeof mod === "function") {
        const res = await mod(buffer);
        return res?.text || "";
      }
      if (typeof mod?.default === "function") {
        const res = await mod.default(buffer);
        return res?.text || "";
      }
      if (mod && typeof mod.PDFParse === "function") {
        const parser = new mod.PDFParse({ data: buffer });
        try {
          const res = await parser.getText();
          return res?.text || "";
        } finally {
          if (typeof parser.destroy === "function") {
            await parser.destroy().catch(() => {});
          }
        }
      }
      return "";
    })(),
    new Promise<string>((resolve) => setTimeout(() => resolve(""), timeoutMs)),
  ]);
}

async function executeWithModelFallback(
  genAI: GoogleGenerativeAI,
  config: any,
  operation: (model: any) => Promise<any>
) {
  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ ...config, model: modelName });
      return await withModelTimeout(operation(model), 12000);
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[Gemini Fallback] Model ${modelName} failed (${err.message?.slice(0, 70)}). Trying next candidate...`
      );
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let contentToAnalyze = "";
    let userMemory: any = null;
    const inlineParts: any[] = [];

    if (contentType.includes("application/json")) {
      const body = await req.json();
      contentToAnalyze = (body.text || "").trim();
      userMemory = body.userMemory || null;

      if (body.imageBase64) {
        const cleanB64 = String(body.imageBase64)
          .replace(/^data:[^;]+;base64,/, "")
          .trim();
        if (cleanB64) {
          inlineParts.push({
            inlineData: {
              data: cleanB64,
              mimeType: body.imageMimeType || "image/jpeg",
            },
          });
        }
      }
      if (Array.isArray(body.imagesBase64)) {
        for (const item of body.imagesBase64.slice(0, 3)) {
          const cleanB64 = String(item.data || item)
            .replace(/^data:[^;]+;base64,/, "")
            .trim();
          if (cleanB64) {
            inlineParts.push({
              inlineData: {
                data: cleanB64,
                mimeType: item.mimeType || body.imageMimeType || "image/jpeg",
              },
            });
          }
        }
      }
    } else {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const rawText = formData.get("text") as string | null;
      const imageBase64 = formData.get("imageBase64") as string | null;
      const imageMimeType = (formData.get("imageMimeType") as string | null) || "image/jpeg";
      const rawUserMemory = formData.get("userMemory") as string | null;

      if (rawUserMemory) {
        try {
          userMemory = JSON.parse(rawUserMemory);
        } catch {
          userMemory = null;
        }
      }

      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const lowerName = (file.name || "").toLowerCase();
        const isImg =
          (file.type && file.type.startsWith("image/")) ||
          /\.(png|jpe?g|webp|gif|bmp)$/i.test(lowerName);
        const isPdf = file.type === "application/pdf" || lowerName.endsWith(".pdf");

        if (isImg) {
          inlineParts.push({
            inlineData: {
              data: buffer.toString("base64"),
              mimeType: file.type || "image/jpeg",
            },
          });
        } else if (isPdf) {
          contentToAnalyze = await extractPdfTextWithTimeout(buffer);
          if (!contentToAnalyze && buffer.length < 4 * 1024 * 1024) {
            inlineParts.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: "application/pdf",
              },
            });
          }
        } else {
          contentToAnalyze = buffer.toString("utf-8");
        }
      }

      if (!contentToAnalyze && rawText && rawText.trim().length > 0) {
        contentToAnalyze = rawText;
      }

      if (imageBase64) {
        const cleanB64 = imageBase64.replace(/^data:[^;]+;base64,/, "").trim();
        if (cleanB64) {
          inlineParts.push({ inlineData: { data: cleanB64, mimeType: imageMimeType } });
        }
      }
    }

    // Clean whitespace and slide-header noise
    const sanitizedText = contentToAnalyze
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!sanitizedText && inlineParts.length === 0) {
      return NextResponse.json({ error: "Missing document input." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        success: false,
        extractedText: sanitizedText.slice(0, 20000),
        demoFallback: true,
        error: "Gemini API key not configured; using client analyzer.",
      });
    }

    let userMemoryBlock = "";
    if (userMemory && typeof userMemory === "object") {
      const lines: string[] = [];
      if (userMemory.name || userMemory.major) {
        lines.push(`Student: ${userMemory.name || "Student"} (${userMemory.major || "Course"})`);
      }
      if (Array.isArray(userMemory.memories) && userMemory.memories.length > 0) {
        lines.push(
          "Student Memory & Past Weak Spots:\n" +
            userMemory.memories
              .slice(0, 12)
              .map((m: any) => `- [${m.category || "note"}] ${m.content}`)
              .join("\n")
        );
      }
      if (lines.length > 0) {
        userMemoryBlock = `\n\nSTUDENT MEMORY CONTEXT (Tailor the Professor Trap and Exam Arena Questions to reinforce these areas when relevant to the lecture material):\n${lines.join("\n")}`;
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `You are an elite academic curriculum architect and exam analyst.${userMemoryBlock}

Your job is to read raw lecture notes/slides and synthesize them into high-yield exam preparation data.

CRITICAL PARSING RULES:
1. TOPIC CLUSTERING: Do not pick random sentences or footnotes. Identify the 2 to 4 primary, overarching lecture units (e.g., in a respiration lecture: 1. Glycolytic Cleavage, 2. Citric Acid Cycle, 3. Oxidative Phosphorylation).
2. HIGH-YIELD TAKEAWAYS: Each takeaway must explain a cause-and-effect biological, mathematical, legal, or physical MECHANISM, not just a factoid.
3. FLASHCARDS: Every card must pair a core technical term with its operational definition AND an exam hook (why professors test it).
4. PROFESSOR TRAP: Find the single biggest point of confusion, edge-case, or false assumption students commonly fail on multiple-choice exams for these topics.
5. EXAM ARENA QUESTIONS: Questions must test application, comparison, or mechanism. Banned: trivia questions ("what was on slide 4", "who wrote the textbook").

OUTPUT SCHEMA (STRICT JSON):
{
  "unit_title": "Primary Lecture Subject Title",
  "takeaways": [
    { "num": "01", "concept": "Core Mechanism Name", "desc": "Detailed, high-yield explanation of the mechanism." }
  ],
  "terms": ["Crucial Term 1", "Crucial Term 2", "Crucial Term 3", "Crucial Term 4", "Crucial Term 5"],
  "trap": "Direct, 2-sentence breakdown of the specific exam trap professors set on this material.",
  "cards": [
    {
      "term": "Term or Principle",
      "def": "Complete conceptual mechanism and why it matters on an exam."
    }
  ],
  "questions": [
    {
      "q": "Conceptual multiple-choice question testing the core mechanism?",
      "options": ["Plausible Distractor A", "Correct Answer B", "Common Trap C", "Plausible Distractor D"],
      "correct": 1,
      "critique": "Analytical breakdown of why the incorrect choices fail.",
      "accolade": "Direct reinforcement of the correct mechanism."
    }
  ]
}`;

    const promptParts: any[] = [...inlineParts];
    if (sanitizedText) {
      promptParts.push(
        `Synthesize this lecture material into a structured exam study package:\n\n"""\n${sanitizedText.slice(0, 75000)}\n"""`
      );
    } else {
      promptParts.push(
        `Synthesize the attached lecture slide/document material into a structured exam study package following the strict JSON schema.`
      );
    }

    const parsedData = await executeWithModelFallback(
      genAI,
      {
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2, // Low temperature forces analytical discipline over creativity
        },
        systemInstruction,
      },
      async (model) => {
        const result = await model.generateContent(promptParts);
        return parseJsonSafe(result.response.text());
      }
    );

    const finalExtractedText =
      sanitizedText ||
      parsedData.extractedText ||
      (Array.isArray(parsedData.takeaways)
        ? parsedData.takeaways.map((t: any) => `${t.concept}: ${t.desc}`).join("\n\n")
        : "");

    return NextResponse.json({
      success: true,
      data: parsedData,
      extractedText: finalExtractedText.slice(0, 20000),
    });
  } catch (error: any) {
    console.error("Analysis Pipeline Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze lecture document." },
      { status: 500 }
    );
  }
}
