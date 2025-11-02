import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { WebhooksListItem } from './webhooks-list-item'
import { webhooksListSchema } from '../http/schemas/webhooks'
import { Loader2Icon, Wand2Icon } from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import * as Dialog from '@radix-ui/react-dialog'
import { CodeBlock } from './ui/code-block'

export function WebhooksList() {
	const loadMoreRef = useRef<HTMLDivElement>(null)
	const observerRef = useRef<IntersectionObserver | null>(null)

	const [checkedWebhooksIds, setCheckedWebhooksIds] = useState<string[]>([])
	const [generatedHandlerCode, setGeneratedHandlerCode] = useState<
		string | null
	>(null)

	const [isGenerating, startGenerateTransition] = useTransition()

	const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery({
			queryKey: ['webhooks'],
			queryFn: async ({ pageParam }) => {
				const url = new URL(`${import.meta.env.VITE_API_URL}/webhooks`)

				if (pageParam) url.searchParams.set('cursor', pageParam)

				const response = await fetch(url)

				const data = await response.json()

				return webhooksListSchema.parse(data)
			},
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		})

	const webhooks = data.pages.flatMap((page) => page.webhooks)

	function handleCheckWebhook(checkedWebhookId: string) {
		if (checkedWebhooksIds.includes(checkedWebhookId)) {
			setCheckedWebhooksIds(state => {
				return state.filter(webhookId => webhookId !== checkedWebhookId)
			})
		} else {
			setCheckedWebhooksIds(state => [...state, checkedWebhookId])
		}
	}

	async function handleGenerateHandler() {
		startGenerateTransition(async () => {
			try {
				const response = await fetch(`${import.meta.env.VITE_API_URL}/generate`, {
					method: 'POST',
					body: JSON.stringify({ webhookIds: checkedWebhooksIds }),
					headers: {
						'Content-Type': 'application/json',
					},
				})

				type GenerateResponse = { code: string }

				const data: GenerateResponse = await response.json()

				setGeneratedHandlerCode(data.code)
			} catch (error) {
				toast.error('Error generating handler')
			}
		})
	}

	const hasCheckedWebhooks = checkedWebhooksIds.length > 0

	useEffect(() => {
		if (observerRef.current) {
			observerRef.current.disconnect()
		}

		observerRef.current = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage()
				}
			},
			{
				threshold: 0.1,
			},
		)

		if (loadMoreRef.current) {
			observerRef.current.observe(loadMoreRef.current)
		}

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect()
			}
		}
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])

	return (
		<>
			<div className="flex-1 overflow-y-auto">
				<div className="p-2 space-y-1">
					<button
						disabled={!hasCheckedWebhooks}
						className="bg-indigo-400 mb-3 text-white w-full rounded-lg flex items-center justify-center gap-3 font-medium text-sm py-2 disabled:opacity-50"
						onClick={() => handleGenerateHandler()}
					>
						<Wand2Icon className="size-4" />
						Gerar handler
						{isGenerating && (
							<Loader2Icon className="animate-spin size-4" />
						)}
					</button>

					{webhooks.map((webhook) => (
						<WebhooksListItem
							key={webhook.id}
							webhook={webhook}
							onWebhooksChecked={handleCheckWebhook}
							isWebhookChecked={checkedWebhooksIds.includes(webhook.id)}
						/>
					))}
				</div>

				{hasNextPage && (
					<div className="p-2" ref={loadMoreRef}>
						{isFetchingNextPage && (
							<div className="flex items-center justify-center py-2">
								<Loader2Icon className="animate-spin size-5 text-zinc-500" />
							</div>
						)}
					</div>
				)}
			</div>
			
			{!!generatedHandlerCode && (
				<Dialog.Root defaultOpen>
					<Dialog.Overlay className="bg-black/60 inset-0 fixed z-20" />

					<Dialog.Content className="flex items-center justify-center fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] -translate-x-1/2 -translate-y-1/2 z-40">
						<div className="bg-zinc-900 w-[600px] p-4 rounded-lg border border-zinc-800 max-h-[620px] overflow-y-auto">
							<CodeBlock language="typescript" code={generatedHandlerCode} />
						</div>
					</Dialog.Content>
				</Dialog.Root>
			)}
		</>
	)
}
