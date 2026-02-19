import { logger } from "../utils/logger.js";

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set();

/**
 * Set up WebSocket server for real-time progress streaming.
 */
export function setupWebSocket(wss) {
  wss.on("connection", (ws) => {
    clients.add(ws);
    logger.info(`WS client connected (${clients.size} total)`);

    ws.on("close", () => {
      clients.delete(ws);
      logger.info(`WS client disconnected (${clients.size} total)`);
    });

    ws.on("error", (err) => {
      logger.error(`WS error: ${err.message}`);
      clients.delete(ws);
    });
  });
}

/**
 * Broadcast a progress event to all connected WS clients.
 *
 * @param {string} runId
 * @param {object} payload - { event, agent, message, data?, progress? }
 */
export function broadcast(runId, payload) {
  const message = JSON.stringify({ runId, timestamp: new Date().toISOString(), ...payload });
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}
