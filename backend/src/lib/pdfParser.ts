import { LlamaParseReader } from "llama-cloud-services";
import fs from "fs";

// Interface for the data we expect back from parsing
export interface PdfChunk {
  text: string;
  pageNumber: number;
}

export async function parsePdf(filePath: string): Promise<PdfChunk[]> {
  // set up the llamaparse reader
  const parser = new LlamaParseReader({ resultType: "markdown" });

  try {
    const documents = await parser.loadData(filePath);
    if (!documents || documents.length === 0) {
      throw new Error("LlamaParse failed to return any documents.");
    }

    return documents.map((doc) => ({
      text: doc.text,
      pageNumber: parseInt(doc.metadata?.page_label, 10) || 0,
    }));
  } catch (error) {
    console.error("Error parsing PDF with LlamaParse:", error);
    throw new Error("Failed to parse the PDF file.");
  } finally {
    // Clean up the uploaded file after parsing
    fs.unlinkSync(filePath);
  }
}
