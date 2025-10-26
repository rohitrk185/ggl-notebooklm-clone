import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY in .env file");
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Gemini Pro model for text generation (primary)
export const geminiProModel = genAI.getGenerativeModel({
  model: "gemini-2.5-pro",
});

// Gemini Flash model for text generation (fallback)
export const geminiFlashModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// Legacy export for backward compatibility
export const geminiModel = geminiProModel;

// Embedding model for vector embeddings
export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

