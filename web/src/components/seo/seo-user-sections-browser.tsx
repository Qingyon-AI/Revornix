'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { useEffect, useState } from 'react';
import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { useInView } from 'react-intersection-observer';
import {
	BookMarked,
	BookTextIcon,
	Compass,
	FileText,
	Search,
	Users,
} from 'lucide-react';

import PublicSectionCard from '@/components/seo/public-section-card';
import SeoSectionSubscribeButton from '@/components/seo/seo-section-subscribe-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import CardViewToggle from '@/components/ui/card-view-toggle';
import { Input } from '@/components/ui/input';
import { DocumentCategory } from '@/enums/document';
import { useCardViewMode } from '@/hooks/use-card-view-mode';
import { getSectionCoverSrc } from '@/lib/section-cover';
import documentApi from '@/api/document';
import sectionApi from '@/api/section';
import { publicRequest } from '@/lib/request-public';
import {
	getPublicSectionHref,
	type PublicDocumentPagination,
	type PublicSectionInfo,
} from '@/lib/seo';
import { cn, replacePath } from '@/lib/utils';

type SeoUserBrowserTab = 'sections' | 'documents';

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

const SeoUserSectionListRow = ({
	section,
}: {
	section: PublicSectionInfo;
}) => {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const href = getPublicSectionHref(section);
	const coverSrc = getSectionCoverSrc(section);
	const creatorAvatar = replacePath(section.creator.avatar, section.creator.id);

	return (
		<div className='rounded-[24px] border border-border/60 bg-background/28 px-4 py-4'>
			<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
				<div className='min-w-0 flex-1'>
					<div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
						<Link
							href={href}
							className='block h-28 w-full shrink-0 overflow-hidden rounded-[20px] border border-border/50 bg-background/45 sm:w-44'>
							{coverSrc ? (
								<img
									src={coverSrc}
									alt={section.title}
									className='h-full w-full object-cover'
								/>
							) : (
								<div className='flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(70,33,42,0.82),rgba(30,41,59,0.78))] text-white/70'>
									<BookTextIcon className='size-7' />
								</div>
							)}
						</Link>

						<div className='min-w-0 flex-1 space-y-3'>
							<div className='space-y-2'>
								<div className='flex flex-wrap items-center gap-2'>
									{section.is_day_section ? (
										<div className='inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300'>
											{t('section_day_badge')}
										</div>
									) : null}
								</div>
								<Link href={href} className='block'>
									<h3 className='line-clamp-2 text-lg font-semibold leading-7'>
										{section.title || t('section_title_empty')}
									</h3>
								</Link>
								<p className='line-clamp-2 text-sm leading-7 text-muted-foreground'>
									{section.description || t('section_description_empty')}
								</p>
							</div>

							<div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
								<button
									type='button'
									className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/45 px-2.5 py-1.5 text-left transition-colors hover:bg-background/70'
									onClick={() => {
										router.push(`/user/${section.creator.id}`);
									}}>
									<Avatar className='size-5'>
										<AvatarImage
											src={creatorAvatar}
											alt={section.creator.nickname}
											className='object-cover'
										/>
										<AvatarFallback className='text-[10px] font-semibold'>
											{section.creator.nickname.slice(0, 1) ?? '?'}
										</AvatarFallback>
									</Avatar>
									<span>{section.creator.nickname}</span>
								</button>
								<div className='rounded-full border border-border/50 bg-background/45 px-3 py-1.5'>
									{formatDistance(
										new Date(section.update_time ?? section.create_time),
										new Date(),
										{
											addSuffix: true,
											locale: locale === 'zh' ? zhCN : enUS,
										},
									)}
								</div>
								<div className='inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/45 px-3 py-1.5'>
									<BookMarked className='size-3.5' />
									<span>
										{t('section_card_documents_count', {
											section_documents_count: section.documents_count ?? 0,
										})}
									</span>
								</div>
								<div className='inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/45 px-3 py-1.5'>
									<Users className='size-3.5' />
									<span>
										{t('section_card_subscribers_count', {
											section_subscribers_count:
												section.subscribers_count ?? 0,
										})}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className='flex shrink-0 items-center justify-end'>
					<SeoSectionSubscribeButton
						sectionId={section.id}
						creatorId={section.creator.id}
						initialIsSubscribed={section.is_subscribed}
						className='h-9 px-4 text-xs'
					/>
				</div>
			</div>
		</div>
	);
};

const SeoUserSectionsBrowser = ({
	userId,
	tab,
	sections,
	documents,
	keyword,
	total,
	hasMore,
	nextStart,
}: {
	userId: number;
	tab: SeoUserBrowserTab;
	sections: PublicSectionInfo[];
	documents: PublicDocumentPagination['elements'];
	keyword: string;
	total: number;
	hasMore?: boolean;
	nextStart?: number | null;
}) => {
	const t = useTranslations();
	const { ref: bottomRef, inView } = useInView({
		rootMargin: '320px 0px',
	});
	const { viewMode, setViewMode } = useCardViewMode(
		`seo-user-${tab}-view-mode`,
	);
	const [sectionItems, setSectionItems] = useState(sections);
	const [documentItems, setDocumentItems] = useState(documents);
	const [totalCount, setTotalCount] = useState(total);
	const [hasMoreState, setHasMoreState] = useState(hasMore ?? false);
	const [nextStartState, setNextStartState] = useState(nextStart ?? null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const nextHref = new URLSearchParams();
	if (tab !== 'sections') {
		nextHref.set('tab', tab);
	}
	if (keyword) {
		nextHref.set('q', keyword);
	}
	if (hasMoreState && nextStartState !== undefined && nextStartState !== null) {
		nextHref.set('start', String(nextStartState));
	}

	useEffect(() => {
		setSectionItems(sections);
		setDocumentItems(documents);
		setTotalCount(total);
		setHasMoreState(hasMore ?? false);
		setNextStartState(nextStart ?? null);
		setIsLoadingMore(false);
	}, [sections, documents, total, hasMore, nextStart, tab, keyword, userId]);

	useEffect(() => {
		const loadMore = async () => {
			if (!inView || isLoadingMore || !hasMoreState || nextStartState == null) {
				return;
			}

			setIsLoadingMore(true);
			try {
				if (tab === 'sections') {
					const response = await publicRequest<{
						total: number;
						has_more: boolean;
						next_start?: number | null;
						elements: PublicSectionInfo[];
					}>(sectionApi.searchUserSection, {
						data: {
							user_id: userId,
							keyword: keyword || undefined,
							start: nextStartState,
							limit: 10,
							desc: true,
						},
					});

					setSectionItems((current) => {
						const merged = new Map(current.map((item) => [item.id, item]));
						response.elements.forEach((item) => {
							merged.set(item.id, item);
						});
						return Array.from(merged.values());
					});
					setTotalCount(response.total ?? 0);
					setHasMoreState(response.has_more);
					setNextStartState(response.next_start ?? null);
					return;
				}

				const response = await publicRequest<PublicDocumentPagination>(
					documentApi.searchPublicDocument,
					{
						data: {
							creator_id: userId,
							keyword: keyword || undefined,
							start: nextStartState,
							limit: 12,
							desc: true,
						},
					},
				);

				setDocumentItems((current) => {
					const merged = new Map(current.map((item) => [item.id, item]));
					response.elements.forEach((item) => {
						merged.set(item.id, item);
					});
					return Array.from(merged.values());
				});
				setTotalCount(response.total ?? 0);
				setHasMoreState(response.has_more);
				setNextStartState(response.next_start ?? null);
			} finally {
				setIsLoadingMore(false);
			}
		};

		void loadMore();
	}, [inView, isLoadingMore, hasMoreState, nextStartState, tab, userId, keyword]);

	return (
		<div className='mx-auto w-full max-w-[1160px] rounded-[28px] border border-border/60 bg-background/24'>
			<div className='sticky top-14 z-10 rounded-t-[28px] border-b border-border/60 bg-background/92 px-5 py-5 backdrop-blur-xl'>
				<div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
					<div className='min-w-0 space-y-2'>
						<h2 className='text-xl font-semibold tracking-tight sm:text-2xl'>
							{tab === 'documents'
								? t('user_detail_documents_title')
								: t('user_detail_sections_title')}
						</h2>
						<p className='max-w-[40rem] text-sm leading-6 text-muted-foreground'>
							{tab === 'documents'
								? t('user_detail_documents_description')
								: t('user_detail_sections_description')}
						</p>
					</div>
					<div className='flex w-full min-w-0 flex-col gap-3 xl:max-w-[720px] xl:items-end'>
						<div className='flex w-full min-w-0 flex-wrap items-center gap-3 xl:justify-end'>
							<div className='inline-flex max-w-full rounded-2xl border border-border/60 bg-background/45 p-1'>
								<Button
									asChild
									variant='ghost'
									className={cn(
										'h-9 rounded-xl px-3 shadow-none',
										tab === 'sections'
											? 'border border-border/70 bg-background text-foreground hover:bg-background'
											: 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
									)}>
									<Link href={`/user/${userId}${keyword ? `?q=${encodeURIComponent(keyword)}` : ''}`}>
										<Compass className='mr-2 size-4' />
										{t('seo_community_sections_tab')}
									</Link>
								</Button>
								<Button
									asChild
									variant='ghost'
									className={cn(
										'h-9 rounded-xl px-3 shadow-none',
										tab === 'documents'
											? 'border border-border/70 bg-background text-foreground hover:bg-background'
											: 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
									)}>
									<Link
										href={`/user/${userId}?tab=documents${
											keyword ? `&q=${encodeURIComponent(keyword)}` : ''
										}`}>
										<FileText className='mr-2 size-4' />
										{t('seo_community_documents_tab')}
									</Link>
								</Button>
							</div>
							<CardViewToggle
								value={viewMode}
								onChange={setViewMode}
								className='ml-auto h-11 shrink-0 rounded-2xl border-border/60 bg-background/45 sm:ml-0 [&_button]:h-full [&_button]:w-11'
							/>
						</div>
						<form action={`/user/${userId}`} className='w-full min-w-0 xl:max-w-[520px]'>
							<input type='hidden' name='tab' value={tab} />
							<div className='relative'>
								<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									name='q'
									defaultValue={keyword}
									placeholder={
										tab === 'documents'
											? t('user_detail_documents_search_placeholder')
											: t('user_detail_sections_search_placeholder')
									}
									className='h-11 rounded-2xl border-border/60 bg-background/45 pl-9'
								/>
							</div>
						</form>
					</div>
				</div>
			</div>
			<div className='px-5 py-5'>
				<div className='mb-5 flex items-center gap-2 text-sm text-muted-foreground'>
					{tab === 'documents' ? (
						<FileText className='size-4' />
					) : (
						<Compass className='size-4' />
					)}
					<span>
						{tab === 'documents'
							? t('user_detail_documents_result', { count: totalCount })
							: t('user_detail_sections_result', { count: totalCount })}
					</span>
					{keyword ? <span>“{keyword}”</span> : null}
				</div>
				{tab === 'sections' && sectionItems.length === 0 ? (
					<div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/50 px-6 text-center'>
						<div className='max-w-md'>
							<h3 className='text-lg font-semibold tracking-tight'>
								{keyword
									? t('user_detail_sections_search_empty')
									: t('user_sections_empty')}
							</h3>
							<p className='mt-2 text-sm leading-7 text-muted-foreground'>
								{keyword ? `"${keyword}"` : t('user_detail_sections_description')}
							</p>
						</div>
					</div>
				) : null}
				{tab === 'documents' && documentItems.length === 0 ? (
					<div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/50 px-6 text-center'>
						<div className='max-w-md'>
							<h3 className='text-lg font-semibold tracking-tight'>
								{keyword
									? t('user_detail_documents_search_empty')
									: t('user_documents_empty')}
							</h3>
							<p className='mt-2 text-sm leading-7 text-muted-foreground'>
								{keyword ? `"${keyword}"` : t('user_detail_documents_description')}
							</p>
						</div>
					</div>
				) : null}
				{tab === 'sections' && sectionItems.length > 0 && viewMode === 'grid' ? (
					<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
						{sectionItems.map((section) => (
							<div className='h-full' key={section.id}>
								<PublicSectionCard section={section} />
							</div>
						))}
					</div>
				) : null}
				{tab === 'sections' && sectionItems.length > 0 && viewMode !== 'grid' ? (
					<div className='space-y-4'>
						{sectionItems.map((section, index) => (
							<div
								key={section.id}
								ref={index === sectionItems.length - 1 ? bottomRef : undefined}>
								<SeoUserSectionListRow section={section} />
							</div>
						))}
					</div>
				) : null}
				{tab === 'documents' && documentItems.length > 0 ? (
					<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
						{documentItems.map((document, index) => (
							<div
								key={document.id}
								ref={index === documentItems.length - 1 ? bottomRef : undefined}>
								<Link
									href={`/document/${document.id}`}
									className='group flex h-full flex-col overflow-hidden rounded-[24px] border border-border/60 bg-background/28 transition-colors duration-200 hover:border-border/80 hover:bg-background/40'>
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
											<h3 className='line-clamp-2 text-lg font-semibold leading-7'>
												{document.title}
											</h3>
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
							</div>
						))}
					</div>
				) : null}
				{isLoadingMore ? (
					<div className='mt-5 flex justify-center text-sm text-muted-foreground'>
						Loading...
					</div>
				) : null}
				{hasMoreState && nextStartState !== undefined && nextStartState !== null ? (
					<div className='mt-5 flex justify-end'>
						<Link href={`/user/${userId}?${nextHref.toString()}`}>
							<Button variant='outline' className='rounded-2xl'>
								{t('seo_community_next')}
							</Button>
						</Link>
					</div>
				) : null}
			</div>
		</div>
	);
};

export default SeoUserSectionsBrowser;
