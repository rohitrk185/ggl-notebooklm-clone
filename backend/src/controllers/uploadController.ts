import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { parsePdf } from "../lib/pdfParser";
import { processAndStoreChunks } from "../services/embeddingService";
import { validatePdfFile, cleanupFile } from "../utils/fileValidation";
import { UploadResponseBody, ErrorResponseBody } from "../types";


// Handles PDF upload and processing
export async function uploadPdf(req: Request, res: Response): Promise<void> {
  let filePath: string | null = null;

  try {
    // Validate file
    const validation = validatePdfFile(req.file);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error } as ErrorResponseBody);
      return;
    }

    filePath = req.file!.path;
    const documentId: string = uuidv4();
    const fileName = req.file!.originalname;

    console.log(`[${documentId}] Starting processing for: ${fileName}`);
    console.log(`[${documentId}] File size: ${(req.file!.size / 1024 / 1024).toFixed(2)}MB`);

    // Parse PDF
    console.log(`[${documentId}] Parsing PDF...`);
    const chunks = await parsePdf(filePath);
    
    if (!chunks || chunks.length === 0) {
      throw new Error("No content could be extracted from the PDF.");
    }

    console.log(`[${documentId}] PDF parsed into ${chunks.length} chunks.`);

    // Embed and Store in Pinecone
    console.log(`[${documentId}] Starting embedding and storage process...`);
    await processAndStoreChunks(chunks, documentId);

    console.log(`[${documentId}] Processing complete successfully.`);
    
    const response: UploadResponseBody = {
      documentId,
      fileName,
      chunksProcessed: chunks.length,
      message: "PDF processed successfully",
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error("Error in uploadPdf:", error);

    // Clean up file
    if (filePath) {
      cleanupFile(filePath);
    }

    const statusCode = error.message?.includes("parse") ? 422 : 500;
    const errorMessage = error.message || "Failed to process PDF.";

    const errorResponse: ErrorResponseBody = {
      error: "PDF processing failed",
      details: errorMessage,
      timestamp: new Date().toISOString(),
    };
    
    res.status(statusCode).json(errorResponse);
  }
}

