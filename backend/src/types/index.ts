// Request/Response types
export interface ChatRequestBody {
  question: string;
  documentId: string;
}

export interface ChatResponseBody {
  answer: string;
  citations: number[];
}

export interface UploadResponseBody {
  documentId: string;
  fileName: string;
  chunksProcessed: number;
  message: string;
}

export interface ErrorResponseBody {
  error: string;
  details?: string;
  timestamp?: string;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

