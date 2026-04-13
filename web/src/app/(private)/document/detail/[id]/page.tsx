import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import * as _ from 'lodash-es';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { getQueryClient } from '@/lib/get-query-client';
import DocumentContainer from '@/components/document/document-container';
import { buildMetadata, toMetaDescription } from '@/lib/seo-metadata';
import { getDocumentDetailInServer } from '@/service/document';

export async function generateMetadata(props: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await props.params;
	const documentId = Number(id);
	const t = await getTranslations();

	if (!documentId) {
		return buildMetadata({
			title: t('app_document_title_suffix'),
			description: 'Document detail page in Revornix.',
			noIndex: true,
		});
	}

	try {
		const requestHeaders = await headers();
		const document = await getDocumentDetailInServer(
			{ document_id: documentId },
			new Headers(requestHeaders),
		);
		const title = document.title?.trim() || 'Untitled Document';
		const description = toMetaDescription(
			document.description?.trim() || `Document detail for ${title}.`,
		);

		return buildMetadata({
			title: `${title} | ${t('app_document_title_suffix')}`,
			description,
			noIndex: true,
		});
	} catch {
		return buildMetadata({
			title: t('app_document_title_suffix'),
			description: 'Document detail page in Revornix.',
			noIndex: true,
		});
	}
}

const DocumentDetailPage = async (props: {
	params: Promise<{ id: string }>;
}) => {
	const queryClient = getQueryClient();
	const { id } = await props.params;
	if (!id) return notFound();

	return (
		<HydrationBoundary state={dehydrate(queryClient)}>
			<DocumentContainer id={Number(id)} />
		</HydrationBoundary>
	);
};
export default DocumentDetailPage;
