import type { Metadata } from 'next';
import SectionContainer from '@/components/section/section-container';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { buildMetadata, toMetaDescription } from '@/lib/seo-metadata';
import { getSectionDetailServer } from '@/service/section';

type Params = Promise<{
	id: string;
}>;

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { id } = await params;
	const sectionId = Number(id);
	const t = await getTranslations();

	if (!sectionId) {
		return buildMetadata({
			title: t('app_section_title_suffix'),
			description:
				'Private Revornix section detail page for managing summaries, markdown, documents, graph results, audio, and discussion.',
			noIndex: true,
		});
	}

	try {
		const section = await getSectionDetailServer({ section_id: sectionId });
		const title = section.title?.trim() || 'Untitled Section';
		const description = toMetaDescription(
			section.description?.trim() || `Section detail for ${title}.`,
		);

		return buildMetadata({
			title: `${title} | ${t('app_section_title_suffix')}`,
			description,
			noIndex: true,
		});
	} catch {
		return buildMetadata({
			title: t('app_section_title_suffix'),
			description:
				'Private Revornix section detail page for managing summaries, markdown, documents, graph results, audio, and discussion.',
			noIndex: true,
		});
	}
}

const SectionDetailPage = async ({ params }: { params: Params }) => {
	const { id } = await params;
	if (!id) return notFound();

	return <SectionContainer id={Number(id)} />;
};
export default SectionDetailPage;
