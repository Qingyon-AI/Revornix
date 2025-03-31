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

const CommunitySectionPage = () => {
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
					placeholder='请输入你的搜索内容'
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
								从新到旧
								<ArrowDownWideNarrow />
							</Button>
							<Button
								variant={'ghost'}
								className='w-fit rounded-none text-xs'
								onClick={() => setDesc(false)}>
								从旧到新
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
								<SheetTitle>筛选</SheetTitle>
								<SheetDescription>
									此处可以对文档列表做筛选，获取特定范围的文档。
								</SheetDescription>
							</SheetHeader>
							<div className='px-4 overflow-auto'>
								<h1 className='font-bold text-sm mb-3'>标签</h1>
								<p className='text-xs text-muted-foreground mb-3'>
									选择标签后，列表将只会显示包含该标签的专栏。注意：清空后由于标签筛选为空，所有专栏都将隐藏，只有取消标签筛选后，列表将显示所有专栏。
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
										全选
									</Button>
									<Button
										className='text-xs'
										variant={'secondary'}
										onClick={() => {
											setLabelIds([]);
										}}>
										清空
									</Button>
									<Button
										className='text-xs'
										variant={'outline'}
										onClick={() => {
											setLabelIds(undefined);
										}}>
										取消标签筛选
									</Button>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>
			{isSuccess && sections.length === 0 && (
				<div className='flex flex-col items-center justify-center h-full'>
					<p className='text-sm text-muted-foreground'>暂无专栏</p>
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
