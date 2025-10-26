import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY in .env file");
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Gemini model for text generation
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// Embedding model for vector embeddings
export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

