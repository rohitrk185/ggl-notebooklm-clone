import { PineconeRecord } from "@pinecone-database/pinecone";
import { TaskType } from "@google/generative-ai";
import { embeddingModel } from "../config/gemini";
import { pineconeIndex, PineconeMetadata } from "../config/pinecone";
import { PdfChunk } from "../lib/pdfParser";


// Embeds a batch of PDF chunks and returns vectors
// Uses individual embedContent calls for free tier compatibility
export async function embedChunkBatch(
  batch: PdfChunk[],
  documentId: string,
  batchStartIndex: number
): Promise<PineconeRecord<PineconeMetadata>[]> {
  const vectors: PineconeRecord<PineconeMetadata>[] = [];

  for (let j = 0; j < batch.length; j++) {
    const chunk = batch[j];
    
    try {
      const embedding = await embeddingModel.embedContent({
        content: { parts: [{ text: chunk.text }], role: "user" },
        taskType: "RETRIEVAL_DOCUMENT" as TaskType,
      });

      vectors.push({
        id: `${documentId}-chunk-${batchStartIndex + j}`,
        values: embedding.embedding.values,
        metadata: {
          documentId: documentId,
          text: chunk.text,
          pageNumber: chunk.pageNumber,
        },
      });
    } catch (error) {
      console.error(`[${documentId}] Error embedding chunk ${batchStartIndex + j}:`, error);
      throw error;
    }
  }

  return vectors;
}


// Processes PDF chunks in batches and stores them in Pinecone
export async function processAndStoreChunks(
  chunks: PdfChunk[],
  documentId: string,
  batchSize: number = 100
): Promise<void> {
  const totalBatches = Math.ceil(chunks.length / batchSize);
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const currentBatch = Math.floor(i / batchSize) + 1;
    const batch: PdfChunk[] = chunks.slice(i, i + batchSize);

    console.log(
      `[${documentId}] Processing batch ${currentBatch}/${totalBatches} (${batch.length} chunks)...`
    );

    try {
      const vectors = await embedChunkBatch(batch, documentId, i);
      await pineconeIndex.upsert(vectors);
      
      console.log(
        `[${documentId}] Batch ${currentBatch}/${totalBatches} completed successfully.`
      );
    } catch (error) {
      console.error(`[${documentId}] Error processing batch ${currentBatch}:`, error);
      throw new Error(`Failed to process batch ${currentBatch}: ${error}`);
    }
  }
}


// Embeds a query string for retrieval
export async function embedQuery(question: string): Promise<number[]> {
  const queryEmbedding = await embeddingModel.embedContent({
    content: { parts: [{ text: question }], role: "user" },
    taskType: "RETRIEVAL_QUERY" as TaskType,
  });

  return queryEmbedding.embedding.values;
}

