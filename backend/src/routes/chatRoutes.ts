import { Router } from "express";
import { chat, chatStream } from "../controllers/chatController";

const router = Router();

// POST /api/chat - Chat with RAG (non-streaming)
router.post("/chat", chat);

// POST /api/chat/stream - Chat with RAG (streaming)
router.post("/chat/stream", chatStream);

export default router;
