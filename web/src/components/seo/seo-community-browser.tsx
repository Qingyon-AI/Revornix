'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ArrowRight, Compass, FileText } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';

import documentApi from '@/api/document';
import sectionApi from '@/api/section';
import PublicSectionCard from '@/components/seo/public-section-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentCategory } from '@/enums/document';
import {
	getPublicSectionHref,
	type PublicDocumentPagination,
	type PublicSectionPagination,
} from '@/lib/seo';
import { publicRequest } from '@/lib/request-public';
import { replacePath } from '@/lib/utils';

type CommunityTab = 'sections' | 'documents';

const getDocumentCategoryLabel = (
	category: number,
	t: ReturnType<typeof useTranslations>,
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

const SeoCommunityBrowser = ({
	tab,
	keyword,
	initialSections,
	initialDocuments,
}: {
	tab: CommunityTab;
	keyword?: string;
	initialSections: PublicSectionPagination | null;
	initialDocuments: PublicDocumentPagination | null;
}) => {
	const t = useTranslations();
	const locale = useLocale();
	const { ref: bottomRef, inView } = useInView({
		rootMargin: '320px 0px',
	});
	const [sections, setSections] = useState(initialSections);
	const [documents, setDocuments] = useState(initialDocuments);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	useEffect(() => {
		setSections(initialSections);
		setDocuments(initialDocuments);
		setIsLoadingMore(false);
	}, [initialSections, initialDocuments, tab, keyword]);

	const total = tab === 'documents' ? documents?.total ?? 0 : sections?.total ?? 0;
	const hasMore =
		tab === 'documents' ? documents?.has_more ?? false : sections?.has_more ?? false;
	const nextStart =
		tab === 'documents' ? documents?.next_start : sections?.next_start;

	useEffect(() => {
		const loadMore = async () => {
			if (!inView || isLoadingMore || !hasMore || nextStart == null) {
				return;
			}

			setIsLoadingMore(true);
			try {
				if (tab === 'sections') {
					const response = await publicRequest<PublicSectionPagination>(
						sectionApi.searchPublicSection,
						{
							data: {
								keyword,
								start: nextStart,
								limit: sections?.limit ?? 12,
								desc: true,
							},
						},
					);

					setSections((current) => {
						const currentElements = current?.elements ?? [];
						const merged = new Map(currentElements.map((item) => [item.id, item]));
						response.elements.forEach((item) => {
							merged.set(item.id, item);
						});
						return {
							...response,
							elements: Array.from(merged.values()),
						};
					});
					return;
				}

				const response = await publicRequest<PublicDocumentPagination>(
					documentApi.searchPublicDocument,
					{
						data: {
							keyword,
							start: nextStart,
							limit: documents?.limit ?? 12,
							desc: true,
						},
					},
				);

				setDocuments((current) => {
					const currentElements = current?.elements ?? [];
					const merged = new Map(currentElements.map((item) => [item.id, item]));
					response.elements.forEach((item) => {
						merged.set(item.id, item);
					});
					return {
						...response,
						elements: Array.from(merged.values()),
					};
				});
			} finally {
				setIsLoadingMore(false);
			}
		};

		void loadMore();
	}, [documents?.limit, hasMore, inView, isLoadingMore, keyword, nextStart, sections?.limit, tab]);

	return (
		<>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex items-center gap-2 text-sm text-muted-foreground'>
					{tab === 'documents' ? (
						<FileText className='size-4' />
					) : (
						<Compass className='size-4' />
					)}
					<span>
						{tab === 'documents'
							? t('seo_community_documents_result', { count: total })
							: t('seo_community_result', { count: total })}
					</span>
				</div>
				{keyword ? (
					<div className='text-sm text-muted-foreground'>“{keyword}”</div>
				) : null}
			</div>

			{tab === 'sections' && sections?.elements && sections.elements.length > 0 ? (
				<div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
					{sections.elements.map((section, index) => (
						<div
							key={`${section.id}-${section.publish_uuid ?? 'private'}`}
							ref={index === sections.elements.length - 1 ? bottomRef : undefined}>
							<PublicSectionCard section={section} />
						</div>
					))}
				</div>
			) : null}

			{tab === 'documents' && documents?.elements && documents.elements.length > 0 ? (
				<div className='grid gap-5 md:grid-cols-2 xl:grid-cols-3'>
					{documents.elements.map((document, index) => (
						<div
							key={document.id}
							ref={index === documents.elements.length - 1 ? bottomRef : undefined}>
							<div className='group flex h-full flex-col overflow-hidden rounded-[24px] border border-border/60 bg-background/28 transition-colors duration-200 hover:border-border/80 hover:bg-background/40'>
								<Link href={`/document/${document.id}`} className='block'>
								<div className='relative h-44 w-full overflow-hidden bg-muted/30'>
									{document.cover ? (
										<img
											src={document.cover}
											alt={document.title}
											className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]'
										/>
									) : (
										<div className='flex h-full w-full items-center justify-center'>
											<div className='flex items-center justify-center rounded-[20px] border border-border/60 bg-background/70 p-4 text-muted-foreground'>
												<FileText size={24} />
											</div>
										</div>
									)}
									<div className='absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent' />
								</div>
								</Link>

								<div className='flex flex-1 flex-col gap-4 p-5'>
									<Link href={`/document/${document.id}`} className='block space-y-4'>
										<div className='space-y-2'>
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
											<p className='line-clamp-3 text-sm leading-6 text-muted-foreground'>
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
									</Link>

									<div className='mt-auto flex flex-col gap-3 text-xs text-muted-foreground'>
										{document.creator ? (
										<Link
											href={`/user/${document.creator.id}`}
											className='flex items-center gap-2 transition-colors hover:text-foreground'>
											<Avatar className='size-7'>
												<AvatarImage
													src={replacePath(
														document.creator.avatar,
														document.creator.id,
													)}
													alt={document.creator.nickname}
													className='object-cover'
												/>
												<AvatarFallback className='text-[10px] font-semibold'>
													{document.creator.nickname.slice(0, 1)}
												</AvatarFallback>
											</Avatar>
											<div className='min-w-0'>
												<div className='line-clamp-1 text-sm text-foreground'>
													{document.creator.nickname}
												</div>
												<div className='line-clamp-1'>
													{formatDistance(
														new Date(
															document.update_time ?? document.create_time,
														),
														new Date(),
														{
															addSuffix: true,
															locale: locale === 'zh' ? zhCN : enUS,
														},
													)}
												</div>
											</div>
										</Link>
										) : null}

										<div className='flex flex-wrap gap-2'>
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
								</div>
							</div>
						</div>
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

			{isLoadingMore ? (
				<div className='flex justify-center text-sm text-muted-foreground'>
					Loading...
				</div>
			) : null}

			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				{hasMore && nextStart ? (
					<Link href={buildCommunityHref({ tab, keyword, start: nextStart })}>
						<Button className='rounded-2xl'>
							{t('seo_community_next')}
							<ArrowRight />
						</Button>
					</Link>
				) : null}
			</div>
		</>
	);
};

export default SeoCommunityBrowser;
