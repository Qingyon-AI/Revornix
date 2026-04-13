import type { Metadata } from 'next';
import MineDocumentContainer from '@/components/document/mine-document-container';
import { getQueryClient } from '@/lib/get-query-client';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'My Documents',
	'Browse and manage your own documents in Revornix.',
);

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const MyDocumentPage = async (props: { searchParams: SearchParams }) => {
	const searchParams = await props.searchParams;
	const queryClient = getQueryClient();
	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<MineDocumentContainer
				label_id={Number(searchParams.label_id) as number | undefined}
			/>
		</HydrationBoundary>
	);
};

export default MyDocumentPage;
