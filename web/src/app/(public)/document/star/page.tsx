'use client';

import { getLabels, searchUserStarDocument } from '@/service/document';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import DocumentCard from '@/components/document/document-card';
import DocumentCardSkeleton from '@/components/document/document-card-skeleton';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	ArrowDownNarrowWide,
	ArrowDownWideNarrow,
	SlidersHorizontalIcon,
} from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';

const StarDocumentPage = () => {
	const t = useTranslations();
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
		queryKey: ['searchMyStarDocument', keyword, desc, labelIds],
		queryFn: (pageParam) => searchUserStarDocument({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			keyword: keyword,
			label_ids: labelIds,
			desc: desc,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						keyword: keyword,
						label_ids: labelIds,
						desc: desc,
				  }
				: undefined;
		},
	});

	const documents = data?.pages.flatMap((page) => page.elements) || [];

	const { data: labels } = useQuery({
		queryKey: ['getDocumentLabels'],
		queryFn: getLabels,
	});

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);

	return (
		<>
			<Separator className='mb-5' />
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Input
					placeholder={t('document_search_placeholder')}
					value={keyword}
					onChange={(e) => setKeyword(e.target.value)}
				/>
				<div className='flex flex-row gap-3'>
					<Popover>
						<PopoverTrigger asChild>
							<Button size={'icon'} variant={'outline'}>
								{desc ? <ArrowDownWideNarrow /> : <ArrowDownNarrowWide />}
							</Button>
						</PopoverTrigger>
						<PopoverContent className='flex flex-col w-fit p-0'>
							<Button
								variant={'ghost'}
								className='w-fit rounded-none text-xs'
								onClick={() => setDesc(true)}>
								{t('document_search_order_from_new')}
								<ArrowDownWideNarrow />
							</Button>
							<Button
								variant={'ghost'}
								className='w-fit rounded-none text-xs'
								onClick={() => setDesc(false)}>
								{t('document_search_order_from_old')}
								<ArrowDownNarrowWide />
							</Button>
						</PopoverContent>
					</Popover>
					<Sheet>
						<SheetTrigger asChild>
							<Button size={'icon'} variant={'outline'}>
								<SlidersHorizontalIcon />
							</Button>
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>{t('document_search_filter')}</SheetTitle>
								<SheetDescription>
									{t('document_search_filter_description')}
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
									{labels?.data &&
										labels.data.map((label, index) => {
											return (
												<div
													key={index}
													className='shrink-0 rounded border border-border p-2 w-fit text-xs flex flex-row items-center gap-2'>
													<Label
														htmlFor={`label_${label.id}`}
														className='text-xs'>
														{label.name}
													</Label>
													<Checkbox
														id={`label_${label.id}`}
														checked={
															Array.isArray(labelIds) &&
															labelIds.includes(label.id)
														}
														onCheckedChange={(e) => {
															if (e) {
																setLabelIds((prev) => {
																	if (prev) {
																		return [...prev, label.id];
																	} else {
																		return [label.id];
																	}
																});
															} else {
																setLabelIds((prev) => {
																	if (prev) {
																		return prev.filter((id) => id !== label.id);
																	} else {
																		return [];
																	}
																});
															}
														}}
													/>
												</div>
											);
										})}
								</div>
								<div className='w-full flex flex-row justify-end gap-2'>
									<Button
										className='text-xs'
										onClick={() => {
											setLabelIds(labels?.data.map((label) => label.id));
										}}>
										{t('select_all')}
									</Button>
									<Button
										className='text-xs'
										variant={'secondary'}
										onClick={() => {
											setLabelIds([]);
										}}>
										{t('clear')}
									</Button>
									<Button
										className='text-xs'
										variant={'outline'}
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
				<div className='flex flex-col items-center justify-center h-full'>
					<p className='text-sm text-muted-foreground'>
						{t('documents_empty')}
					</p>
				</div>
			)}
			<div className='grid grid-cols-1 gap-4 md:grid-cols-4 px-5 pb-5'>
				{documents &&
					documents.map((document, index) => {
						return <DocumentCard key={index} document={document} />;
					})}
				{isFetching && !data && (
					<>
						{[...Array(12)].map((number, index) => {
							return <DocumentCardSkeleton key={index} />;
						})}
					</>
				)}
				{isFetchingNextPage && data && (
					<>
						{[...Array(12)].map((number, index) => {
							return <DocumentCardSkeleton key={index} />;
						})}
					</>
				)}
				<div ref={bottomRef}></div>
			</div>
		</>
	);
};

export default StarDocumentPage;
