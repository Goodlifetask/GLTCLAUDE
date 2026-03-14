import winston from 'winston';
import { env } from './env';

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'development'
      ? winston.format.colorize()
      : winston.format.json(),
    env.NODE_ENV === 'development'
      ? winston.format.simple()
      : winston.format.json(),
  ),
  defaultMeta: { service: 'glt-api' },
  transports: [
    new winston.transports.Console(),
  ],
});

// Request logger helper
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
