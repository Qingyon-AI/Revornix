'use client';

import { useEffect, useState, useTransition } from 'react';
import { useInView } from 'react-intersection-observer';
import {
	ArrowRight,
	Compass,
	FileText,
	Loader2,
	RefreshCw,
	UserRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import documentApi from '@/api/document';
import sectionApi from '@/api/section';
import SeoCommunityHotSidebar from '@/components/seo/community/seo-community-hot-sidebar';
import SeoCommunityPoem from '@/components/seo/community/seo-community-poem';
import {
	SeoCommunityDocumentListItem,
	SeoCommunitySectionListItem,
} from '@/components/seo/community/seo-community-list-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
	type PublicLabel,
	type PublicDocumentPagination,
	type PublicSectionPagination,
} from '@/lib/seo';
import { request } from '@/lib/request';
import { cn } from '@/lib/utils';

type CommunityTab = 'sections' | 'documents';

const buildCommunityHref = ({
	tab,
	keyword,
	start,
	labelId,
}: {
	tab: CommunityTab;
	keyword?: string;
	start?: number;
	labelId?: number;
}) => {
	const params = new URLSearchParams();
	if (tab !== 'documents') {
		params.set('tab', tab);
	}
	if (keyword) {
		params.set('q', keyword);
	}
	if (start !== undefined) {
		params.set('start', String(start));
	}
	if (labelId !== undefined) {
		params.set('label', String(labelId));
	}
	const query = params.toString();
	return query ? `/community?${query}` : '/community';
};

const CommunityControls = ({
	tab,
	keyword,
	labelId,
}: {
	tab: CommunityTab;
	keyword?: string;
	labelId?: number;
}) => {
	const t = useTranslations();

	return (
		<div className='flex flex-col gap-3'>
			<div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
				<div className='flex min-w-0 flex-wrap items-center gap-2'>
					<Button
						asChild
						variant='outline'
						className={cn(
							'h-9 rounded-xl px-3 shadow-none transition-colors',
							tab === 'documents'
								? 'border-foreground bg-foreground text-background hover:bg-foreground hover:text-background dark:border-foreground dark:bg-foreground dark:text-background dark:hover:bg-foreground dark:hover:text-background'
								: 'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:bg-background dark:hover:bg-muted dark:hover:text-foreground',
						)}>
						<Link href={buildCommunityHref({ tab: 'documents', keyword, labelId })}>
							<FileText className='mr-2 size-4' />
							{t('seo_community_documents_tab')}
						</Link>
					</Button>
					<Button
						asChild
						variant='outline'
						className={cn(
							'h-9 rounded-xl px-3 shadow-none transition-colors',
							tab === 'sections'
								? 'border-foreground bg-foreground text-background hover:bg-foreground hover:text-background dark:border-foreground dark:bg-foreground dark:text-background dark:hover:bg-foreground dark:hover:text-background'
								: 'border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground dark:bg-background dark:hover:bg-muted dark:hover:text-foreground',
						)}>
						<Link href={buildCommunityHref({ tab: 'sections', keyword, labelId })}>
							<Compass className='mr-2 size-4' />
							{t('seo_community_sections_tab')}
						</Link>
					</Button>
				</div>

				<div className='flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-muted-foreground sm:text-sm'>
					<span className='inline-flex items-center gap-1.5'>
						<Compass className='size-3.5' />
						{tab === 'documents'
							? t('seo_community_channel_related_sections')
							: t('seo_community_channel_section_overview')}
					</span>
					<span className='inline-flex items-center gap-1.5'>
						<UserRound className='size-3.5' />
						{tab === 'documents'
							? t('seo_community_channel_source_materials')
							: t('seo_community_channel_creators')}
					</span>
					<span className='inline-flex items-center gap-1.5'>
						<FileText className='size-3.5' />
						{tab === 'documents'
							? t('seo_community_channel_readable_documents')
							: t('seo_community_channel_linked_documents')}
					</span>
				</div>
			</div>
		</div>
	);
};

const SeoCommunityBrowser = ({
	tab,
	keyword,
	labelId,
	labels,
	initialSections,
	initialDocuments,
	loadFailed = false,
}: {
	tab: CommunityTab;
	keyword?: string;
	labelId?: number;
	labels: PublicLabel[];
	initialSections: PublicSectionPagination | null;
	initialDocuments: PublicDocumentPagination | null;
	loadFailed?: boolean;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const [isRetrying, startRetry] = useTransition();
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
	}, [initialSections, initialDocuments, tab, keyword, labelId]);

	const total =
		tab === 'documents' ? (documents?.total ?? 0) : (sections?.total ?? 0);
	const hasMore =
		tab === 'documents'
			? (documents?.has_more ?? false)
			: (sections?.has_more ?? false);
	const nextStart =
		tab === 'documents' ? documents?.next_start : sections?.next_start;

	const activeLabelName = labels.find((item) => item.id === labelId)?.name;

	const loadMore = async ({
		source = 'observer',
	}: {
		source?: 'observer' | 'button';
	} = {}) => {
		if (source === 'observer' && !inView) {
			return;
		}

		if (isLoadingMore || !hasMore || nextStart == null) {
			return;
		}

		setIsLoadingMore(true);
		try {
			if (tab === 'sections') {
				const response = await request<PublicSectionPagination>(
					sectionApi.searchPublicSection,
					{
						data: {
							keyword,
							start: nextStart,
							limit: sections?.limit ?? 12,
							desc: true,
							label_ids: labelId !== undefined ? [labelId] : undefined,
						},
					},
				);

				setSections((current) => {
					const currentElements = current?.elements ?? [];
					const merged = new Map(
						currentElements.map((item) => [item.id, item]),
					);
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

			const response = await request<PublicDocumentPagination>(
				documentApi.searchPublicDocument,
				{
					data: {
						keyword,
						start: nextStart,
						limit: documents?.limit ?? 12,
						desc: true,
						label_ids: labelId !== undefined ? [labelId] : undefined,
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
		} catch (error) {
			console.error('[SEO community] loadMore failed', error);
		} finally {
			setIsLoadingMore(false);
		}
	};

	useEffect(() => {
		void loadMore({ source: 'observer' });
	}, [inView, hasMore, isLoadingMore, nextStart, tab, keyword, labelId]);

	const currentElements =
		tab === 'documents'
			? (documents?.elements ?? [])
			: (sections?.elements ?? []);

	return (
		<div className='max-w-full'>
			<section className='sticky top-14 z-10 -mx-4 hidden border-b border-border/70 bg-background/76 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:block lg:px-8'>
				<CommunityControls tab={tab} keyword={keyword} labelId={labelId} />
			</section>

			<div className='flex max-w-full flex-col-reverse gap-6 lg:flex-row lg:items-start'>
				<div className='min-w-0 lg:flex-1 space-y-3'>
					<section className='sticky top-14 z-10 -mx-4 border-b border-border/70 bg-background/76 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden'>
						<CommunityControls tab={tab} keyword={keyword} labelId={labelId} />
					</section>

					<div className='flex flex-col gap-4 pt-3'>
						<div className='flex flex-wrap gap-2'>
							<Link
								href={buildCommunityHref({ tab, keyword })}
								className={cn(
									'rounded-full border px-2 py-1 text-sm transition-colors',
									labelId === undefined
										? 'border-foreground bg-foreground text-background'
										: 'border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:text-foreground',
								)}>
								{t('admin_filter_all')}
							</Link>
							{labels.map((label) => (
								<Link
									key={label.id}
									href={buildCommunityHref({
										tab,
										keyword,
										labelId: label.id,
									})}
									className={cn(
										'rounded-full border px-2 py-1 text-sm transition-colors',
										label.id === labelId
											? 'border-foreground bg-foreground text-background'
											: 'border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:text-foreground',
									)}>
									# {label.name}
								</Link>
							))}
						</div>
					</div>

					<div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
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
						<div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
							{keyword ? <span>“{keyword}”</span> : null}
							{activeLabelName ? (
								<span className='rounded-full border border-border/50 px-2.5 py-1 text-xs'>
									# {activeLabelName}
								</span>
							) : null}
						</div>
					</div>

					<Separator />

					{currentElements.length === 0 && loadFailed ? (
						<Card className='border-none shadow-none'>
							<CardContent className='flex min-h-[260px] flex-col items-center justify-center gap-4 px-6 py-10 text-center'>
								<div className='flex size-14 items-center justify-center rounded-full border border-destructive/40 bg-destructive/5'>
									<RefreshCw className='size-6 text-destructive' />
								</div>
								<div className='space-y-2'>
									<h2 className='text-xl font-semibold'>
										{t('seo_community_load_failed_title')}
									</h2>
									<p className='max-w-lg text-sm leading-6 text-muted-foreground'>
										{t('seo_community_load_failed_description')}
									</p>
								</div>
								<Button
									variant='outline'
									className='rounded-full px-5'
									disabled={isRetrying}
									onClick={() => startRetry(() => router.refresh())}>
									{isRetrying ? (
										<Loader2 className='mr-2 size-4 animate-spin' />
									) : (
										<RefreshCw className='mr-2 size-4' />
									)}
									{t('seo_community_load_failed_retry')}
								</Button>
							</CardContent>
						</Card>
					) : currentElements.length > 0 ? (
						<div>
							{tab === 'sections'
								? sections?.elements.map((section, index) => (
										<>
											<div
												key={`${section.id}-${section.publish_uuid ?? 'private'}`}
												ref={
													index === sections.elements.length - 1
														? bottomRef
														: undefined
												}>
												<SeoCommunitySectionListItem section={section} />
											</div>
											{index !== sections.elements.length - 1 ? (
												<Separator className='my-3' />
											) : null}
										</>
									))
								: documents?.elements.map((document, index) => (
										<div key={document.id}>
											<div
												ref={
													index === documents.elements.length - 1
														? bottomRef
														: undefined
												}>
												<SeoCommunityDocumentListItem document={document} />
											</div>
											{index !== documents.elements.length - 1 ? (
												<Separator className='my-3' />
											) : null}
										</div>
									))}
						</div>
					) : (
						<Card className='border-none shadow-none'>
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
								<Button asChild variant='outline' className='rounded-full px-5'>
									<Link href='/community'>
										{t('seo_community_reset')}
										<ArrowRight className='ml-2 size-4' />
									</Link>
								</Button>
							</CardContent>
						</Card>
					)}

					{isLoadingMore ? (
						<div className='pt-1'>
							{Array.from({ length: 2 }).map((_, index) => (
								<div key={index}>
									<div className='px-1 py-4'>
										<div className='flex items-start gap-4'>
											<div className='min-w-0 flex-1'>
												<div className='space-y-1.5'>
													<Skeleton className='h-10 w-[36%] rounded-xl' />
													<Skeleton className='h-6 w-[58%] rounded-full' />
												</div>

												<div className='mt-2.5 flex flex-wrap items-center gap-2'>
													<Skeleton className='h-8 w-28 rounded-full' />
													<Skeleton className='h-8 w-20 rounded-full' />
													<Skeleton className='h-8 w-24 rounded-full' />
												</div>

												<div className='mt-3 flex items-center gap-2'>
													<Skeleton className='size-5 rounded-full' />
													<Skeleton className='h-4 w-28 rounded-full' />
													<Skeleton className='h-4 w-20 rounded-full' />
												</div>
											</div>

											<div className='hidden shrink-0 md:flex items-start gap-4'>
												<Skeleton className='mt-0.5 size-4 rounded-sm' />
												<Skeleton className='h-20 w-20 rounded-xl' />
											</div>
										</div>
									</div>
									{index !== 1 ? <Separator className='my-3' /> : null}
								</div>
							))}
						</div>
					) : null}

					{hasMore && nextStart != null ? (
						<div className='flex justify-center pt-2'>
							<Button
								variant='outline'
								className='rounded-full px-5'
								onClick={() => void loadMore({ source: 'button' })}
								disabled={isLoadingMore}>
								{t('seo_community_next')}
								<ArrowRight className='ml-2 size-4' />
							</Button>
						</div>
					) : null}
				</div>

				<div className='w-full max-w-full overflow-x-hidden lg:w-[360px] lg:shrink-0 lg:h-fit lg:self-start lg:overflow-visible lg:sticky lg:top-32 space-y-3'>
					<SeoCommunityPoem />
					<Separator />
					<SeoCommunityHotSidebar />
					<img
						src='/images/dog.gif'
						alt=''
						aria-hidden='true'
						className='mx-auto mt-6 size-24 object-contain opacity-90'
					/>
				</div>
			</div>
		</div>
	);
};

export default SeoCommunityBrowser;
