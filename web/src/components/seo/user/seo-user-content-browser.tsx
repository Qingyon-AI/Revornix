'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Compass, FileText, Search } from 'lucide-react';

import PublicSectionCard from '@/components/seo/shared/public-section-card';
import PublicDocumentCard from '@/components/seo/shared/public-document-card';
import {
	SeoCommunityDocumentListItem,
	SeoCommunitySectionListItem,
} from '@/components/seo/community/seo-community-list-item';
import { Button } from '@/components/ui/button';
import CardViewToggle from '@/components/ui/card-view-toggle';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCardViewMode } from '@/hooks/use-card-view-mode';
import documentApi from '@/api/document';
import sectionApi from '@/api/section';
import { publicRequest } from '@/lib/request-public';
import {
	type PublicDocumentPagination,
	type PublicSectionInfo,
} from '@/lib/seo';
import { cn } from '@/lib/utils';

type SeoUserBrowserTab = 'sections' | 'documents';

const SeoUserContentBrowser = ({
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
	const { viewMode, setViewMode, isReady: isViewModeReady } = useCardViewMode(
		`seo-user-${tab}-view-mode`,
		'list',
	);
	const [sectionItems, setSectionItems] = useState(sections);
	const [documentItems, setDocumentItems] = useState(documents);
	const [totalCount, setTotalCount] = useState(total);
	const [hasMoreState, setHasMoreState] = useState(hasMore ?? false);
	const [nextStartState, setNextStartState] = useState(nextStart ?? null);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const loadMore = async (source: 'observer' | 'button') => {
		if (!inView && source === 'observer') {
			return;
		}

		if (isLoadingMore || !hasMoreState || nextStartState == null) {
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
						limit: 12,
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
		} catch (error) {
			console.error('[SEO user] loadMore failed', error);
		} finally {
			setIsLoadingMore(false);
		}
	};

	useEffect(() => {
		setSectionItems(sections);
		setDocumentItems(documents);
		setTotalCount(total);
		setHasMoreState(hasMore ?? false);
		setNextStartState(nextStart ?? null);
		setIsLoadingMore(false);
	}, [sections, documents, total, hasMore, nextStart, tab, keyword, userId]);

	useEffect(() => {
		void loadMore('observer');
	}, [
		inView,
		isLoadingMore,
		hasMoreState,
		nextStartState,
		tab,
		userId,
		keyword,
	]);

	return (
		<div className='mx-auto w-full max-w-[1160px]'>
			<div className='sticky top-14 z-10 border-b border-border/60 bg-background/94 py-3 backdrop-blur-xl'>
				<div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
					<div className='flex min-w-0 flex-wrap items-center gap-3'>
						<div className='inline-flex max-w-full rounded-xl border border-border/60 bg-background/65 p-0.5'>
							<Button
								asChild
								variant='ghost'
								className={cn(
									'h-9 rounded-lg px-3 shadow-none',
									tab === 'sections'
										? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
										: 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
								)}>
								<Link
									href={`/user/${userId}${keyword ? `?q=${encodeURIComponent(keyword)}` : ''}`}>
									<Compass className='mr-2 size-4' />
									{t('seo_community_sections_tab')}
								</Link>
							</Button>
							<Button
								asChild
								variant='ghost'
								className={cn(
									'h-9 rounded-lg px-3 shadow-none',
									tab === 'documents'
										? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
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
						<div className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
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
					</div>
					<div className='flex w-full min-w-0 flex-col gap-2 flex-row xl:max-w-[560px] xl:items-center'>
						<form
							action={`/user/${userId}`}
							className='w-full min-w-0'>
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
									className='h-10 rounded-xl border-border/60 bg-background/65 pl-9 shadow-none'
								/>
							</div>
						</form>
						<CardViewToggle
							value={viewMode}
							onChange={setViewMode}
							className='h-10 shrink-0 rounded-xl border-border/60 bg-background/65 [&_button]:h-full [&_button]:w-10'
						/>
					</div>
				</div>
			</div>
			<div className='py-5'>
				{isViewModeReady && tab === 'sections' && sectionItems.length === 0 ? (
					<div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/50 px-6 text-center'>
						<div className='max-w-md'>
							<h3 className='text-lg font-semibold tracking-tight'>
								{keyword
									? t('user_detail_sections_search_empty')
									: t('user_sections_empty')}
							</h3>
							<p className='mt-2 text-sm leading-7 text-muted-foreground'>
								{keyword
									? `"${keyword}"`
									: t('user_detail_sections_description')}
							</p>
						</div>
					</div>
				) : null}
				{isViewModeReady && tab === 'documents' && documentItems.length === 0 ? (
					<div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/50 px-6 text-center'>
						<div className='max-w-md'>
							<h3 className='text-lg font-semibold tracking-tight'>
								{keyword
									? t('user_detail_documents_search_empty')
									: t('user_documents_empty')}
							</h3>
							<p className='mt-2 text-sm leading-7 text-muted-foreground'>
								{keyword
									? `"${keyword}"`
									: t('user_detail_documents_description')}
							</p>
						</div>
					</div>
				) : null}
				{isViewModeReady &&
				tab === 'sections' &&
				sectionItems.length > 0 &&
				viewMode === 'grid' ? (
					<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
						{sectionItems.map((section, index) => (
							<div
								className='h-full'
								key={section.id}
								ref={
									index === sectionItems.length - 1
										? bottomRef
										: undefined
								}>
								<PublicSectionCard section={section} />
							</div>
						))}
					</div>
				) : null}
				{isViewModeReady &&
				tab === 'sections' &&
				sectionItems.length > 0 &&
				viewMode !== 'grid' ? (
					<div>
						{sectionItems.map((section, index) => (
							<div
								key={section.id}
								ref={
									index === sectionItems.length - 1
										? bottomRef
										: undefined
								}>
								<SeoCommunitySectionListItem section={section} />
								{index !== sectionItems.length - 1 ? (
									<Separator className='my-1' />
								) : null}
							</div>
						))}
					</div>
				) : null}
				{isViewModeReady &&
				tab === 'documents' &&
				documentItems.length > 0 &&
				viewMode === 'grid' ? (
					<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
						{documentItems.map((document, index) => (
							<div
								key={document.id}
								ref={
									index === documentItems.length - 1
										? bottomRef
										: undefined
								}>
								<PublicDocumentCard document={document} />
							</div>
						))}
					</div>
				) : null}
				{isViewModeReady &&
				tab === 'documents' &&
				documentItems.length > 0 &&
				viewMode !== 'grid' ? (
					<div>
						{documentItems.map((document, index) => (
							<div
								key={document.id}
								ref={
									index === documentItems.length - 1
										? bottomRef
										: undefined
								}>
								<SeoCommunityDocumentListItem document={document} />
								{index !== documentItems.length - 1 ? (
									<Separator className='my-1' />
								) : null}
							</div>
						))}
					</div>
				) : null}
				{isViewModeReady && isLoadingMore ? (
					<div className='mt-5 flex justify-center text-sm text-muted-foreground'>
						Loading...
					</div>
				) : null}
				{isViewModeReady &&
				hasMoreState &&
				nextStartState !== undefined &&
				nextStartState !== null ? (
					<div className='mt-5 flex justify-end'>
						<Button
							type='button'
							variant='outline'
							className='rounded-2xl'
							onClick={() => {
								void loadMore('button');
							}}
							disabled={isLoadingMore}>
							{t('seo_community_next')}
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
};

export default SeoUserContentBrowser;
