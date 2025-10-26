import { Router } from "express";
import { chat } from "../controllers/chatController";

const router = Router();

// POST /api/chat - Chat with RAG
router.post("/chat", chat);

export default router;
