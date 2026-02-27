import { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query'

type PageWithElements<TItem> = {
	elements: TItem[]
}

const isInfiniteDataWithPages = <TPage,>(
	value: unknown,
): value is InfiniteData<TPage> => {
	if (!value || typeof value !== 'object') return false
	return Array.isArray((value as InfiniteData<TPage>).pages)
}

export const mapInfiniteDataElements = <
	TPage extends PageWithElements<TItem>,
	TItem,
>(
	oldData: InfiniteData<TPage> | undefined,
	mapper: (item: TItem) => TItem,
) => {
	if (!isInfiniteDataWithPages<TPage>(oldData)) return oldData

	let changed = false
	const pages = oldData.pages.map((page) => {
		let pageChanged = false
		const elements = page.elements.map((item) => {
			const next = mapper(item)
			if (next !== item) {
				pageChanged = true
				changed = true
			}
			return next
		})

		if (!pageChanged) return page
		return {
			...page,
			elements,
		}
	})

	if (!changed) return oldData
	return {
		...oldData,
		pages,
	}
}

export const filterInfiniteDataElements = <
	TPage extends PageWithElements<TItem>,
	TItem,
>(
	oldData: InfiniteData<TPage> | undefined,
	predicate: (item: TItem) => boolean,
) => {
	if (!isInfiniteDataWithPages<TPage>(oldData)) return oldData

	let changed = false
	const pages = oldData.pages.map((page) => {
		const elements = page.elements.filter((item) => predicate(item))
		if (elements.length !== page.elements.length) {
			changed = true
			return {
				...page,
				elements,
			}
		}
		return page
	})

	if (!changed) return oldData
	return {
		...oldData,
		pages,
	}
}

export const mapInfiniteQueryElements = <
	TPage extends PageWithElements<TItem>,
	TItem,
>(
	queryClient: QueryClient,
	queryKey: QueryKey,
	mapper: (item: TItem) => TItem,
) => {
	queryClient.setQueriesData<InfiniteData<TPage>>({ queryKey }, (oldData) =>
		mapInfiniteDataElements(oldData, mapper),
	)
}

export const filterInfiniteQueryElements = <
	TPage extends PageWithElements<TItem>,
	TItem,
>(
	queryClient: QueryClient,
	queryKey: QueryKey,
	predicate: (item: TItem) => boolean,
) => {
	queryClient.setQueriesData<InfiniteData<TPage>>({ queryKey }, (oldData) =>
		filterInfiniteDataElements(oldData, predicate),
	)
}
