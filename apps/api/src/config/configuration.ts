export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';
  const demoModeRaw = process.env.DEMO_MODE;
  const demoMode =
    demoModeRaw != null
      ? demoModeRaw === 'true' || demoModeRaw === '1'
      : !isProd;

  const webOrigin =
    process.env.WEB_ORIGIN ??
    process.env.CORS_ORIGIN ??
    (isProd ? '' : 'http://localhost:5173');

  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    nodeEnv,
    isProd,
    webOrigin,
    corsOrigin: webOrigin,
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET ?? 'change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    aiProvider: process.env.AI_PROVIDER ?? 'mock',
    documentStoragePath: process.env.DOCUMENT_STORAGE_PATH,
    maxUploadBytes: parseInt(
      process.env.MAX_UPLOAD_BYTES ?? `${10 * 1024 * 1024}`,
      10,
    ),
    demoMode,
    throttle: {
      ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
      copilotLimit: parseInt(process.env.THROTTLE_COPILOT_LIMIT ?? '30', 10),
      intentLimit: parseInt(process.env.THROTTLE_INTENT_LIMIT ?? '40', 10),
    },
    copilot: {
      maxMessageLength: parseInt(
        process.env.COPILOT_MAX_MESSAGE_LENGTH ?? '2000',
        10,
      ),
      maxHistory: parseInt(process.env.COPILOT_MAX_HISTORY ?? '8', 10),
      maxKnowledgeChunks: parseInt(
        process.env.COPILOT_MAX_KNOWLEDGE_CHUNKS ?? '3',
        10,
      ),
      maxAnswerLength: parseInt(
        process.env.COPILOT_MAX_ANSWER_LENGTH ?? '2000',
        10,
      ),
      minKnowledgeScore: parseFloat(
        process.env.COPILOT_MIN_KNOWLEDGE_SCORE ?? '2',
      ),
    },
  };
};
