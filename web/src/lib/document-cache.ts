import { QueryClient } from '@tanstack/react-query';

const USER_DOCUMENT_LIST_QUERY_KEYS = [
	'searchMyDocument',
	'searchUserUnreadDocument',
	'searchUserRecentReadDocument',
	'searchMyStarDocument',
] as const;

export const invalidateDocumentListQueries = async (
	queryClient: QueryClient,
	userId?: number
) => {
	const userScopedQueryKeyPromises = USER_DOCUMENT_LIST_QUERY_KEYS.map(
		(queryKey) =>
			queryClient.invalidateQueries({
				queryKey: userId !== undefined ? [queryKey, userId] : [queryKey],
			})
	);

	await Promise.all([
		...userScopedQueryKeyPromises,
		queryClient.invalidateQueries({
			queryKey: ['searchSectionDocument'],
		}),
	]);
};
