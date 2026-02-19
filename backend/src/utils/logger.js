import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, runId, agent }) => {
  const prefix = [runId, agent].filter(Boolean).join(" | ");
  return `${timestamp} [${level}]${prefix ? ` (${prefix})` : ""} ${message}`;
});

export const logger = winston.createLogger({
  level: "debug",
  format: combine(timestamp({ format: "HH:mm:ss" }), logFormat),
  transports: [
    new winston.transports.Console({ format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat) }),
    new winston.transports.File({ filename: "agent.log", maxsize: 5_000_000, maxFiles: 3 }),
  ],
});

/** Create a child logger scoped to a specific run + agent */
export const createRunLogger = (runId, agentName) =>
  logger.child({ runId: runId.slice(0, 8), agent: agentName });
