import { z } from 'zod'

const envSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'test', 'production'])
		.default('development'),
	PORT: z.coerce.number().default(3333),
	DATABASE_URL: z.url(),
})

export const env = envSchema.parse(process.env)
