/**
 * Structured Logger using Pino
 * Includes request ID and tenant context tracking
 */

import pino from 'pino';
import dotenv from 'dotenv';

dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
const prettyPrint = process.env.LOG_PRETTY === 'true' || isDev;

// Create base logger
const baseLogger = pino({
    level: logLevel,
    ...(prettyPrint && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        },
    }),
    base: {
        service: 'ltech-multi-agent',
        version: '2.0.0',
    },
});

/**
 * Create child logger with context
 * @param {Object} context - Context to include in logs
 * @returns {pino.Logger}
 */
export function createLogger(context = {}) {
    return baseLogger.child(context);
}

/**
 * Create request-scoped logger
 * @param {string} requestId - Unique request ID
 * @param {Object} userContext - User and tenant info
 * @returns {pino.Logger}
 */
export function createRequestLogger(requestId, userContext = {}) {
    return baseLogger.child({
        requestId,
        userId: userContext.userId,
        username: userContext.username,
        tenant: userContext.tenantSchema,
        roles: userContext.roles,
    });
}

/**
 * Log levels for convenience
 */
export const logger = {
    debug: (msg, obj) => baseLogger.debug(obj, msg),
    info: (msg, obj) => baseLogger.info(obj, msg),
    warn: (msg, obj) => baseLogger.warn(obj, msg),
    error: (msg, obj) => baseLogger.error(obj, msg),
    fatal: (msg, obj) => baseLogger.fatal(obj, msg),

    // Special loggers for specific domains
    db: createLogger({ component: 'database' }),
    llm: createLogger({ component: 'llm-client' }),
    auth: createLogger({ component: 'auth' }),
    agent: createLogger({ component: 'agent' }),
    tool: createLogger({ component: 'tool' }),
    ws: createLogger({ component: 'websocket' }),
};

export default logger;
