// Simple logger for Next.js environment
interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

const createLogger = (): Logger => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  const currentLevel = levels[logLevel as keyof typeof levels] || 1;

  return {
    debug: (message: string, ...args: any[]) => {
      if (currentLevel <= 0) {
        console.debug(`[DEBUG] ${message}`, ...args);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (currentLevel <= 1) {
        console.log(`[INFO] ${message}`, ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (currentLevel <= 2) {
        console.warn(`[WARN] ${message}`, ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (currentLevel <= 3) {
        console.error(`[ERROR] ${message}`, ...args);
      }
    },
  };
};

export const logger = createLogger();
