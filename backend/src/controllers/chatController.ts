import { Request, Response } from "express";
import { geminiProModel, geminiFlashModel } from "../config/gemini";
import { pineconeIndex } from "../config/pinecone";
import { embedQuery } from "../services/embeddingService";
import { generateChatPrompt } from "../prompts/chatPrompt";
import { 
  ChatRequestBody, 
  ChatResponseBody, 
  ErrorResponseBody,
  StreamChunkResponse,
  StreamDoneResponse,
  StreamErrorResponse
} from "../types";

// Helper function to extract page citations from answer text
function extractCitationsFromAnswer(answerText: string): number[] {
  const pageRegex = /\(Page\s+(\d+)\)|Page\s+(\d+)/gi;
  const citations = new Set<number>();
  let match;

  while ((match = pageRegex.exec(answerText)) !== null) {
    const pageNumber = parseInt(match[1] || match[2], 10);
    if (!isNaN(pageNumber)) {
      citations.add(pageNumber);
    }
  }

  return Array.from(citations).sort((a, b) => a - b);
}


// Helper function to generate content with retry logic
async function generateWithRetry(prompt: string): Promise<string> {
  const maxRetries = 2;
  
  // Try with Pro model first
  try {
    console.log("Attempting with gemini-2.5-pro...");
    const result = await geminiProModel.generateContent(prompt);
    const answer = result.response.text();
    console.log("Success with gemini-2.5-pro");
    return answer;
  } catch (proError) {
    console.error("Error with gemini-2.5-pro:", proError);
    
    // Retry with Flash model
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Retry ${attempt}/${maxRetries} with gemini-2.5-flash...`);
        const result = await geminiFlashModel.generateContent(prompt);
        const answer = result.response.text();
        console.log(`Success with gemini-2.5-flash on attempt ${attempt}`);
        return answer;
      } catch (flashError) {
        console.error(`Error with gemini-2.5-flash (attempt ${attempt}):`, flashError);
        if (attempt === maxRetries) {
          throw flashError;
        }
      }
    }
    throw new Error("All retry attempts failed");
  }
}

// Helper function to generate streaming content with retry logic
async function generateStreamWithRetry(prompt: string, res: Response, documentId: string) {
  const maxRetries = 2;
  
  // Try with Pro model first
  try {
    console.log(`[${documentId}] Attempting streaming with gemini-2.5-pro...`);
    const result = await geminiProModel.generateContentStream(prompt);
    console.log(`[${documentId}] Success with gemini-2.5-pro`);
    return result;
  } catch (proError) {
    console.error(`[${documentId}] Error with gemini-2.5-pro:`, proError);
    
    // Retry with Flash model
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${documentId}] Retry ${attempt}/${maxRetries} with gemini-2.5-flash...`);
        const result = await geminiFlashModel.generateContentStream(prompt);
        console.log(`[${documentId}] Success with gemini-2.5-flash on attempt ${attempt}`);
        return result;
      } catch (flashError) {
        console.error(`[${documentId}] Error with gemini-2.5-flash (attempt ${attempt}):`, flashError);
        if (attempt === maxRetries) {
          throw flashError;
        }
      }
    }
    throw new Error("All retry attempts failed");
  }
}

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

    const prompt = generateChatPrompt(context, question);

    console.log(`[${documentId}] Generating answer with Gemini (with retry)...`);
    const answer = await generateWithRetry(prompt);

    // Extract only citations that were actually used in the answer
    const usedCitations = extractCitationsFromAnswer(answer);

    const responseBody: ChatResponseBody = {
      answer,
      citations: usedCitations,
    };
    
    console.log(`[${documentId}] Response generated successfully with ${usedCitations.length} citations.`);
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


//Handles streaming chat requests with RAG
export async function chatStream(req: Request, res: Response): Promise<void> {
  try {
    const { question, documentId } = req.body as ChatRequestBody;

    // Validate input
    if (!question || !documentId) {
      res.status(400).json({ 
        error: 'Missing "question" or "documentId".' 
      } as ErrorResponseBody);
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Embed Query
    console.log(`[${documentId}] Embedding query (streaming): "${question}"`);
    const queryVector = await embedQuery(question);

    // Retrieve from Pinecone
    console.log(`[${documentId}] Querying Pinecone (streaming)...`);
    const queryResponse = await pineconeIndex.query({
      vector: queryVector,
      topK: 5,
      filter: {
        documentId: { $eq: documentId },
      },
      includeMetadata: true,
    });

    console.log(`[${documentId}] Found ${queryResponse.matches.length} relevant chunks (streaming).`);

    // Augment & Generate
    const context = queryResponse.matches
      .map(
        (match) =>
          `Page ${match.metadata?.pageNumber}: "${match.metadata?.text}"`
      )
      .join("\n\n");

    const prompt = generateChatPrompt(context, question);

    console.log(`[${documentId}] Streaming answer with Gemini (with retry)...`);
    
    // Stream the response with retry logic
    const result = await generateStreamWithRetry(prompt, res, documentId);
    
    // Accumulate the full answer text to extract citations
    let fullAnswerText = "";
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullAnswerText += chunkText;
      
      const chunkResponse: StreamChunkResponse = {
        type: "chunk",
        text: chunkText,
      };
      res.write(`data: ${JSON.stringify(chunkResponse)}\n\n`);
    }

    // Extract only citations that were actually used in the answer
    const usedCitations = extractCitationsFromAnswer(fullAnswerText);

    const doneResponse: StreamDoneResponse = {
      type: "done",
      citations: usedCitations,
    };
    res.write(`data: ${JSON.stringify(doneResponse)}\n\n`);
    
    console.log(`[${documentId}] Streaming complete with ${usedCitations.length} citations.`);
    res.end();
  } catch (error: any) {
    console.error("Error in chatStream:", error);
    
    const errorResponse: StreamErrorResponse = {
      type: "error",
      error: "Failed to stream answer.",
      details: error.message,
    };
    
    res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
}

