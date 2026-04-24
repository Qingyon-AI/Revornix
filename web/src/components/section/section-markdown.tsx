import { useEffect, useRef, useState } from 'react';
import { useInterval } from 'ahooks';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { SectionProcessStatus, UserSectionAuthority } from '@/enums/section';
import { FileService } from '@/lib/file';
import { getQueryClient } from '@/lib/get-query-client';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { isScheduledSectionWaitingForTrigger } from '@/lib/section-automation';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import {
	getSectionDetail,
	getSectionMarkdownContent,
	updateSection,
} from '@/service/section';
import { toStableMarkdownSourceKey } from '@/lib/markdown-source';

import EditableMarkdownPanel from '../markdown/editable-markdown-panel';
import NoticeBox from '../ui/notice-box';
import { Skeleton } from '../ui/skeleton';

const SectionMarkdownSkeleton = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				'mx-auto flex w-full max-w-[880px] flex-col gap-6',
				className,
			)}>
			<div className='space-y-4 pt-1'>
				<Skeleton className='h-10 w-56 rounded-2xl sm:h-11 sm:w-72' />
				<Skeleton className='h-5 w-40 rounded-full sm:w-56' />
			</div>
			<div className='space-y-4'>
				<Skeleton className='h-5 w-full rounded-full' />
				<Skeleton className='h-5 w-full rounded-full' />
				<Skeleton className='h-5 w-11/12 rounded-full' />
				<Skeleton className='h-5 w-4/5 rounded-full' />
			</div>
			<div className='space-y-4 pt-2'>
				<Skeleton className='h-8 w-40 rounded-2xl' />
				<Skeleton className='h-5 w-full rounded-full' />
				<Skeleton className='h-5 w-full rounded-full' />
				<Skeleton className='h-5 w-10/12 rounded-full' />
			</div>
			<div className='space-y-4 pt-2'>
				<Skeleton className='h-8 w-32 rounded-2xl' />
				<Skeleton className='h-5 w-full rounded-full' />
				<Skeleton className='h-5 w-full rounded-full' />
				<Skeleton className='h-5 w-9/12 rounded-full' />
			</div>
			<div className='mt-auto rounded-[24px] border border-border/60 bg-background/45 px-4 py-3'>
				<Skeleton className='mx-auto h-4 w-60 rounded-full sm:w-72' />
			</div>
		</div>
	);
};

const SectionMarkdown = ({
	id,
	className,
}: {
	id: number;
	className?: string;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const {
		data: section,
		isFetching,
		isFetched,
		error,
		isError,
	} = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
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

	const [markdown, setMarkdown] = useState<string>();
	const [markdownIsFetching, setMarkdownIsFetching] = useState(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const [placeholderPollingDelay, setPlaceholderPollingDelay] = useState<
		number | undefined
	>();
	const loadedMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const failedMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const loadingMarkdownUrlRef = useRef<string | undefined>(undefined);
	const shouldReloadOnSuccessRef = useRef(false);
	const latestMarkdownSourceRef = useRef<{
		sourceKey?: string;
		sourceUrl?: string;
	}>({});
	const processStatus =
		section?.process_task?.status ?? SectionProcessStatus.SUCCESS;
	const shouldStopPlaceholderPolling =
		processStatus === SectionProcessStatus.FAILED ||
		processStatus === SectionProcessStatus.CANCELLED;
	const markdownFilePath = section?.md_file_name ?? undefined;
	const markdownSourceKey = toStableMarkdownSourceKey(markdownFilePath);
	const isScheduledWaitingForTrigger =
		isScheduledSectionWaitingForTrigger(section);
	const freshnessState = getSectionFreshnessState(section);
	const canEditMarkdown =
		Boolean(section?.md_file_name) &&
		(section?.authority === UserSectionAuthority.FULL_ACCESS ||
			section?.authority === UserSectionAuthority.READ_AND_WRITE ||
			section?.creator?.id === mainUserInfo?.id);

	const containsImagePlaceholder = (content?: string) =>
		Boolean(content?.includes('section-image-placeholder:'));

	const onGetMarkdown = async (
		sourceKey: string,
		forceReload = false,
	) => {
		if (!section) return;
		if (
			!forceReload &&
			(loadedMarkdownSourceKeyRef.current === sourceKey ||
				failedMarkdownSourceKeyRef.current === sourceKey)
		) {
			return;
		}
		if (loadingMarkdownUrlRef.current === sourceKey) {
			return;
		}
		loadingMarkdownUrlRef.current = sourceKey;
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(true);
		try {
			const content = await getSectionMarkdownContent({
				section_id: section.id,
			});
			setMarkdown(content);
			loadedMarkdownSourceKeyRef.current = sourceKey;
			failedMarkdownSourceKeyRef.current = undefined;
			setPlaceholderPollingDelay(
				containsImagePlaceholder(content) ? 4000 : undefined,
			);
		} catch (e: any) {
			failedMarkdownSourceKeyRef.current = sourceKey;
			setMarkdownGetError(e.message);
			setPlaceholderPollingDelay(undefined);
		} finally {
			setMarkdownIsFetching(false);
			if (loadingMarkdownUrlRef.current === sourceKey) {
				loadingMarkdownUrlRef.current = undefined;
			}
		}
	};

	useEffect(() => {
		if (section?.md_file_name) return;
		setMarkdown(undefined);
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(false);
		setPlaceholderPollingDelay(undefined);
		loadedMarkdownSourceKeyRef.current = undefined;
		failedMarkdownSourceKeyRef.current = undefined;
		loadingMarkdownUrlRef.current = undefined;
	}, [section?.md_file_name]);

	useEffect(() => {
		latestMarkdownSourceRef.current = {
			sourceKey: markdownSourceKey,
			sourceUrl: markdownFilePath,
		};
	}, [markdownSourceKey, markdownFilePath]);

	useEffect(() => {
		if (!markdownFilePath || !markdownSourceKey) {
			return;
		}
		if (
			loadedMarkdownSourceKeyRef.current === markdownSourceKey ||
			failedMarkdownSourceKeyRef.current === markdownSourceKey
		) {
			return;
		}
		void onGetMarkdown(markdownSourceKey);
	}, [markdownSourceKey, markdownFilePath]);

	useEffect(() => {
		if (processStatus < SectionProcessStatus.SUCCESS) {
			shouldReloadOnSuccessRef.current = true;
			return;
		}
		if (
			!shouldReloadOnSuccessRef.current ||
			!markdownSourceKey ||
			!markdownFilePath
		) {
			return;
		}
		shouldReloadOnSuccessRef.current = false;
		void onGetMarkdown(markdownSourceKey, true);
	}, [markdownSourceKey, markdownFilePath, processStatus]);

	useEffect(() => {
		if (!shouldStopPlaceholderPolling) {
			return;
		}
		setPlaceholderPollingDelay(undefined);
	}, [shouldStopPlaceholderPolling]);

	useInterval(() => {
		if (shouldStopPlaceholderPolling) {
			return;
		}
		const { sourceKey } = latestMarkdownSourceRef.current;
		if (!sourceKey) return;
		void onGetMarkdown(sourceKey, true);
	}, shouldStopPlaceholderPolling ? undefined : placeholderPollingDelay);

	const hasMarkdownFile = Boolean(section?.md_file_name);
	const isMarkdownProcessing =
		!isScheduledWaitingForTrigger &&
		processStatus < SectionProcessStatus.SUCCESS &&
		(section?.documents_count ?? 0) > 0;
	const showSkeleton =
		(!section && isFetching && !isError) ||
		(hasMarkdownFile && markdownIsFetching && !markdown) ||
		(!hasMarkdownFile && isMarkdownProcessing);
	const showProcessingSkeleton = !hasMarkdownFile && isMarkdownProcessing;
	const showError = !showSkeleton && (isError || Boolean(markdownGetError));
	const showEmpty =
		!showSkeleton &&
		!showError &&
		isFetched &&
		Boolean(section) &&
		!hasMarkdownFile;
	const emptyTitle = isScheduledWaitingForTrigger
		? t('section_markdown_scheduled_waiting')
		: t('section_markdown_empty');
	const emptyDescription = isScheduledWaitingForTrigger
		? t('section_markdown_scheduled_waiting_description')
		: undefined;
	const contentFallbackMinHeightClassName =
		'min-h-[calc(100dvh-14rem)] sm:min-h-[calc(100dvh-14.25rem)]';

	const handleSaveMarkdown = async (content: string) => {
		if (!section?.md_file_name || !userFileSystemDetail?.file_system_id) {
			throw new Error(t('document_markdown_file_missing'));
		}

		const fileName =
			section.md_file_name.split('/').pop() || `section-${id}.md`;
		const fileService = new FileService(userFileSystemDetail.file_system_id);
		const file = new File([content], fileName, {
			type: 'text/markdown;charset=utf-8',
		});

		await fileService.uploadFile(section.md_file_name, file);
		await updateSection({
			section_id: id,
			title: section.title,
			description: section.description,
			cover: section.cover ?? null,
			labels: section.labels?.map((label) => label.id) ?? [],
			auto_podcast: section.auto_podcast,
			auto_illustration: section.auto_illustration,
			process_task_trigger_type: section.process_task_trigger_type ?? null,
			process_task_trigger_scheduler:
				section.process_task_trigger_scheduler ?? null,
		});
		setMarkdown(content);
		setMarkdownGetError(undefined);
		queryClient.invalidateQueries({
			queryKey: ['getSectionDetail', id],
			exact: true,
		});
	};

	return (
		<div className={cn(className)}>
			{showEmpty ? (
				<div
					className={cn(
						'mx-auto flex w-full max-w-[880px] items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-background/25 px-6 text-center text-sm leading-7 text-muted-foreground mb-6',
						contentFallbackMinHeightClassName,
					)}>
					<div className='max-w-md space-y-2'>
						<p className='text-base font-medium text-foreground'>
							{emptyTitle}
						</p>
						{emptyDescription ? <p>{emptyDescription}</p> : null}
					</div>
				</div>
			) : null}

			{showSkeleton ? (
				showProcessingSkeleton ? (
					<div
						className={cn(
							'flex items-center justify-center',
							contentFallbackMinHeightClassName,
						)}>
						<SectionMarkdownSkeleton />
					</div>
				) : (
					<SectionMarkdownSkeleton
						className={contentFallbackMinHeightClassName}
					/>
				)
			) : null}

			{showError ? (
				<div
					className={cn(
						'relative mx-auto flex w-full max-w-[880px] items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-background/25 px-6 text-center text-sm leading-7 text-muted-foreground',
						contentFallbackMinHeightClassName,
					)}>
					<div className='max-w-md'>
						{error?.message ?? <p>{markdownGetError}</p>}
					</div>
				</div>
			) : null}

			{markdown !== undefined ? (
				<>
					{freshnessState.markdownStale ? (
						<div className='mx-auto mb-4 w-full max-w-[880px]'>
							<NoticeBox tone='warning'>
								{t('section_markdown_stale_hint')}
							</NoticeBox>
						</div>
					) : null}
					<EditableMarkdownPanel
						content={markdown}
						ownerId={section?.creator?.id}
						editable={canEditMarkdown}
						onSave={handleSaveMarkdown}
						viewerFooter={
							<div className='my-4 rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-center text-sm text-muted-foreground'>
								{t('section_ai_tips')}
							</div>
						}
					/>
				</>
			) : null}
		</div>
	);
};

export default SectionMarkdown;
