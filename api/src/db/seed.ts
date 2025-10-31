import { faker } from '@faker-js/faker'
import { db } from '@/db'
import { webhooks } from '@/db/schema'

type NewWebhook = typeof webhooks.$inferInsert

const STRIPE_EVENT_TYPES = [
	'payment_intent.created',
	'payment_intent.processing',
	'payment_intent.succeeded',
	'payment_intent.payment_failed',
	'payment_intent.canceled',
	'charge.succeeded',
	'charge.pending',
	'charge.failed',
	'charge.refunded',
	'invoice.created',
	'invoice.finalized',
	'invoice.payment_succeeded',
	'invoice.payment_failed',
	'invoice.paid',
	'invoice.marked_uncollectible',
	'invoice.voided',
	'invoice.payment_action_required',
	'customer.created',
	'customer.updated',
	'customer.deleted',
	'customer.subscription.created',
	'customer.subscription.updated',
	'customer.subscription.deleted',
	'checkout.session.completed',
	'checkout.session.expired',
	'payment_method.attached',
	'payment_method.detached',
	'setup_intent.created',
	'setup_intent.succeeded',
	'setup_intent.requires_action',
	'payout.paid',
	'payout.failed',
	'refund.created',
	'refund.updated',
	'dispute.created',
	'dispute.closed',
	'balance.available',
] as const

type StripeEventType = (typeof STRIPE_EVENT_TYPES)[number]
type EventObjectKey =
	| 'payment_intent'
	| 'charge'
	| 'invoice'
	| 'customer'
	| 'subscription'
	| 'checkout_session'
	| 'payment_method'
	| 'setup_intent'
	| 'payout'
	| 'refund'
	| 'dispute'
	| 'balance'

const EVENT_TYPE_TO_OBJECT: Record<StripeEventType, EventObjectKey> = {
	'payment_intent.created': 'payment_intent',
	'payment_intent.processing': 'payment_intent',
	'payment_intent.succeeded': 'payment_intent',
	'payment_intent.payment_failed': 'payment_intent',
	'payment_intent.canceled': 'payment_intent',
	'charge.succeeded': 'charge',
	'charge.pending': 'charge',
	'charge.failed': 'charge',
	'charge.refunded': 'charge',
	'invoice.created': 'invoice',
	'invoice.finalized': 'invoice',
	'invoice.payment_succeeded': 'invoice',
	'invoice.payment_failed': 'invoice',
	'invoice.paid': 'invoice',
	'invoice.marked_uncollectible': 'invoice',
	'invoice.voided': 'invoice',
	'invoice.payment_action_required': 'invoice',
	'customer.created': 'customer',
	'customer.updated': 'customer',
	'customer.deleted': 'customer',
	'customer.subscription.created': 'subscription',
	'customer.subscription.updated': 'subscription',
	'customer.subscription.deleted': 'subscription',
	'checkout.session.completed': 'checkout_session',
	'checkout.session.expired': 'checkout_session',
	'payment_method.attached': 'payment_method',
	'payment_method.detached': 'payment_method',
	'setup_intent.created': 'setup_intent',
	'setup_intent.succeeded': 'setup_intent',
	'setup_intent.requires_action': 'setup_intent',
	'payout.paid': 'payout',
	'payout.failed': 'payout',
	'refund.created': 'refund',
	'refund.updated': 'refund',
	'dispute.created': 'dispute',
	'dispute.closed': 'dispute',
	'balance.available': 'balance',
}

const CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'brl'] as const

function generateIpAddress() {
	return Array.from({ length: 4 }, () =>
		faker.number.int({ min: 1, max: 254 }),
	).join('.')
}

const EVENT_OBJECT_BUILDERS: Record<
	EventObjectKey,
	(eventType: StripeEventType, occurredAt: Date) => Record<string, unknown>
> = {
	payment_intent: (eventType, occurredAt) => {
		const id = `pi_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
		const amount = faker.number.int({ min: 1000, max: 100_000 })
		const currency = faker.helpers.arrayElement(CURRENCIES)
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'payment_intent.created': 'requires_confirmation',
			'payment_intent.processing': 'processing',
			'payment_intent.succeeded': 'succeeded',
			'payment_intent.payment_failed': 'requires_payment_method',
			'payment_intent.canceled': 'canceled',
		}
		const status = statusMap[eventType] ?? 'requires_confirmation'
		const amountReceived =
			status === 'succeeded'
				? amount
				: status === 'processing'
					? Math.floor(amount * 0.7)
					: 0

		const lastPaymentError =
			status === 'requires_payment_method' || status === 'canceled'
				? {
						code: 'card_declined',
						decline_code: 'insufficient_funds',
						message: faker.finance.transactionDescription(),
						type: 'card_error',
					}
				: null

		return {
			id,
			object: 'payment_intent',
			amount,
			amount_capturable: Math.max(amount - amountReceived, 0),
			amount_received: amountReceived,
			application_fee_amount: null,
			capture_method: 'automatic',
			client_secret: `${id}_secret_${faker.string.alphanumeric({ length: 20, casing: 'lower' })}`,
			confirmation_method: 'automatic',
			created: Math.floor(occurredAt.getTime() / 1000),
			currency,
			customer: `cus_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`,
			description: faker.commerce.productDescription(),
			invoice: `in_${faker.string.alphanumeric({ length: 18, casing: 'lower' })}`,
			metadata: {
				order_id: `order_${faker.string.alphanumeric({ length: 10, casing: 'lower' })}`,
			},
			payment_method: `pm_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			receipt_email: faker.internet.email(),
			setup_future_usage: faker.helpers.arrayElement([
				null,
				'on_session',
				'off_session',
			]),
			status,
			last_payment_error: lastPaymentError,
		}
	},
	charge: (eventType, occurredAt) => {
		const id = `ch_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
		const amount = faker.number.int({ min: 1000, max: 80_000 })
		const currency = faker.helpers.arrayElement(CURRENCIES)
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'charge.succeeded': 'succeeded',
			'charge.pending': 'pending',
			'charge.failed': 'failed',
			'charge.refunded': 'succeeded',
		}
		const status = statusMap[eventType] ?? 'succeeded'
		const refunded = eventType === 'charge.refunded'

		return {
			id,
			object: 'charge',
			amount,
			amount_captured: status === 'succeeded' ? amount : 0,
			amount_refunded: refunded ? amount : 0,
			balance_transaction: `txn_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			billing_details: {
				email: faker.internet.email(),
				name: faker.person.fullName(),
			},
			calculated_statement_descriptor: faker.company.name(),
			captured: status === 'succeeded',
			created: Math.floor(occurredAt.getTime() / 1000),
			currency,
			customer: `cus_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`,
			description: faker.commerce.productDescription(),
			failure_code: status === 'failed' ? 'card_declined' : null,
			failure_message:
				status === 'failed' ? faker.finance.transactionDescription() : null,
			outcome: {
				network_status:
					status === 'failed' ? 'declined_by_network' : 'approved_by_network',
				risk_level: faker.helpers.arrayElement(['low', 'normal', 'elevated']),
				seller_message:
					status === 'failed' ? 'Payment declined' : 'Payment complete.',
				type: status === 'failed' ? 'issuer_declined' : 'authorized',
			},
			paid: status !== 'failed',
			receipt_email: faker.internet.email(),
			receipt_url: faker.internet.url(),
			refunded,
			status,
		}
	},
	invoice: (eventType, occurredAt) => {
		const id = `in_${faker.string.alphanumeric({ length: 18, casing: 'lower' })}`
		const amountDue = faker.number.int({ min: 2000, max: 150_000 })
		const currency = faker.helpers.arrayElement(CURRENCIES)
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'invoice.created': 'draft',
			'invoice.finalized': 'open',
			'invoice.payment_succeeded': 'paid',
			'invoice.payment_failed': 'open',
			'invoice.paid': 'paid',
			'invoice.marked_uncollectible': 'uncollectible',
			'invoice.voided': 'void',
			'invoice.payment_action_required': 'open',
		}
		const status = statusMap[eventType] ?? 'open'
		const customerId = `cus_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`

		return {
			id,
			object: 'invoice',
			account_country: faker.helpers.arrayElement([
				'US',
				'GB',
				'BR',
				'CA',
				'AU',
				'DE',
			]),
			account_name: faker.company.name(),
			amount_due: amountDue,
			amount_paid: ['paid'].includes(status) ? amountDue : 0,
			created: Math.floor(occurredAt.getTime() / 1000),
			currency,
			customer: customerId,
			customer_email: faker.internet.email(),
			hosted_invoice_url: faker.internet.url(),
			collection_method: faker.helpers.arrayElement([
				'charge_automatically',
				'send_invoice',
			]),
			number: `INV-${faker.number.int({ min: 1000, max: 999999 })}`,
			status,
			subscription: `sub_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`,
		}
	},
	customer: (eventType, occurredAt) => {
		const id = `cus_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`

		if (eventType === 'customer.deleted') {
			return {
				id,
				object: 'customer',
				deleted: true,
			}
		}

		return {
			id,
			object: 'customer',
			address: {
				city: faker.location.city(),
				country: faker.helpers.arrayElement([
					'US',
					'GB',
					'BR',
					'CA',
					'AU',
					'DE',
				]),
				line1: faker.location.streetAddress(),
				line2: faker.helpers.arrayElement([
					null,
					faker.location.secondaryAddress(),
				]),
				postal_code: faker.location.zipCode(),
				state: faker.location.state(),
			},
			created: Math.floor(occurredAt.getTime() / 1000),
			currency: faker.helpers.arrayElement(CURRENCIES),
			default_payment_method: `pm_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			email: faker.internet.email(),
			invoice_prefix: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
			livemode: faker.helpers.arrayElement([true, false]),
			name: faker.person.fullName(),
			phone: faker.phone.number(),
			metadata: {
				crm_id: faker.string.alphanumeric({ length: 10, casing: 'upper' }),
			},
		}
	},
	subscription: (eventType, occurredAt) => {
		const id = `sub_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'customer.subscription.created': 'active',
			'customer.subscription.updated': 'active',
			'customer.subscription.deleted': 'canceled',
		}
		const status = statusMap[eventType] ?? 'active'
		const start = Math.floor(occurredAt.getTime() / 1000)
		const periodDuration = faker.helpers.arrayElement([
			2592000, 7776000, 31536000,
		])

		return {
			id,
			object: 'subscription',
			application_fee_percent: null,
			cancel_at: status === 'canceled' ? start + periodDuration : null,
			cancel_at_period_end:
				status === 'canceled'
					? faker.helpers.arrayElement([true, false])
					: false,
			canceled_at: status === 'canceled' ? start : null,
			created: start,
			current_period_end: start + periodDuration,
			current_period_start: start,
			customer: `cus_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`,
			items: {
				object: 'list',
				data: [
					{
						id: `si_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`,
						object: 'subscription_item',
						price: {
							id: `price_${faker.string.alphanumeric({ length: 12, casing: 'lower' })}`,
							object: 'price',
							active: true,
							currency: faker.helpers.arrayElement(CURRENCIES),
							product: `prod_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`,
							recurring: {
								interval: faker.helpers.arrayElement(['month', 'year']),
								interval_count: faker.helpers.arrayElement([1, 3, 12]),
							},
							unit_amount: faker.number.int({ min: 1000, max: 4000 }),
						},
						quantity: faker.number.int({ min: 1, max: 10 }),
					},
				],
				has_more: false,
				total_count: 1,
				url: `/v1/subscription_items?subscription=${id}`,
			},
			latest_invoice: `in_${faker.string.alphanumeric({ length: 18, casing: 'lower' })}`,
			status,
		}
	},
	checkout_session: (eventType, occurredAt) => {
		const id = `cs_${faker.string.alphanumeric({ length: 20, casing: 'lower' })}`
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'checkout.session.completed': 'complete',
			'checkout.session.expired': 'expired',
		}
		const status = statusMap[eventType] ?? 'open'

		return {
			id,
			object: 'checkout.session',
			amount_subtotal: faker.number.int({ min: 2000, max: 150_000 }),
			amount_total: faker.number.int({ min: 2000, max: 150_000 }),
			cancel_url: faker.internet.url(),
			client_reference_id: faker.string.uuid(),
			created: Math.floor(occurredAt.getTime() / 1000),
			currency: faker.helpers.arrayElement(CURRENCIES),
			customer: `cus_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`,
			customer_details: {
				email: faker.internet.email(),
				name: faker.person.fullName(),
				tax_exempt: faker.helpers.arrayElement(['none', 'exempt', 'reverse']),
			},
			mode: faker.helpers.arrayElement(['payment', 'subscription']),
			payment_intent: `pi_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			payment_status: status === 'complete' ? 'paid' : 'unpaid',
			success_url: faker.internet.url(),
			status,
		}
	},
	payment_method: (eventType, occurredAt) => {
		const id = `pm_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
		const isAttached = eventType === 'payment_method.attached'
		const brand = faker.helpers.arrayElement([
			'visa',
			'mastercard',
			'amex',
			'discover',
			'diners',
			'jcb',
		])
		const last4 = faker.string.numeric({ length: 4 })

		return {
			id,
			object: 'payment_method',
			billing_details: {
				email: faker.internet.email(),
				name: faker.person.fullName(),
				address: {
					city: faker.location.city(),
					country: faker.helpers.arrayElement([
						'US',
						'GB',
						'BR',
						'CA',
						'AU',
						'DE',
					]),
					line1: faker.location.streetAddress(),
					postal_code: faker.location.zipCode(),
				},
			},
			card: {
				brand,
				last4,
				exp_month: faker.number.int({ min: 1, max: 12 }),
				exp_year: faker.number.int({
					min: new Date().getFullYear(),
					max: new Date().getFullYear() + 6,
				}),
				funding: faker.helpers.arrayElement(['credit', 'debit']),
			},
			created: Math.floor(occurredAt.getTime() / 1000),
			customer: isAttached
				? `cus_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`
				: null,
			livemode: faker.helpers.arrayElement([true, false]),
			type: 'card',
		}
	},
	setup_intent: (eventType, occurredAt) => {
		const id = `seti_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'setup_intent.created': 'requires_action',
			'setup_intent.succeeded': 'succeeded',
			'setup_intent.requires_action': 'requires_action',
		}
		const status = statusMap[eventType] ?? 'requires_action'

		return {
			id,
			object: 'setup_intent',
			created: Math.floor(occurredAt.getTime() / 1000),
			customer: `cus_${faker.string.alphanumeric({ length: 14, casing: 'lower' })}`,
			description: faker.commerce.productDescription(),
			latest_attempt: `setatt_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			livemode: faker.helpers.arrayElement([true, false]),
			payment_method: `pm_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			status,
			usage: faker.helpers.arrayElement(['off_session', 'on_session']),
		}
	},
	payout: (eventType, occurredAt) => {
		const id = `po_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'payout.paid': 'paid',
			'payout.failed': 'failed',
		}
		const status = statusMap[eventType] ?? 'pending'
		const amount = faker.number.int({ min: 5000, max: 250_000 })

		return {
			id,
			object: 'payout',
			amount,
			arrival_date: Math.floor(occurredAt.getTime() / 1000) + 86_400,
			balance_transaction: `txn_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			created: Math.floor(occurredAt.getTime() / 1000),
			currency: faker.helpers.arrayElement(CURRENCIES),
			description: faker.commerce.productDescription(),
			destination: `ba_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			failure_balance_transaction:
				status === 'failed'
					? `txn_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
					: null,
			failure_code: status === 'failed' ? 'account_closed' : null,
			failure_message:
				status === 'failed'
					? 'Bank rejected the payout destination account.'
					: null,
			method: faker.helpers.arrayElement(['standard', 'instant']),
			source_type: faker.helpers.arrayElement(['card', 'bank_account', 'fpx']),
			status,
			type: faker.helpers.arrayElement(['card', 'bank_account']),
		}
	},
	refund: (eventType, occurredAt) => {
		const id = `re_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'refund.created': 'pending',
			'refund.updated': 'succeeded',
		}
		const status = statusMap[eventType] ?? 'pending'
		const amount = faker.number.int({ min: 1000, max: 80_000 })

		return {
			id,
			object: 'refund',
			amount,
			balance_transaction: `txn_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			charge: `ch_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			created: Math.floor(occurredAt.getTime() / 1000),
			currency: faker.helpers.arrayElement(CURRENCIES),
			description: faker.commerce.productDescription(),
			payment_intent: `pi_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			reason: faker.helpers.arrayElement([
				'requested_by_customer',
				'duplicate',
				'fraudulent',
			]),
			receipt_number: faker.string.alphanumeric({
				length: 12,
				casing: 'upper',
			}),
			status,
		}
	},
	dispute: (eventType, occurredAt) => {
		const id = `dp_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`
		const statusMap: Partial<Record<StripeEventType, string>> = {
			'dispute.created': 'needs_response',
			'dispute.closed': faker.helpers.arrayElement(['won', 'lost']),
		}
		const status = statusMap[eventType] ?? 'warning_needs_response'

		return {
			id,
			object: 'dispute',
			amount: faker.number.int({ min: 2000, max: 100_000 }),
			balance_transactions: [],
			charge: `ch_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			created: Math.floor(occurredAt.getTime() / 1000),
			currency: faker.helpers.arrayElement(CURRENCIES),
			evidence: {
				product_description: faker.commerce.productDescription(),
				shipping_address: faker.location.streetAddress(),
				customer_name: faker.person.fullName(),
				customer_email: faker.internet.email(),
			},
			is_charge_refundable: faker.helpers.arrayElement([true, false]),
			reason: faker.helpers.arrayElement([
				'fraudulent',
				'product_not_received',
				'duplicate',
				'subscription_canceled',
			]),
			status,
		}
	},
	balance: (_eventType, occurredAt) => {
		const currentTimestamp = Math.floor(occurredAt.getTime() / 1000)
		const availableAmount = faker.number.int({ min: 10_000, max: 250_000 })
		const pendingAmount = faker.number.int({ min: 5000, max: 150_000 })

		return {
			object: 'balance',
			available: [
				{
					amount: availableAmount,
					currency: faker.helpers.arrayElement(CURRENCIES),
					source_types: {
						card: availableAmount,
					},
				},
			],
			livemode: faker.helpers.arrayElement([true, false]),
			pending: [
				{
					amount: pendingAmount,
					currency: faker.helpers.arrayElement(CURRENCIES),
					source_types: {
						card: pendingAmount,
					},
				},
			],
			connect_reserved: [
				{
					amount: faker.number.int({ min: 1000, max: 20_000 }),
					currency: faker.helpers.arrayElement(CURRENCIES),
				},
			],
			instant_available: [
				{
					amount: Math.max(availableAmount - pendingAmount, 0),
					currency: faker.helpers.arrayElement(CURRENCIES),
				},
			],
			created: currentTimestamp,
		}
	},
}

function generateStripeEvent(eventType: StripeEventType, occurredAt: Date) {
	const account = `acct_${faker.string.alphanumeric({ length: 16, casing: 'lower' })}`
	const dataObject = EVENT_OBJECT_BUILDERS[EVENT_TYPE_TO_OBJECT[eventType]](
		eventType,
		occurredAt,
	)

	return {
		id: `evt_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
		object: 'event',
		account,
		api_version: '2024-06-01',
		created: Math.floor(occurredAt.getTime() / 1000),
		data: {
			object: dataObject,
		},
		livemode: faker.helpers.arrayElement([true, false]),
		pending_webhooks: faker.number.int({ min: 0, max: 2 }),
		request: {
			id: `req_${faker.string.alphanumeric({ length: 24, casing: 'lower' })}`,
			idempotency_key: faker.string.uuid(),
		},
		type: eventType,
	}
}

function buildWebhookRecords(count: number): NewWebhook[] {
	return Array.from({ length: count }, () => {
		const eventType = faker.helpers.arrayElement(STRIPE_EVENT_TYPES)
		const createdAt = faker.date.recent({ days: 45 })
		const eventPayload = generateStripeEvent(eventType, createdAt)
		const body = JSON.stringify(eventPayload, null, 2)
		const signature = `t=${eventPayload.created},v1=${faker.string.hexadecimal({ length: 64, casing: 'lower', prefix: '' })}`
		const statusCode = faker.helpers.arrayElement([
			200, 200, 200, 200, 200, 202, 400, 500,
		])

		return {
			method: 'POST',
			pathname: '/webhooks/stripe',
			ip: generateIpAddress(),
			statusCode,
			contentType: 'application/json',
			contentLength: Buffer.byteLength(body),
			queryParams: {
				livemode: eventPayload.livemode ? 'true' : 'false',
				api_version: eventPayload.api_version,
				type: eventPayload.type,
			},
			headers: {
				'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)',
				'content-type': 'application/json',
				'stripe-signature': signature,
				'stripe-account': eventPayload.account,
				'request-id': eventPayload.request.id,
			},
			body,
			createdAt,
		}
	})
}

async function seed() {
	console.log('[seed] Seeding database...')

	const webhookRecords = buildWebhookRecords(75)

	await db.delete(webhooks)
	await db.insert(webhooks).values(webhookRecords)

	console.log(`[seed] Inserted ${webhookRecords.length} Stripe webhook records`)
}

seed()
	.then(() => {
		console.log('[seed] Database seeded')
	})
	.catch((error) => {
		console.error('[seed] Error seeding database', error)
		process.exit(1)
	})
