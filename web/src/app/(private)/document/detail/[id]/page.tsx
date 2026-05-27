import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import * as _ from 'lodash-es';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getTranslations } from 'next-intl/server';
import { getQueryClient } from '@/lib/get-query-client';
import DocumentContainer from '@/components/document/document-container';
import { buildMetadata, toMetaDescription } from '@/lib/seo-metadata';
import { getDocumentDetailServer } from '@/service/document';

export async function generateMetadata(props: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const [{ id }, t] = await Promise.all([props.params, getTranslations()]);
	const documentId = Number(id);

	if (!documentId) {
		return buildMetadata({
			title: t('app_document_title_suffix'),
			description:
				'Private Revornix document detail page for reading content, summaries, notes, graph results, and related sections.',
			noIndex: true,
		});
	}

	try {
		const document = await getDocumentDetailServer({ document_id: documentId });
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
			description:
				'Private Revornix document detail page for reading content, summaries, notes, graph results, and related sections.',
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
