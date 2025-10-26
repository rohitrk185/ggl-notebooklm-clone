import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { uploadPdf } from "../controllers/uploadController";

const router = Router();

// File Upload Setup
const uploadsDir = "./uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// POST /api/upload - Upload and process PDF
router.post("/upload", upload.single("pdfFile"), uploadPdf);

export default router;

