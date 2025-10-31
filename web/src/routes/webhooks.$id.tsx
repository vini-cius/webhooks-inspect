import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { WebhookDetails } from '../components/webhook-details'

export const Route = createFileRoute('/webhooks/$id')({
	component: RouteComponent,
})

function RouteComponent() {
	const { id } = Route.useParams()

	return (
		<Suspense fallback={<p className="p-4">Loading...</p>}>
			<WebhookDetails id={id} />
		</Suspense>
	)
}
