import { fastify } from 'fastify'

import {
	serializerCompiler,
	validatorCompiler,
	jsonSchemaTransform,
	type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { listWebhooks } from './routes/list-webhooks'
import { env } from './env'
import { getWebhook } from './routes/get-webhook'
import { deleteWebhook } from './routes/delete-webhook'
import { captureWebhook } from './routes/capture-webhook'
import { generateHandler } from './routes/generate-handler'

const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifyCors, {
	origin: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
	credentials: true,
})

app.register(fastifySwagger, {
	openapi: {
		info: {
			title: 'Webhook Inspector API',
			description: 'API documentation for the Webhook Inspector service',
			version: '1.0.0',
		},
	},
	transform: jsonSchemaTransform,
})

app.register(ScalarApiReference, {
	routePrefix: '/docs',
})

app.register(listWebhooks)
app.register(getWebhook)
app.register(deleteWebhook)
app.register(captureWebhook)
app.register(generateHandler)

app.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
	console.log('🔥 Server is running on http://localhost:3333')
	console.log('📚 Swagger docs available at http://localhost:3333/docs')
})
