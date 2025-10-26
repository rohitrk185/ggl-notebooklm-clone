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

// Streaming types
export interface StreamChunkResponse {
  type: "chunk";
  text: string;
}

export interface StreamDoneResponse {
  type: "done";
  citations: number[];
}

export interface StreamErrorResponse {
  type: "error";
  error: string;
  details?: string;
}

// Validation types
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

