import PublicSectionCard from '@/components/seo/public-section-card';
import JsonLd from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DocumentCategory } from '@/enums/document';
import { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ArrowRight, Compass, FileText, Search } from 'lucide-react';
import {
	fetchPublicDocuments,
	fetchPublicSections,
	getPublicSectionHref,
} from '@/lib/seo';
import { buildMetadata, createAbsoluteUrl } from '@/lib/seo-metadata';
import { cn } from '@/lib/utils';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type CommunityTab = 'sections' | 'documents';

const getSingleValue = (value: string | string[] | undefined) => {
	if (Array.isArray(value)) {
		return value[0];
	}
	return value;
};

const getStartValue = (value: string | string[] | undefined) => {
	const rawValue = getSingleValue(value);
	if (!rawValue) {
		return undefined;
	}

	const parsedValue = Number(rawValue);
	return Number.isNaN(parsedValue) ? undefined : parsedValue;
};

const getTabValue = (value: string | string[] | undefined): CommunityTab => {
	return getSingleValue(value) === 'documents' ? 'documents' : 'sections';
};

const buildCommunityHref = ({
	tab,
	keyword,
	start,
}: {
	tab: CommunityTab;
	keyword?: string;
	start?: number;
}) => {
	const params = new URLSearchParams();
	if (tab !== 'sections') {
		params.set('tab', tab);
	}
	if (keyword) {
		params.set('q', keyword);
	}
	if (start !== undefined) {
		params.set('start', String(start));
	}
	const query = params.toString();
	return query ? `/community?${query}` : '/community';
};

const getDocumentCategoryLabel = (
	category: number,
	t: Awaited<ReturnType<typeof getTranslations>>,
) => {
	if (category === DocumentCategory.WEBSITE) {
		return t('document_category_link');
	}
	if (category === DocumentCategory.FILE) {
		return t('document_category_file');
	}
	if (category === DocumentCategory.QUICK_NOTE) {
		return t('document_category_quick_note');
	}
	if (category === DocumentCategory.AUDIO) {
		return t('document_category_audio');
	}
	return t('document_category_others');
};

export async function generateMetadata(props: {
	searchParams: SearchParams;
}): Promise<Metadata> {
	const [t, searchParams] = await Promise.all([
		getTranslations(),
		props.searchParams,
	]);
	const keyword = getSingleValue(searchParams.q)?.trim();
	const start = getStartValue(searchParams.start);
	const tab = getTabValue(searchParams.tab);
	const noIndex = Boolean(keyword) || start !== undefined;

	if (keyword) {
		return buildMetadata({
			title: `${keyword} | ${
				tab === 'documents'
					? t('seo_community_documents_title')
					: t('seo_community_title')
			}`,
			description:
				tab === 'documents'
					? t('seo_community_documents_description')
					: t('seo_community_description'),
			path: buildCommunityHref({ tab }),
			noIndex,
			keywords:
				tab === 'documents'
					? [keyword, 'community', 'public documents']
					: [keyword, 'community', 'public sections'],
		});
	}

	return buildMetadata({
		title:
			tab === 'documents'
				? t('seo_community_documents_title')
				: t('seo_community_title'),
		description:
			tab === 'documents'
				? t('seo_community_documents_description')
				: t('seo_community_description'),
		path: buildCommunityHref({ tab }),
		noIndex,
		keywords:
			tab === 'documents'
				? ['community', 'public documents', 'knowledge sharing']
				: ['community', 'public sections', 'knowledge sharing'],
	});
}

const CommunityPage = async (props: { searchParams: SearchParams }) => {
	const [t, locale, searchParams] = await Promise.all([
		getTranslations(),
		getLocale(),
		props.searchParams,
	]);
	const keyword = getSingleValue(searchParams.q)?.trim() || undefined;
	const start = getStartValue(searchParams.start);
	const tab = getTabValue(searchParams.tab);
	const [sections, documents] = await Promise.all([
		tab === 'sections'
			? fetchPublicSections({
					keyword,
					start,
					limit: 12,
					desc: true,
				})
			: null,
		tab === 'documents'
			? fetchPublicDocuments({
					keyword,
					start,
					limit: 12,
					desc: true,
				})
			: null,
	]);

	const nextHref = new URLSearchParams();
	if (tab !== 'sections') {
		nextHref.set('tab', tab);
	}
	if (keyword) {
		nextHref.set('q', keyword);
	}
	const nextStart =
		tab === 'documents' ? documents?.next_start : sections?.next_start;
	if (nextStart !== undefined && nextStart !== null) {
		nextHref.set('start', String(nextStart));
	}

	const surfaceCardClassName =
		'gap-0 rounded-[26px] border border-border/60 bg-card/88 py-0 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur';
	const communitySchema = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name:
			tab === 'documents'
				? t('seo_community_documents_title')
				: t('seo_community_title'),
		description:
			tab === 'documents'
				? t('seo_community_documents_description')
				: t('seo_community_description'),
		url: createAbsoluteUrl(buildCommunityHref({ tab })),
		inLanguage: locale,
		mainEntity:
			tab === 'documents'
				? documents?.elements?.slice(0, 8).map((document) => ({
						'@type': 'Article',
						name: document.title,
						description: document.description,
						url: createAbsoluteUrl(`/document/${document.id}`),
					})) ?? []
				: sections?.elements?.slice(0, 8).map((section) => ({
						'@type': 'CollectionPage',
						name: section.title,
						description: section.description,
						url: createAbsoluteUrl(getPublicSectionHref(section)),
					})) ?? [],
	};

	return (
		<div className='mx-auto flex w-full max-w-[1480px] flex-col gap-8 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8'>
			<JsonLd data={communitySchema} />
			<Card
				className={`relative overflow-hidden rounded-[26px] ${surfaceCardClassName}`}>
				<div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_26%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.12),transparent_22%)]' />
				<CardContent className='relative z-10 px-5 py-8 sm:px-8 sm:py-10 lg:px-10'>
					<div className='flex flex-col gap-6'>
						<div className='max-w-3xl space-y-4'>
							<div className='space-y-3'>
								<h1 className='text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl'>
									{tab === 'documents'
										? t('seo_community_documents_title')
										: t('seo_community_title')}
								</h1>
								<p className='max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base'>
									{tab === 'documents'
										? t('seo_community_documents_description')
										: t('seo_community_description')}
								</p>
							</div>
						</div>
					</div>

					<div className='mt-8 inline-flex w-fit rounded-[22px] border border-border/60 bg-muted/45 p-1.5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.32)] backdrop-blur'>
						<Button
							asChild
							variant='ghost'
							className={cn(
								'h-11 rounded-[18px] px-4 shadow-none transition-all',
								tab === 'sections'
									? 'border border-border/70 bg-background text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] hover:bg-background'
									: 'border border-transparent bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground',
							)}>
							<Link href={buildCommunityHref({ tab: 'sections', keyword })}>
								<Compass className='mr-2 size-4' />
								{t('seo_community_sections_tab')}
							</Link>
						</Button>
						<Button
							asChild
							variant='ghost'
							className={cn(
								'h-11 rounded-[18px] px-4 shadow-none transition-all',
								tab === 'documents'
									? 'border border-border/70 bg-background text-foreground shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] hover:bg-background'
									: 'border border-transparent bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground',
							)}>
							<Link href={buildCommunityHref({ tab: 'documents', keyword })}>
								<FileText className='mr-2 size-4' />
								{t('seo_community_documents_tab')}
							</Link>
						</Button>
					</div>

					<form
						action='/community'
						className='mt-8 flex flex-col gap-3 sm:flex-row'>
						<input type='hidden' name='tab' value={tab} />
						<div className='relative flex-1'>
							<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
							<Input
								type='search'
								name='q'
								defaultValue={keyword}
								placeholder={
									tab === 'documents'
										? t('seo_community_documents_search_placeholder')
										: t('seo_community_search_placeholder')
								}
								className='h-11 rounded-2xl border-border/60 bg-background/72 pl-10'
							/>
						</div>
						<Button type='submit' className='h-11 rounded-2xl px-5'>
							{t('seo_community_search_action')}
						</Button>
						{keyword ? (
							<Link href={buildCommunityHref({ tab })}>
								<Button
									type='button'
									variant='outline'
									className='h-11 rounded-2xl px-5'>
									{t('seo_community_reset')}
								</Button>
							</Link>
						) : null}
					</form>
				</CardContent>
			</Card>

			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex items-center gap-2 text-sm text-muted-foreground'>
					{tab === 'documents' ? (
						<FileText className='size-4' />
					) : (
						<Compass className='size-4' />
					)}
					<span>
						{tab === 'documents'
							? t('seo_community_documents_result', {
									count: documents?.total ?? 0,
								})
							: t('seo_community_result', {
									count: sections?.total ?? 0,
								})}
					</span>
				</div>
				{keyword ? (
					<div className='text-sm text-muted-foreground'>“{keyword}”</div>
				) : null}
			</div>

			<Card className={surfaceCardClassName}>
				<CardContent className='px-5 py-6 sm:px-7 sm:py-7'>
					<div className='space-y-5'>
						<div className='space-y-3'>
							<h2 className='text-2xl font-semibold tracking-tight'>
								{t('seo_community_intro_title')}
							</h2>
							<p className='text-sm leading-7 text-muted-foreground sm:text-base'>
								{tab === 'documents'
									? t('seo_community_documents_intro_paragraph_1')
									: t('seo_community_intro_paragraph_1')}
							</p>
							<p className='text-sm leading-7 text-muted-foreground sm:text-base'>
								{tab === 'documents'
									? t('seo_community_documents_intro_paragraph_2')
									: t('seo_community_intro_paragraph_2')}
							</p>
							<p className='text-sm leading-7 text-muted-foreground sm:text-base'>
								{tab === 'documents'
									? t('seo_community_documents_intro_paragraph_3')
									: t('seo_community_intro_paragraph_3')}
							</p>
						</div>

						<div className='space-y-3'>
							<h3 className='text-lg font-semibold tracking-tight'>
								{t('seo_community_explore_title')}
							</h3>
							<ul className='list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground sm:text-base'>
								<li>
									{tab === 'documents'
										? t('seo_community_documents_explore_documents')
										: t('seo_community_explore_sections')}
								</li>
								<li>
									{tab === 'documents'
										? t('seo_community_documents_explore_sources')
										: t('seo_community_explore_creators')}
								</li>
								<li>
									{tab === 'documents'
										? t('seo_community_documents_explore_sections')
										: t('seo_community_explore_documents')}
								</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>

			{tab === 'sections' && sections?.elements && sections.elements.length > 0 ? (
				<div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
					{sections.elements.map((section) => (
						<PublicSectionCard
							key={`${section.id}-${section.publish_uuid ?? 'private'}`}
							section={section}
						/>
					))}
				</div>
			) : null}

			{tab === 'documents' && documents?.elements && documents.elements.length > 0 ? (
				<div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
					{documents.elements.map((document) => (
						<Link
							key={document.id}
							href={`/document/${document.id}`}
							className='group flex h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-40px_rgba(15,23,42,0.62)]'>
							<div className='relative h-44 w-full overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(71,85,105,0.78))]'>
								{document.cover ? (
									<img
										src={document.cover}
										alt={document.title}
										className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105'
									/>
								) : (
									<div className='flex h-full w-full items-center justify-center'>
										<div className='flex items-center justify-center rounded-[22px] border border-white/15 bg-white/10 p-4 text-white/75 backdrop-blur'>
											<FileText size={26} />
										</div>
									</div>
								)}
								<div className='absolute inset-0 bg-gradient-to-t from-black/48 via-black/10 to-transparent' />
							</div>

							<div className='flex flex-1 flex-col gap-4 p-5'>
								<div className='space-y-3'>
									<div className='flex flex-wrap gap-2'>
										<div className='rounded-full border border-border/60 bg-background/55 px-2.5 py-1 text-[11px] text-muted-foreground'>
											{getDocumentCategoryLabel(document.category, t)}
										</div>
										<div className='rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-300'>
											{t('section_publish_status_on')}
										</div>
									</div>
									<h2 className='line-clamp-2 text-lg font-semibold leading-7'>
										{document.title}
									</h2>
									<p className='line-clamp-4 text-sm leading-6 text-muted-foreground'>
										{document.description ||
											t('seo_community_documents_empty_description')}
									</p>
								</div>

								{document.labels && document.labels.length > 0 ? (
									<div className='flex flex-wrap gap-2'>
										{document.labels.slice(0, 4).map((label) => (
											<div
												key={label.id}
												className='rounded-full border border-border/60 bg-background/55 px-2.5 py-1 text-[11px] text-muted-foreground'>
												{label.name}
											</div>
										))}
									</div>
								) : null}

								<div className='mt-auto flex flex-wrap gap-2 text-xs text-muted-foreground'>
									<div className='rounded-full border border-border/60 bg-background/55 px-3 py-1'>
										ID #{document.id}
									</div>
									{document.convert_task?.md_file_name ? (
										<div className='rounded-full border border-border/60 bg-background/55 px-3 py-1'>
											Markdown
										</div>
									) : null}
									{document.transcribe_task?.transcribed_text ? (
										<div className='rounded-full border border-border/60 bg-background/55 px-3 py-1'>
											Transcript
										</div>
									) : null}
								</div>
							</div>
						</Link>
					))}
				</div>
			) : null}

			{((tab === 'sections' && (!sections?.elements || sections.elements.length === 0)) ||
				(tab === 'documents' &&
					(!documents?.elements || documents.elements.length === 0))) && (
				<Card className='rounded-[30px] border border-dashed border-border/70 bg-muted/20 shadow-none'>
					<CardContent className='flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 py-10 text-center'>
						<div className='flex size-14 items-center justify-center rounded-full border border-border/60 bg-background/75'>
							{tab === 'documents' ? (
								<FileText className='size-6 text-muted-foreground' />
							) : (
								<Compass className='size-6 text-muted-foreground' />
							)}
						</div>
						<div className='space-y-2'>
							<h2 className='text-xl font-semibold'>
								{tab === 'documents'
									? t('seo_community_documents_empty')
									: t('seo_community_empty')}
							</h2>
							<p className='max-w-lg text-sm leading-6 text-muted-foreground'>
								{tab === 'documents'
									? t('seo_community_documents_empty_description')
									: t('seo_community_empty_description')}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				{((tab === 'sections' && sections?.has_more) ||
					(tab === 'documents' && documents?.has_more)) &&
				nextStart ? (
					<Link href={`/community?${nextHref.toString()}`}>
						<Button className='rounded-2xl'>
							{t('seo_community_next')}
							<ArrowRight />
						</Button>
					</Link>
				) : null}
			</div>
		</div>
	);
};

export default CommunityPage;
