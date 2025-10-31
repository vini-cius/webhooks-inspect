import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { WebhooksListItem } from './webhooks-list-item'
import { webhooksListSchema } from '../http/schemas/webhooks'
import { Loader2Icon } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function WebhooksList() {
	const loadMoreRef = useRef<HTMLDivElement>(null)
	const observerRef = useRef<IntersectionObserver | null>(null)

	const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
		useSuspenseInfiniteQuery({
			queryKey: ['webhooks'],
			queryFn: async ({ pageParam }) => {
				const url = new URL('http://localhost:3333/api/webhooks')

				if (pageParam) url.searchParams.set('cursor', pageParam)

				const response = await fetch(url)

				const data = await response.json()

				return webhooksListSchema.parse(data)
			},
			getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
			initialPageParam: undefined as string | undefined,
		})

	const webhooks = data.pages.flatMap((page) => page.webhooks)

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
		<div className="flex-1 overflow-y-auto">
			<div className="p-2 space-y-1">
				{webhooks.map((webhook) => (
					<WebhooksListItem key={webhook.id} webhook={webhook} />
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
	)
}
