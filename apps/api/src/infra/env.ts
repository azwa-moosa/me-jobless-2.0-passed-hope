import { resolve } from 'node:path';
import { config } from 'dotenv';
import { z } from 'zod';

config({ path: resolve(__dirname, '../../../../.env') });

const schema = z.object({
  PLATFORM_ENV: z.enum(['dev', 'uat', 'prod']),
  MOCK_IDP_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  DATABASE_URL: z.string().url(),
  DEV_JWT_SECRET: z.string().min(32).optional(),
  ENTRA_TENANT_ID: z.string().optional().transform((v) => v || undefined),
  ENTRA_API_AUDIENCE: z.string().optional().transform((v) => v || undefined),
  FIELD_ENCRYPTION_KEY: z.string().min(40),
  API_PORT: z.coerce.number().default(4000),
});

export type Env = z.infer<typeof schema>;

/** Typed, validated config with environment safety switches (PLT-001, PLT-006, D3). Fails fast. */
export function loadEnv(raw: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const env = parsed.data;
  if (env.MOCK_IDP_ENABLED && env.PLATFORM_ENV !== 'dev') {
    throw new Error(`Refusing to boot: mock IdP is enabled in PLATFORM_ENV=${env.PLATFORM_ENV}. Mock login is DEV-only.`);
  }
  if (env.MOCK_IDP_ENABLED && !env.DEV_JWT_SECRET) throw new Error('DEV_JWT_SECRET is required when MOCK_IDP_ENABLED=true');
  if (env.PLATFORM_ENV !== 'dev' && !env.ENTRA_TENANT_ID) throw new Error('ENTRA_TENANT_ID is required outside dev');
  return env;
}

export const ENV = Symbol('ENV');
