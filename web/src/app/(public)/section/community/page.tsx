'use client';

import SectionCard from '@/components/section/section-card';
import SectionCardSkeleton from '@/components/section/section-card-skeleton';
import { getMineLabels, searchPublicSection } from '@/service/section';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
	ArrowDownNarrowWide,
	ArrowDownWideNarrow,
	SlidersHorizontalIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { useTranslations } from 'next-intl';

const CommunitySectionPage = () => {
	const t = useTranslations();
	const [keyword, setKeyword] = useState('');
	const { ref: bottomRef, inView } = useInView();
	const [desc, setDesc] = useState(true);
	const [labelIds, setLabelIds] = useState<number[]>();
	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchPublicSection', keyword, desc, labelIds],
		queryFn: (pageParam) => searchPublicSection({ ...pageParam.pageParam }),
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

	const sections = data?.pages.flatMap((page) => page.elements) || [];

	const { data: labels } = useQuery({
		queryKey: ['getSectionLabels'],
		queryFn: getMineLabels,
	});

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView]);
	return (
		<>
			<div className='flex flex-row px-5 pb-5 gap-3'>
				<Input
					placeholder={t('section_search_placeholder')}
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
								{t('section_search_order_from_new')}
								<ArrowDownWideNarrow />
							</Button>
							<Button
								variant={'ghost'}
								className='w-fit rounded-none text-xs'
								onClick={() => setDesc(false)}>
								{t('section_search_order_from_old')}
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
								<SheetTitle>{t('section_search_filter')}</SheetTitle>
								<SheetDescription>
									{t('section_search_filter_description')}
								</SheetDescription>
							</SheetHeader>
							<div className='px-4 overflow-auto'>
								<h1 className='font-bold text-sm mb-3'>
									{t('section_search_filter_form_label')}
								</h1>
								<p className='text-xs text-muted-foreground mb-3'>
									{t('section_search_filter_form_label_description')}
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
										{t('section_search_filter_form_label_cancel')}
									</Button>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
			{isSuccess && sections.length === 0 && (
				<div className='flex flex-col items-center justify-center h-full'>
					<p className='text-sm text-muted-foreground'>{t('sections_empty')}</p>
				</div>
			)}
			<div className='grid grid-cols-1 gap-4 md:grid-cols-4 px-5 pb-5'>
				{sections &&
					sections.map((section, index) => {
						return <SectionCard key={section.id} section={section} />;
					})}
				{isFetching && !data && (
					<>
						{[...Array(12)].map((number, index) => {
							return <SectionCardSkeleton key={index} />;
						})}
					</>
				)}
				{isFetchingNextPage && data && (
					<>
						{[...Array(12)].map((number, index) => {
							return <SectionCardSkeleton key={index} />;
						})}
					</>
				)}
				<div ref={bottomRef}></div>
			</div>
		</>
	);
};

export default CommunitySectionPage;
