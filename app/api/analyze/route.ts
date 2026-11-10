import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Force Node.js runtime instead of Edge to support buffer parsing
export const runtime = "nodejs";

const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // Dynamically import pdf-parse to prevent route boot crashes
  const pdfParseMod: any = await import("pdf-parse");
  if (typeof pdfParseMod.default === "function") {
    const pdfData = await pdfParseMod.default(buffer);
    return pdfData?.text || "";
  }
  if (typeof pdfParseMod === "function") {
    const pdfData = await pdfParseMod(buffer);
    return pdfData?.text || "";
  }
  if (typeof pdfParseMod.PDFParse === "function") {
    const parser = new pdfParseMod.PDFParse({ data: buffer });
    try {
      const pdfData = await parser.getText();
      return pdfData?.text || "";
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy().catch(() => {});
      }
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string | null;

    let contentToAnalyze = "";

    // 1. Text extraction
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const isPdf =
        file.type === "application/pdf" ||
        (file.name || "").toLowerCase().endsWith(".pdf") ||
        buffer.slice(0, 4).toString("ascii") === "%PDF";

      if (isPdf) {
        contentToAnalyze = await extractTextFromPdfBuffer(buffer);
      } else {
        contentToAnalyze = buffer.toString("utf-8");
      }
    } else if (rawText && rawText.trim().length > 0) {
      contentToAnalyze = rawText;
    } else {
      return NextResponse.json(
        { success: false, error: "Please upload a document or paste notes." },
        { status: 400 }
      );
    }

    if (!contentToAnalyze || !contentToAnalyze.trim()) {
      return NextResponse.json(
        { success: false, error: "Could not extract readable text from the file." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is missing in your environment variables." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const systemInstruction = `You are an elite academic curriculum architect.
Analyze the provided lecture notes and output strict structured JSON matching this schema:
{
  "takeaways": [
    { "num": "01", "concept": "Core Mechanism Name", "desc": "Detailed functional explanation." }
  ],
  "terms": ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5"],
  "trap": "Direct, 2-sentence breakdown of the specific exam trap professors set on this material.",
  "cards": [
    { "term": "Term or Principle", "def": "Operational definition and exam hook." }
  ],
  "questions": [
    {
      "q": "Conceptual multiple-choice question testing the core mechanism?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Why the wrong options fail.",
      "accolade": "Confirmation of correct mechanism."
    }
  ]
}`;

    const prompt = `Synthesize this lecture content into high-yield exam material:\n\n"""\n${contentToAnalyze.slice(0, 75000)}\n"""`;

    // 2. Query Gemini Flash with strict JSON output
    let responseText = "";
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
          systemInstruction,
        });
        const result = await model.generateContent(prompt);
        responseText = result.response.text();
        if (responseText) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to generate response from Gemini.");
    }

    // Strip accidental markdown backticks if returned
    const cleanJsonString = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsedData = JSON.parse(cleanJsonString);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An error occurred while analyzing the document." },
      { status: 500 }
    );
  }
}
