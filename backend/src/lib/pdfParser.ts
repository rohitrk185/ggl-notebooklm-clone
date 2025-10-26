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

    return documents.map((doc, index) => {
      // Try multiple possible metadata fields for page number
      let pageNumber = index + 1; // Default to index-based (1-indexed)
      
      if (doc.metadata) {
        // Try different common field names
        const possiblePageNumber = 
          doc.metadata.page_number || 
          doc.metadata.page || 
          doc.metadata.page_label;
        
        if (possiblePageNumber) {
          const parsed = parseInt(possiblePageNumber, 10);
          if (!isNaN(parsed) && parsed > 0) {
            pageNumber = parsed;
          }
        }
      }

      console.log(`Parsed chunk ${index}: page ${pageNumber}, text length: ${doc.text?.length || 0}`);

      return {
        text: doc.text,
        pageNumber: pageNumber,
      };
    });
  } catch (error) {
    console.error("Error parsing PDF with LlamaParse:", error);
    throw new Error("Failed to parse the PDF file.");
  } finally {
    // Clean up the uploaded file after parsing
    fs.unlinkSync(filePath);
  }
}
