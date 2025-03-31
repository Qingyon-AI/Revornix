'use client';

import { getLabels, searchAllMyDocument } from '@/service/document';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import DocumentCard from '@/components/document/document-card';
import DocumentCardSkeleton from '@/components/document/document-card-skeleton';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
import {
	ArrowDownNarrowWide,
	ArrowDownWideNarrow,
	SlidersHorizontalIcon,
} from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

const MineDocumentContainer = ({ label_id }: { label_id?: number }) => {
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
		queryKey: ['searchMyDocument', keyword, desc, labelIds],
		queryFn: (pageParam) => searchAllMyDocument({ ...pageParam.pageParam }),
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
		if (label_id) {
			setLabelIds([label_id]);
		}
	}, [label_id]);

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
									选择标签后，文档列表将只会显示包含该标签的文档。注意：清空后由于标签筛选为空，所有文档都将隐藏，只有取消标签筛选后，文档列表将显示所有文档。
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
			{isSuccess && documents.length === 0 && (
				<div className='flex flex-col items-center justify-center h-full'>
					<p className='text-sm text-muted-foreground'>此处没有数据</p>
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

export default MineDocumentContainer;
