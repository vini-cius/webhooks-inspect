import { WebhooksListItem } from './webhooks-list-item'

export function WebhooksList() {
	return (
		<div className="flex-1 overflow-y-auto">
			<div className="p-2 space-y-1">
				<WebhooksListItem />
				<WebhooksListItem />
				<WebhooksListItem />
				<WebhooksListItem />
				<WebhooksListItem />
			</div>
		</div>
	)
}
