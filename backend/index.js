/**
 * ═══════════════════════════════════════════════════════════════════════
 *  PipelineSage — Autonomous DevOps Agent Backend
 *  RIFT 2026 Hackathon
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Setup:
 *    1. cp .env.example .env   — fill in GITHUB_TOKEN & OPENAI_API_KEY
 *    2. npm install
 *    3. npm start              — runs on http://localhost:3000
 *
 *  Endpoints:
 *    POST /api/run-agent       — body: { repoUrl, teamName, leaderName }
 *    GET  /api/results/:runId  — poll for run status & results
 *    WS   ws://localhost:3000  — real-time progress updates
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";

import { logger } from "./src/utils/logger.js";
import { errorHandler, notFoundHandler } from "./src/middlewares/errorHandler.js";
import agentRouter from "./src/routes/agent.js";
import { setupWebSocket } from "./src/ws/socket.js";

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ─── Express app ──────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Agent routes
app.use("/api", agentRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// ─── HTTP + WebSocket server ──────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

server.listen(PORT, () => {
  logger.info(`🚀 PipelineSage backend listening on http://localhost:${PORT}`);
});

export { wss };
