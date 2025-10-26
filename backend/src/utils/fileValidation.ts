import fs from "fs";
import { ValidationResult } from "../types";

/**
 * Validates the uploaded file
 */
export function validatePdfFile(file: Express.Multer.File | undefined): ValidationResult {
  if (!file) {
    return { valid: false, error: "No file uploaded." };
  }

  // Check file type
  const allowedMimeTypes = ["application/pdf"];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: "Invalid file type. Only PDF files are allowed." };
  }

  // Check file size (e.g., max 50MB)
  const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSizeInBytes) {
    return { valid: false, error: "File size exceeds the maximum allowed size of 50MB." };
  }

  return { valid: true };
}

/**
 * Cleans up temporary file
 */
export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Failed to cleanup file ${filePath}:`, error);
  }
}

