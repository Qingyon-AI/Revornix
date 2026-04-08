import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail, transformToMarkdown } from '@/service/document';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';
import { History, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInView } from 'react-intersection-observer';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import { DocumentMdConvertStatus } from '@/enums/document';
import { shouldPollDocumentDetail } from '@/lib/document-task';
import { useRef } from 'react';
import { toStableMarkdownSourceKey } from '@/lib/markdown-source';
import TipTapMarkdownViewer from '../markdown/tiptap-markdown-viewer';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { formatInUserTimeZone } from '@/lib/time';

const buildSnapshotOptionLabel = (createTime?: Date | string | null) => {
	const formatted = formatInUserTimeZone(createTime, 'yyyy-MM-dd HH:mm');
	return formatted ? formatted : 'Unknown snapshot';
};

const WebsiteDocumentDetail = ({
	id,
	className,
	onFinishRead,
}: {
	id: number;
	className?: string;
	onFinishRead?: () => void;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const queryClient = getQueryClient();
	const contentFallbackMinHeightClassName =
		'min-h-[calc(100dvh-14rem)] sm:min-h-[calc(100dvh-14.25rem)]';
	const statusContainerClassName = cn(
		'flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-xs text-muted-foreground',
		contentFallbackMinHeightClassName,
	);
	const [markdownRendered, setMarkdownRendered] = useState(false);
	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>();
	const {
		data: document,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const { data: userFileSystemDetail } = useQuery({
		queryKey: [
			'getUserFileSystemDetail',
			mainUserInfo?.id,
			mainUserInfo?.default_user_file_system,
		],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	const [delay, setDelay] = useState<number | undefined>();
	useInterval(() => {
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	}, delay);

	useEffect(() => {
		if (shouldPollDocumentDetail(document)) {
			setDelay(1000);
		} else {
			setDelay(undefined);
		}
	}, [document]);

	const [markdown, setMarkdown] = useState<string>();
	const loadedMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const loadingMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const websiteSnapshots = document?.website_snapshots ?? [];
	const activeSnapshot =
		websiteSnapshots.find(
			(snapshot) => String(snapshot.id) === selectedSnapshotId,
		) ?? websiteSnapshots[0];
	const activeMarkdownFileName =
		activeSnapshot?.md_file_name ??
		(document?.convert_task?.status === DocumentMdConvertStatus.SUCCESS
			? document.convert_task?.md_file_name
			: undefined);
	const stableMarkdownSourceKey = toStableMarkdownSourceKey(activeMarkdownFileName);
	const markdownSourceKey =
		stableMarkdownSourceKey && userFileSystemDetail?.file_system_id
			? `${userFileSystemDetail.file_system_id}:${stableMarkdownSourceKey}`
			: undefined;

	const onGetMarkdown = async (sourceKey: string) => {
		if (
			!document ||
			!mainUserInfo ||
			!userFileSystemDetail ||
			!activeMarkdownFileName
		) {
			return;
		}
		if (!mainUserInfo.default_user_file_system) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}
		if (
			loadedMarkdownSourceKeyRef.current === sourceKey ||
			loadingMarkdownSourceKeyRef.current === sourceKey
		) {
			return;
		}
		loadingMarkdownSourceKeyRef.current = sourceKey;
		const fileService = new FileService(userFileSystemDetail.file_system_id);
		try {
			if (!activeMarkdownFileName) {
				throw new Error(t('document_markdown_file_missing'));
			}
			let [res, err] = await utils.to(
				fileService.getFileContent(activeMarkdownFileName),
			);
			if (!res || err) {
				throw new Error(err.message);
			}
			if (typeof res === 'string') {
				setMarkdown(res);
				setMarkdownGetError(undefined);
				setMarkdownRendered(true);
				loadedMarkdownSourceKeyRef.current = sourceKey;
			}
		} catch (e: any) {
			setMarkdownGetError(e.message);
		} finally {
			if (loadingMarkdownSourceKeyRef.current === sourceKey) {
				loadingMarkdownSourceKeyRef.current = undefined;
			}
		}
	};

	const handleTransformToMarkdown = async () => {
		setMarkdowningTransform(true);
		const [res, err] = await utils.to(
			transformToMarkdown({
				document_id: id,
			}),
		);
		if (err) {
			toast.error(err.message);
			setMarkdowningTransform(false);
			return;
		}
		setMarkdowningTransform(false);
		loadedMarkdownSourceKeyRef.current = undefined;
		loadingMarkdownSourceKeyRef.current = undefined;
		setSelectedSnapshotId(undefined);
		setMarkdown(undefined);
		toast.success(t('document_transform_again'));
		setDelay(1000);
	};

	useEffect(() => {
		if (!websiteSnapshots.length) {
			setSelectedSnapshotId(undefined);
			return;
		}
		if (
			selectedSnapshotId &&
			websiteSnapshots.some(
				(snapshot) => String(snapshot.id) === selectedSnapshotId,
			)
		) {
			return;
		}
		setSelectedSnapshotId(String(websiteSnapshots[0].id));
	}, [selectedSnapshotId, websiteSnapshots]);

	useEffect(() => {
		if (!markdownSourceKey || !mainUserInfo?.id) {
			return;
		}
		void onGetMarkdown(markdownSourceKey);
	}, [markdownSourceKey, mainUserInfo?.id]);

	useEffect(() => {
		setMarkdown(undefined);
		setMarkdownRendered(false);
		setMarkdownGetError(undefined);
	}, [markdownSourceKey]);

	useEffect(() => {
		if (document?.convert_task?.status === DocumentMdConvertStatus.SUCCESS || activeSnapshot) {
			return;
		}
		loadedMarkdownSourceKeyRef.current = undefined;
		loadingMarkdownSourceKeyRef.current = undefined;
	}, [activeSnapshot, document?.convert_task?.status]);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView, markdownRendered, onFinishRead]);

	return (
		<div
			className={cn(
				'relative flex w-full flex-col',
				contentFallbackMinHeightClassName,
				className,
			)}>
			{websiteSnapshots.length > 0 && (
				<div className='mx-auto mb-4 w-full max-w-[880px]'>
					<div className='flex flex-col gap-3 rounded-[24px] border border-border/60 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between'>
						<div className='space-y-1'>
							<p className='flex items-center gap-2 text-sm font-medium text-foreground'>
								<History className='size-4 text-primary' />
								<span>Website snapshots</span>
							</p>
							<p className='text-xs text-muted-foreground'>
								{websiteSnapshots.length} snapshots for this URL. Switch to review the site as it looked at that time.
							</p>
						</div>
						<Select
							value={selectedSnapshotId ?? String(websiteSnapshots[0].id)}
							onValueChange={setSelectedSnapshotId}>
							<SelectTrigger className='w-full min-w-0 sm:w-auto sm:min-w-[220px] sm:max-w-[240px] sm:flex-none'>
								<SelectValue placeholder='Choose snapshot' />
							</SelectTrigger>
							<SelectContent>
								{websiteSnapshots.map((snapshot) => (
									<SelectItem key={snapshot.id} value={String(snapshot.id)}>
										{buildSnapshotOptionLabel(snapshot.create_time)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			)}
			{((isError && error) || markdownGetError) && (
				<div className={statusContainerClassName}>
					{error?.message ?? <p>{markdownGetError}</p>}
				</div>
			)}
			{document &&
				!activeMarkdownFileName &&
				(document.convert_task?.status === DocumentMdConvertStatus.WAIT_TO ||
					!document.convert_task) && (
					<div className={statusContainerClassName}>
						<p className='flex flex-row items-center'>
							<span className='mr-1'>
								{t('document_transform_to_markdown_todo')}
							</span>
							<Tooltip>
								<TooltipTrigger>
									<Info size={15} />
								</TooltipTrigger>
								<TooltipContent>
									{t('document_transform_to_markdown_todo_tips')}
								</TooltipContent>
							</Tooltip>
						</p>
						<Button
							variant={'link'}
							className='h-fit p-0 text-xs'
							disabled={markdownTransforming}
							onClick={() => {
								handleTransformToMarkdown();
							}}>
							{t('retry')}
							{markdownTransforming && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</Button>
					</div>
				)}
			{document &&
				!activeMarkdownFileName &&
				document.convert_task?.status ===
					DocumentMdConvertStatus.CONVERTING && (
					<div className={statusContainerClassName}>
						<p className='flex flex-row items-center'>
							{t('document_transform_to_markdown_doing')}
						</p>
						<Button
							variant={'link'}
							className='h-fit p-0 text-xs'
							disabled={markdownTransforming}
							onClick={() => {
								handleTransformToMarkdown();
							}}>
							{t('retry')}
							{markdownTransforming && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</Button>
					</div>
				)}
			{document &&
				!activeMarkdownFileName &&
				document.convert_task?.status === DocumentMdConvertStatus.FAILED && (
					<div className={statusContainerClassName}>
						<p>{t('document_transform_to_markdown_failed')}</p>
						<Button
							variant={'link'}
							className='h-fit p-0 text-xs'
							disabled={markdownTransforming}
							onClick={() => {
								handleTransformToMarkdown();
							}}>
							{t('retry')}
							{markdownTransforming && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</Button>
					</div>
				)}
			{document &&
				!markdown &&
				!isError &&
				!markdownGetError &&
				(activeMarkdownFileName ||
					document.convert_task?.status === DocumentMdConvertStatus.SUCCESS) && (
					<Skeleton className='min-h-0 w-full flex-1 rounded' />
				)}
			{markdown && !isError && !markdownGetError && (
				<div className='flex min-h-0 w-full flex-1 flex-col'>
					{activeSnapshot && (
						<div className='mx-auto mb-4 w-full max-w-[880px]'>
							<div className='rounded-[22px] border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground'>
								Viewing snapshot from{' '}
								<span className='font-medium text-foreground'>
									{buildSnapshotOptionLabel(activeSnapshot.create_time)}
								</span>
							</div>
						</div>
					)}
					<div className='flex-1 overflow-auto relative'>
						<div className='prose prose-zinc mx-auto max-w-[880px] dark:prose-invert prose-headings:scroll-mt-24 prose-headings:break-words prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-a:text-primary prose-strong:text-foreground prose-img:rounded-2xl xl:pb-14 [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words'>
							<TipTapMarkdownViewer
								content={markdown}
								ownerId={document?.creator.id}
							/>
							<div className='not-prose mt-4 rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-center text-sm text-muted-foreground sm:mt-6'>
								{t('document_ai_tips')}
							</div>
						</div>
						<div
							ref={bottomRef}
							className='pointer-events-none absolute inset-x-0 bottom-0 h-px'
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default WebsiteDocumentDetail;
