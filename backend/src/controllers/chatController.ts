import { Request, Response } from "express";
import { geminiModel } from "../config/gemini";
import { pineconeIndex } from "../config/pinecone";
import { embedQuery } from "../services/embeddingService";
import { ChatRequestBody, ChatResponseBody, ErrorResponseBody } from "../types";


//Handles chat requests with RAG
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { question, documentId } = req.body as ChatRequestBody;

    // Validate input
    if (!question || !documentId) {
      res.status(400).json({ 
        error: 'Missing "question" or "documentId".' 
      } as ErrorResponseBody);
      return;
    }

    // Embed Query
    console.log(`[${documentId}] Embedding query: "${question}"`);
    const queryVector = await embedQuery(question);

    // Retrieve from Pinecone
    console.log(`[${documentId}] Querying Pinecone...`);
    const queryResponse = await pineconeIndex.query({
      vector: queryVector,
      topK: 5,
      filter: {
        documentId: { $eq: documentId },
      },
      includeMetadata: true,
    });

    console.log(`[${documentId}] Found ${queryResponse.matches.length} relevant chunks.`);

    // Augment & Generate
    const context = queryResponse.matches
      .map(
        (match) =>
          `Page ${match.metadata?.pageNumber}: "${match.metadata?.text}"`
      )
      .join("\n\n");

    const prompt = `You are a helpful assistant. Answer the user's question based *only* on the following context retrieved from a PDF document. Provide citations from the text.

--- CONTEXT ---
${context}
--- END CONTEXT ---

QUESTION: ${question}

ANSWER:
`;

    console.log(`[${documentId}] Generating answer with Gemini...`);
    const result = await geminiModel.generateContent(prompt);
    const answer = result.response.text();

    // 4. Respond
    const rawCitations: number[] = queryResponse.matches.map(
      (match) => match.metadata!.pageNumber
    );
    const uniqueCitations: number[] = [...new Set(rawCitations)];
    const sortedCitations: number[] = uniqueCitations.sort((a, b) => a - b);

    const responseBody: ChatResponseBody = {
      answer,
      citations: sortedCitations,
    };
    
    console.log(`[${documentId}] Response generated successfully.`);
    res.status(200).json(responseBody);
  } catch (error: any) {
    console.error("Error in chat:", error);
    
    const errorResponse: ErrorResponseBody = {
      error: "Failed to get answer.",
      details: error.message,
    };
    
    res.status(500).json(errorResponse);
  }
}

