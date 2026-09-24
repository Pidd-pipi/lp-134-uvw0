const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: toNumber(process.env.PORT, 3234),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8234',
  jwtSecret: process.env.JWT_SECRET || 'mental_health_platform_secure_jwt_secret_key_2024',
  crisisHotline: process.env.CRISIS_HOTLINE || '400-161-9995',
  crisisHotlineBackup: process.env.CRISIS_HOTLINE_BACKUP || '010-82951332',
};
