import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure Node.js runtime and allocate max free-tier execution time (60s)
export const runtime = "nodejs";
export const maxDuration = 60;

const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string | null;

    let contentToAnalyze = "";

    // 1. Text Parsing
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const isPdf =
        file.type === "application/pdf" ||
        (file.name || "").toLowerCase().endsWith(".pdf") ||
        buffer.slice(0, 4).toString("ascii") === "%PDF";

      if (isPdf) {
        // pdf-parse-fork runs cleanly without missing test-fixture errors
        // @ts-ignore
        const pdfMod: any = await import("pdf-parse-fork");
        const pdf = pdfMod.default || pdfMod;
        const pdfData = await pdf(buffer);
        contentToAnalyze = pdfData.text;
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
        { success: false, error: "GEMINI_API_KEY missing from environment variables." },
        { status: 500 }
      );
    }

    // Trim text to avoid exceeding token limits or causing long response times
    const cleanContext = contentToAnalyze
      .replace(/\s+/g, " ")
      .slice(0, 30000);

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemInstruction = `You are an elite academic curriculum architect. 
Analyze the lecture notes and output strict structured JSON matching this schema:
{
  "takeaways": [
    { "num": "01", "concept": "Core Mechanism Name", "desc": "Detailed functional explanation." }
  ],
  "terms": ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5"],
  "trap": "Direct 2-sentence breakdown of the specific exam trap professors set on this material.",
  "cards": [
    { "term": "Term", "def": "Operational definition and exam hook." }
  ],
  "questions": [
    {
      "q": "Conceptual multiple-choice question testing the core mechanism?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Why wrong options fail.",
      "accolade": "Confirmation of correct mechanism."
    }
  ]
}`;

    const prompt = `Synthesize this lecture content into high-yield exam material:\n\n"""\n${cleanContext}\n"""`;

    // 2. Query Gemini
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

    const cleanJson = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return NextResponse.json({ success: true, data: JSON.parse(cleanJson) });
  } catch (error: any) {
    console.error("Vercel Function Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
