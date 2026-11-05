import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
// @ts-ignore
import * as pdfParseModule from "pdf-parse";

const CANDIDATE_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
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

async function extractPdfTextWithTimeout(buffer: Buffer, timeoutMs = 4500): Promise<string> {
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

async function executeWithModelFallback(genAI: GoogleGenerativeAI, config: any, operation: (model: any) => Promise<any>) {
  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ ...config, model: modelName });
      return await withModelTimeout(operation(model), 7500);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed (${err.message?.slice(0, 70)}). Trying next candidate...`);
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let contentToAnalyze = "";
    const inlineParts: any[] = [];

    if (contentType.includes("application/json")) {
      const body = await req.json();
      contentToAnalyze = (body.text || "").trim();
      if (body.imageBase64) {
        const cleanB64 = String(body.imageBase64).replace(/^data:[^;]+;base64,/, "").trim();
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
          const cleanB64 = String(item.data || item).replace(/^data:[^;]+;base64,/, "").trim();
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

      if (rawText && rawText.trim()) {
        contentToAnalyze = rawText.trim();
      }
      if (imageBase64) {
        const cleanB64 = imageBase64.replace(/^data:[^;]+;base64,/, "").trim();
        if (cleanB64) {
          inlineParts.push({ inlineData: { data: cleanB64, mimeType: imageMimeType } });
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
          if (inlineParts.length === 0) {
            inlineParts.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: file.type || "image/jpeg",
              },
            });
          }
        } else if (isPdf) {
          if (!contentToAnalyze) {
            contentToAnalyze = (await extractPdfTextWithTimeout(buffer)).trim();
          }
          if (!contentToAnalyze && inlineParts.length === 0 && buffer.length < 4 * 1024 * 1024) {
            inlineParts.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType: "application/pdf",
              },
            });
          }
        } else if (!contentToAnalyze) {
          contentToAnalyze = buffer.toString("utf-8").trim();
        }
      }
    }

    if (!contentToAnalyze && inlineParts.length === 0) {
      return NextResponse.json(
        { error: "Please upload a PDF, image, or paste notes." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      return NextResponse.json({
        success: false,
        extractedText: contentToAnalyze.slice(0, 20000),
        demoFallback: true,
        error: "Gemini API key not configured; using client analyzer.",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const activeTitle = "Uploaded_Study_Material";
    const isMultiSlideOrLong = (contentToAnalyze.length > 2500) || /\[Slide \/ Page \d+\]/i.test(contentToAnalyze);
    const targetQCount = isMultiSlideOrLong ? '12 to 15' : '10 to 12';
    const targetCardCount = isMultiSlideOrLong ? '15 to 20' : '12 to 15';

    const promptParts: any[] = [...inlineParts];
    if (inlineParts.length > 0 && contentToAnalyze) {
      promptParts.push(
        `Source: "${activeTitle}". Analyze the attached visual slide(s) AND extracted text below. Perform an end-to-end scan across all slides from beginning to end. Populate "extractedText" with readable transcription, and generate: 5 to 7 high-yield takeaways, 15 to 20 terms, 1 professor trap warning, ${targetQCount} multiple choice questions (spaced evenly from early, middle, and late slides), and ${targetCardCount} flashcards:\n\n"""\n${contentToAnalyze.slice(0, 65000)}\n"""`
      );
    } else if (inlineParts.length > 0) {
      promptParts.push(
        `Source: "${activeTitle}". Read all visible text, diagrams, and handwriting in the attached slide image(s). Populate "extractedText" with readable transcription, and generate: 5 to 7 high-yield takeaways, 12 to 16 terms, 1 professor trap warning, 10 to 12 multiple choice questions, and 12 to 15 flashcards.`
      );
    } else {
      promptParts.push(
        `Source: "${activeTitle}". Perform a comprehensive, end-to-end scan of the provided lecture/slide material from the first slide to the last slide. You MUST generate ${targetQCount} multiple choice questions (testing different topics and slides evenly across the beginning, middle, and end) and ${targetCardCount} flashcards, plus 5 to 7 takeaways and 15 to 20 terms:\n\n"""\n${contentToAnalyze.slice(0, 75000)}\n"""`
      );
    }

    const parsedData = await executeWithModelFallback(
      genAI,
      {
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.25,
          maxOutputTokens: 4000,
        },
        systemInstruction: `You are Gojo.nerd, an elite academic mind powered by the Six Eyes.
Your mission is to perform a rigorous, end-to-end scan of the entire uploaded study material across all slides and pages.

NON-NEGOTIABLE QUANTITY & COVERAGE REQUIREMENTS:
1. NEVER output only 3 or 5 questions. The student expects a full, comprehensive diagnostic examination. You MUST output 12 to 15 multiple choice questions (or at least 10 for short notes).
2. Sample questions evenly across the entire slide deck / document:
   - Early questions must test foundational principles from the opening slides.
   - Middle questions must test central mechanisms, pathways, formulas, or derivations from the core slides.
   - Concluding questions must test advanced implications, applications, and conclusions from the later slides.
3. In question stems or critiques, reference the specific mechanism, concept, or slide context so students understand exactly where it was tested.
4. Generate 15 to 20 flashcards covering key terms, definitions, formulas, and mechanisms spanning the entire presentation.
5. Generate 5 to 7 high-yield takeaways (pillars) summarizing the core structural pillars of the presentation.
6. Generate 15 to 20 key vocabulary/nomenclature terms.
7. Include 1 sharp Professor Trap Warning isolating confusing terminology, inverse relationships, or trick exceptions professors test on multiple choice.

Output must strictly match this JSON schema:
{
  "extractedText": "Brief 2-3 paragraph summary/transcription of the scanned slides.",
  "takeaways": [
    { "num": "01", "concept": "Short Concept Name", "desc": "1-2 sentence core mechanism." }
  ],
  "terms": ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5", "Term 6", "Term 7", "Term 8"],
  "trap": "Direct 1-2 sentence warning about the primary trap professors use on this topic.",
  "questions": [
    {
      "q": "Sharp conceptual question spanning a specific slide or concept?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Direct explanation of why the correct answer is true and why wrong options fail.",
      "accolade": "Short confirmation of mastery."
    }
  ],
  "cards": [
    { "term": "Key Term or Concept", "def": "Clear 1-2 sentence definition or mechanism from that slide." }
  ]
}`,
      },
      async (model) => {
        const result = await model.generateContent(promptParts);
        return parseJsonSafe(result.response.text());
      }
    );

    const finalExtractedText =
      contentToAnalyze ||
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
      { error: error.message || "Failed to analyze document." },
      { status: 500 }
    );
  }
}
