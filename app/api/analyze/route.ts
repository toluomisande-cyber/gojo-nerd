import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const CANDIDATE_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'];

async function executeWithModelFallback(config: any, operation: (model: any) => Promise<any>) {
  let lastError: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ ...config, model: modelName });
      return await operation(model);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed (${err.message?.slice(0, 70)}). Trying next candidate...`);
    }
  }
  throw lastError;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawText = formData.get("text") as string | null;

    let contentToAnalyze = "";

    // 1. Extract content from either PDF or pasted text
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfData = await pdfParse(buffer);
      contentToAnalyze = pdfData.text;
    } else if (rawText && rawText.trim().length > 0) {
      contentToAnalyze = rawText;
    } else {
      return NextResponse.json(
        { error: "Please upload a PDF or paste notes." },
        { status: 400 }
      );
    }

    if (!contentToAnalyze.trim()) {
      return NextResponse.json(
        { error: "Could not extract readable text from document." },
        { status: 400 }
      );
    }

    const prompt = `Analyze this study material and produce 3 takeaways, 5 key terms, 1 professor trap, and 3 multiple choice questions:\n\n"""\n${contentToAnalyze.slice(0, 80000)}\n"""`;

    // 2. Execute with candidate model fallback
    const parsedData = await executeWithModelFallback({
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
      systemInstruction: `You are Gojo.nerd, an elite academic mind powered by the Six Eyes.
Your mission is to isolate non-negotiable core concepts, spot deceptive exam traps set by professors, and build high-yield diagnostic questions.

CRITICAL RULES:
1. Ground strictly in the provided text. Never hallucinate facts outside the material.
2. The "trap" must pinpoint the exact nuance, confusing terminology, or counter-intuitive detail professors test on multiple choice.
3. Keep takeaways concise and mechanism-focused.

Output must strictly match this JSON schema:
{
  "takeaways": [
    { "num": "01", "concept": "Short Concept Name", "desc": "1-2 sentence core mechanism." }
  ],
  "terms": ["Term 1", "Term 2", "Term 3", "Term 4", "Term 5"],
  "trap": "Direct 1-2 sentence warning about the primary trap professors use on this topic.",
  "questions": [
    {
      "q": "Sharp conceptual question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "critique": "Direct, witty explanation of why the wrong options fail.",
      "accolade": "Short praise confirming mastery of the concept."
    }
  ]
}`,
    }, async (model) => {
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    });

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Analysis Pipeline Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze document." },
      { status: 500 }
    );
  }
}

