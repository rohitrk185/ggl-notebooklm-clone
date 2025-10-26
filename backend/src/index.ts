import "dotenv/config";
import express from "express";
import cors from "cors";

import uploadRoutes from "./routes/uploadRoutes";
import chatRoutes from "./routes/chatRoutes";

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", uploadRoutes);
app.use("/api", chatRoutes);

// Setup Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
