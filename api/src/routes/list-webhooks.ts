import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const listWebhooks: FastifyPluginAsyncZod = async (app) => {
	app.get(
		'/api/webhooks',
		{
			schema: {
				summary: 'List Webhooks',
				tags: ['Webhooks'],
				querystring: z.object({
					limit: z.number().min(1).max(100).default(20),
					offset: z.number().min(0).optional().default(0),
				}),
				response: {
					200: z.array(
						z.object({
							id: z.uuid(),
							method: z.string(),
						}),
					),
				},
			},
		},
		async (request, reply) => {
			const { limit, offset } = request.query

			return reply.send([
				{ id: '123e4567-e89b-12d3-a456-426614174000', method: 'POST' },
				{ id: '123e4567-e89b-12d3-a456-426614174001', method: 'GET' },
			])
		},
	)
}
