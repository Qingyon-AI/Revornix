'use client';

import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import {
	ArrowDownNarrowWide,
	ArrowDownWideNarrow,
	FileText,
	SlidersHorizontalIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import DocumentCard from '@/components/document/document-card';
import DocumentCardSkeleton from '@/components/document/document-card-skeleton';
import DocumentListTable from '@/components/document/document-list-table';
import CardViewToggle from '@/components/ui/card-view-toggle';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { useCardViewMode } from '@/hooks/use-card-view-mode';
import { getPublicLabels, searchPublicDocument } from '@/service/document';

const CommunityDocumentPage = () => {
	const t = useTranslations();
	const { viewMode, setViewMode } = useCardViewMode('document-list-view-mode');
	const [keyword, setKeyword] = useState('');
	const [desc, setDesc] = useState(true);
	const [labelIds, setLabelIds] = useState<number[]>();
	const { ref: bottomRef, inView } = useInView();
	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchPublicDocument', keyword, desc, labelIds],
		queryFn: (pageParam) => searchPublicDocument({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			keyword,
			label_ids: labelIds,
			desc,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword,
						label_ids: labelIds,
						desc,
					}
				: undefined;
		},
	});
	const documents = data?.pages.flatMap((page) => page.elements) || [];

	const { data: labels } = useQuery({
		queryKey: ['getPublicDocumentLabels'],
		queryFn: getPublicLabels,
	});

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [fetchNextPage, hasNextPage, inView, isFetching]);

	return (
		<>
			<div className='sticky top-[var(--private-top-header-height,3.5rem)] z-20 flex flex-row gap-3 px-5 py-4 backdrop-blur border-t border-border/75'>
				<Input
					placeholder={t('community_document_search_placeholder')}
					value={keyword}
					onChange={(event) => setKeyword(event.target.value)}
				/>
				<div className='flex flex-row gap-3 shrink-0'>
					<CardViewToggle value={viewMode} onChange={setViewMode} />
					<Popover>
						<PopoverTrigger asChild>
							<Button size='icon' variant='outline'>
								{desc ? <ArrowDownWideNarrow /> : <ArrowDownNarrowWide />}
							</Button>
						</PopoverTrigger>
						<PopoverContent className='flex flex-col w-fit p-0'>
							<Button
								variant='ghost'
								className='w-fit rounded-none text-xs'
								onClick={() => setDesc(true)}>
								{t('document_search_order_from_new')}
								<ArrowDownWideNarrow />
							</Button>
							<Button
								variant='ghost'
								className='w-fit rounded-none text-xs'
								onClick={() => setDesc(false)}>
								{t('document_search_order_from_old')}
								<ArrowDownNarrowWide />
							</Button>
						</PopoverContent>
					</Popover>
					<Sheet>
						<SheetTrigger asChild>
							<Button size='icon' variant='outline'>
								<SlidersHorizontalIcon />
							</Button>
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>{t('document_search_filter')}</SheetTitle>
								<SheetDescription>
									{t('community_document_filter_description')}
								</SheetDescription>
							</SheetHeader>
							<div className='px-4 overflow-auto'>
								<h1 className='font-bold text-sm mb-3'>
									{t('document_search_filter_form_label')}
								</h1>
								<p className='text-xs text-muted-foreground mb-3'>
									{t('document_search_filter_form_label_description')}
								</p>
								<div className='flex flex-row flex-wrap gap-2 items-center mb-3'>
									{labels?.data?.map((label) => (
										<div
											key={label.id}
											className='shrink-0 rounded border border-border p-2 w-fit text-xs flex flex-row items-center gap-2'>
											<Label
												htmlFor={`community_document_label_${label.id}`}
												className='text-xs'>
												{label.name}
											</Label>
											<Checkbox
												id={`community_document_label_${label.id}`}
												checked={
													Array.isArray(labelIds) &&
													labelIds.includes(label.id)
												}
												onCheckedChange={(checked) => {
													if (checked === true) {
														setLabelIds((prev) =>
															prev ? [...prev, label.id] : [label.id],
														);
														return;
													}
													setLabelIds((prev) =>
														prev
															? prev.filter((id) => id !== label.id)
															: [],
													);
												}}
											/>
										</div>
									))}
								</div>
								<div className='w-full flex flex-row justify-end gap-2'>
									<Button
										className='text-xs'
										onClick={() => {
											setLabelIds(labels?.data?.map((label) => label.id));
										}}>
										{t('select_all')}
									</Button>
									<Button
										className='text-xs'
										variant='secondary'
										onClick={() => {
											setLabelIds([]);
										}}>
										{t('clear')}
									</Button>
									<Button
										className='text-xs'
										variant='outline'
										onClick={() => {
											setLabelIds(undefined);
										}}>
										{t('document_search_filter_form_label_cancel')}
									</Button>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
			{isSuccess && documents.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<FileText />
						</EmptyMedia>
						<EmptyDescription>
							{t('community_documents_empty')}
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button
							variant='outline'
							onClick={() => {
								setKeyword('');
								setLabelIds(undefined);
							}}>
							{t('seo_community_reset')}
						</Button>
					</EmptyContent>
				</Empty>
			)}
			<div className='px-5 pb-5'>
				{viewMode === 'grid' ? (
					<div className='grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4'>
						{documents.map((document, index) => (
							<div
								className='h-full'
								key={document.id}
								ref={index === documents.length - 1 ? bottomRef : undefined}>
								<DocumentCard
									document={document}
									onLabelClick={(labelId) => setLabelIds([labelId])}
								/>
							</div>
						))}
						{isFetchingNextPage &&
							data &&
							[...Array(12)].map((_, index) => (
								<DocumentCardSkeleton
									key={`next-${index}`}
									layout={viewMode}
								/>
							))}
					</div>
				) : data ? (
					<DocumentListTable
						documents={documents}
						lastRowRef={bottomRef}
						loadingMore={isFetchingNextPage && Boolean(data)}
					/>
				) : null}
				{isFetching && !data ? (
					viewMode === 'grid' ? (
						<div className='grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4'>
							{[...Array(12)].map((_, index) => (
								<DocumentCardSkeleton key={index} layout={viewMode} />
							))}
						</div>
					) : (
						<DocumentListTable documents={[]} loadingCentered />
					)
				) : null}
			</div>
		</>
	);
};

export default CommunityDocumentPage;
