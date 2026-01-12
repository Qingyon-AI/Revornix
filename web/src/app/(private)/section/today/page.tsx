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
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
	getDayDocumentsSummarySection,
	searchSectionDocuments,
} from '@/service/section';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import SectionDocumentCard from '@/components/section/section-document-card';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { getUserFileSystemDetail } from '@/service/file-system';
import { useInView } from 'react-intersection-observer';
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { RefreshCcwIcon, TrashIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'nextjs-toploader/app';
import CustomMarkdown from '@/components/ui/custom-markdown';

const SectionDetailPage = () => {
	const t = useTranslations();
	const router = useRouter();
	const { mainUserInfo } = useUserContext();
	const today = new Date().toISOString().split('T')[0];
	const {
		data: section,
		isFetching: isFetchingSection,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ['todayDocumentSummarySection'],
		queryFn: () => getDayDocumentsSummarySection({ date: today }),
	});

	const { data: userFileSystemDetail } = useQuery({
		queryKey: ['getUserFileSystemDetail', mainUserInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const [markdown, setMarkdown] = useState<string>();

	const onGetMarkdown = async () => {
		if (!section || !section.md_file_name || !mainUserInfo) return;
		if (!mainUserInfo.default_user_file_system) {
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
			!mainUserInfo ||
			!userFileSystemDetail
		)
			return;
		onGetMarkdown();
	}, [section, mainUserInfo, userFileSystemDetail]);

	const { ref: bottomRef, inView } = useInView();
	const {
		data,
		isFetchingNextPage,
		isFetching: isFetchingSectionDocuments,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchSectionDocument', section?.section_id, ''],
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

	const handleAddDocument = (section_id: string) => {
		const params = new URLSearchParams({
			section_id: section_id,
		});
		router.push(`/document/create?${params.toString()}`);
	};

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
							<div className='px-5 flex flex-col gap-5 overflow-auto pb-5 flex-1'>
								{isSuccess && documents && documents.length === 0 && (
									<Empty className='h-full'>
										<EmptyHeader>
											<EmptyMedia variant='icon'>
												<TrashIcon />
											</EmptyMedia>
											<EmptyDescription>{t('sections_empty')}</EmptyDescription>
										</EmptyHeader>
										<EmptyContent>
											<div className='flex gap-2'>
												<Button
													onClick={() => {
														section &&
															handleAddDocument(section?.section_id.toString());
													}}>
													{t('document_create')}
												</Button>
											</div>
										</EmptyContent>
									</Empty>
								)}
								{isSuccess &&
									documents &&
									documents.length > 0 &&
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
							{format(section.create_time as Date, 'yyyy-MM-dd HH:mm:ss')}
						</p>
					)}
				</div>
				<Separator />
				<div
					className='w-full prose max-w-none dark:prose-invert overflow-auto'
					style={{ flex: '1 1 0' }}>
					{isFetchingSection && <Skeleton className='h-full w-full' />}
					{((isError && error) || markdownGetError) && (
						<Empty className='h-full'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<XIcon />
								</EmptyMedia>
								<EmptyDescription>
									{markdownGetError || error?.message}
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button
									variant='outline'
									size='sm'
									onClick={() => {
										refetch();
									}}>
									<RefreshCcwIcon />
									{t('refresh')}
								</Button>
							</EmptyContent>
						</Empty>
					)}
					{markdown && !isError && !markdownGetError && (
						<div className='prose dark:prose-invert mx-auto'>
							<CustomMarkdown content={markdown} />
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
