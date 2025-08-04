import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  EMAIL_SERVER_HOST: z.string().min(1),
  EMAIL_SERVER_PORT: z.coerce.number(),
  EMAIL_SERVER_USER: z.string().min(1),
  EMAIL_SERVER_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().email(),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error('❌ Invalid environment variables:', env.error.format());
  throw new Error('Invalid environment variables');
}

export default env.data;