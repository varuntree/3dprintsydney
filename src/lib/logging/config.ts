const LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LEVELS)[number];

const parseLogLevel = (value?: string): LogLevel => {
  if (!value) return "info";
  const normalized = value.toLowerCase().trim() as LogLevel;
  if (LEVELS.includes(normalized)) {
    return normalized;
  }
  return "info";
};

const serverLogLevel = parseLogLevel(process.env.LOG_LEVEL);
const frontendLogLevel = parseLogLevel(process.env.NEXT_PUBLIC_LOG_LEVEL ?? process.env.LOG_LEVEL);

export const featureFlags = {
  dbLoggingEnabled: process.env.ENABLE_DB_LOGGING === "true",
  requestLoggingEnabled: process.env.ENABLE_REQUEST_LOGGING === "true",
};

export const logConfig = {
  level: serverLogLevel,
  frontendLevel: frontendLogLevel,
};

export function shouldLog(level: LogLevel): boolean {
  const currentIndex = LEVELS.indexOf(logConfig.level);
  const levelIndex = LEVELS.indexOf(level);
  return levelIndex >= currentIndex;
}

export function shouldLogInBrowser(level: LogLevel): boolean {
  const currentIndex = LEVELS.indexOf(logConfig.frontendLevel);
  const levelIndex = LEVELS.indexOf(level);
  return levelIndex >= currentIndex;
}

export function getServerLogLevel(): LogLevel {
  return logConfig.level;
}

export function getFrontendLogLevel(): LogLevel {
  return logConfig.frontendLevel;
}
