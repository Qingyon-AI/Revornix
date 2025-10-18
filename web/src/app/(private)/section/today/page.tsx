'use client';

import { Separator } from '@/components/ui/separator';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
	getDayDocumentsSummarySection,
	searchSectionDocuments,
} from '@/service/section';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import SectionDocumentCard from '@/components/section/section-document-card';
import Markdown from 'react-markdown';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import CustomImage from '@/components/ui/custom-image';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { getUserFileSystemDetail } from '@/service/file-system';
import { useInView } from 'react-intersection-observer';

const SectionDetailPage = () => {
	const t = useTranslations();
	const { userInfo } = useUserContext();
	const today = new Date().toISOString().split('T')[0];
	const {
		data: section,
		isFetching: isFetchingSection,
		isError,
		error,
	} = useQuery({
		queryKey: ['todayDocumentSummarySection'],
		queryFn: () => getDayDocumentsSummarySection({ date: today }),
	});

	const { data: userFileSystemDetail } = useQuery({
		queryKey: ['getUserFileSystemDetail', userInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: userInfo!.default_user_file_system!,
			}),
		enabled:
			userInfo?.id !== undefined &&
			userInfo?.default_user_file_system !== undefined,
	});

	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const [markdown, setMarkdown] = useState<string>();

	const onGetMarkdown = async () => {
		if (!section || !section.md_file_name || !userInfo) return;
		if (!userInfo.default_user_file_system) {
			toast.error('No default file system found');
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		try {
			const [res, err] = await utils.to(
				fileService.getFileContent(section?.md_file_name)
			);
			if (!res || err) {
				setMarkdownGetError(err.message);
				return;
			}
			if (typeof res === 'string') {
				setMarkdown(res);
			}
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	useEffect(() => {
		if (
			!section ||
			!section?.md_file_name ||
			!userInfo ||
			!userFileSystemDetail
		)
			return;
		onGetMarkdown();
	}, [section, userInfo, userFileSystemDetail]);

	const { ref: bottomRef, inView } = useInView();
	const {
		data,
		isFetchingNextPage,
		isFetching: isFetchingSectionDocuments,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchSectionDocument', ''],
		// @ts-expect-error
		queryFn: (pageParam) => searchSectionDocuments({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			section_id: section?.section_id,
			keyword: '',
			desc: true,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						section_id: section?.section_id,
						keyword: '',
						desc: true,
				  }
				: undefined;
		},
		enabled: !!section,
	});
	const documents = data?.pages.flatMap((page) => page.elements) || [];

	useEffect(() => {
		section &&
			inView &&
			!isFetchingSectionDocuments &&
			hasNextPage &&
			fetchNextPage();
	}, [inView, isFetchingSectionDocuments, hasNextPage, section]);

	return (
		<>
			<div className='px-5 pb-5 w-full flex flex-col gap-5 relative flex-1 box-border'>
				<div className='flex justify-between items-center'>
					<Sheet>
						<SheetTrigger className='bg-muted rounded px-4 py-2 text-xs'>
							{t('today_section_documents_summary', {
								today_documents_count: section?.documents.length || 0,
							})}
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>{t('section_documents')}</SheetTitle>
								<SheetDescription>
									{t('section_documents_description')}
								</SheetDescription>
							</SheetHeader>
							<div className='px-5 flex flex-col gap-5 overflow-auto pb-5'>
								{isSuccess &&
									documents &&
									documents.map((document, index) => {
										return (
											<SectionDocumentCard key={index} document={document} />
										);
									})}
								{isFetchingSectionDocuments && !data && (
									<>
										{[...Array(10)].map((number, index) => {
											return <Skeleton className='h-40 w-full' key={index} />;
										})}
									</>
								)}
								{isFetchingNextPage && data && (
									<>
										{[...Array(10)].map((number, index) => {
											return <Skeleton className='h-40 w-full' key={index} />;
										})}
									</>
								)}
								<div ref={bottomRef}></div>
							</div>
						</SheetContent>
					</Sheet>
					{section && (
						<p className='text-xs bg-muted rounded px-4 py-2'>
							{t('section_updated_at')}{' '}
							{format(section.update_time as Date, 'yyyy-MM-dd HH:mm:ss')}
						</p>
					)}
				</div>
				<Separator />
				<div
					className='w-full prose max-w-none dark:prose-invert overflow-auto'
					style={{ flex: '1 1 0' }}>
					{isFetchingSection && <Skeleton className='h-full w-full' />}
					{((isError && error) || markdownGetError) && (
						<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
							{error?.message ?? (
								<div className='flex flex-col text-center gap-2'>
									<p>{markdownGetError}</p>
								</div>
							)}
						</div>
					)}
					{markdown && !isError && !markdownGetError && (
						<div className='prose dark:prose-invert mx-auto'>
							<Markdown
								components={{
									img: (props) => {
										return <CustomImage {...props} />;
									},
								}}
								remarkPlugins={[remarkMath, remarkGfm]}
								rehypePlugins={[rehypeKatex, rehypeRaw]}>
								{markdown}
							</Markdown>
							<p className='text-xs text-center text-muted-foreground bg-muted rounded py-2'>
								{t('section_ai_tips')}
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
};
export default SectionDetailPage;
