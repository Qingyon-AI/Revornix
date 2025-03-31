import { notFound } from 'next/navigation';
import * as _ from 'lodash-es';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import DocumentContainer from '@/components/document/document-container';

const DocumentDetailPage = async (props: {
	params: Promise<{ id: string }>;
}) => {
	const queryClient = getQueryClient();
	const { id } = await props.params;
	if (!id) return notFound();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<DocumentContainer id={id} />
		</HydrationBoundary>
	);
};
export default DocumentDetailPage;
