import "dotenv/config";
import { Pinecone, RecordMetadata } from "@pinecone-database/pinecone";

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX;

if (!PINECONE_API_KEY || !PINECONE_INDEX) {
  throw new Error("Missing Pinecone environment variables in .env file");
}

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

// Define an interface for our vector metadata
export interface PineconeMetadata extends RecordMetadata {
  documentId: string;
  text: string;
  pageNumber: number;
}

// Export the index, typed with our metadata interface
export const pineconeIndex = pinecone.Index<PineconeMetadata>(PINECONE_INDEX);

