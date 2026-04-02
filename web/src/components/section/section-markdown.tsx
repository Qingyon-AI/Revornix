import { useEffect, useRef, useState } from 'react';
import { useInterval } from 'ahooks';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { SectionProcessStatus } from '@/enums/section';
import { getSectionFreshnessState } from '@/lib/result-freshness';
import { isScheduledSectionWaitingForTrigger } from '@/lib/section-automation';
import { cn, replaceImagePaths } from '@/lib/utils';
import { getSectionDetail } from '@/service/section';
import { toStableMarkdownSourceKey } from '@/lib/markdown-source';

import { Alert, AlertDescription } from '../ui/alert';
import CustomMarkdown from '../ui/custom-markdown';
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
	const markdownUrl = section?.md_file_name ?? undefined;
	const markdownSourceKey = toStableMarkdownSourceKey(markdownUrl);
	const isScheduledWaitingForTrigger =
		isScheduledSectionWaitingForTrigger(section);
	const freshnessState = getSectionFreshnessState(section);

	const containsImagePlaceholder = (content?: string) =>
		Boolean(content?.includes('section-image-placeholder:'));

	const buildMarkdownRequestUrl = (sourceUrl: string, forceReload: boolean) => {
		if (!forceReload) return sourceUrl;
		const separator = sourceUrl.includes('?') ? '&' : '?';
		return `${sourceUrl}${separator}_ts=${Date.now()}`;
	};

	const onGetMarkdown = async (
		sourceKey: string,
		sourceUrl: string,
		forceReload = false,
	) => {
		if (!section || !sourceUrl) return;
		if (
			!forceReload &&
			(loadedMarkdownSourceKeyRef.current === sourceKey ||
				failedMarkdownSourceKeyRef.current === sourceKey)
		) {
			return;
		}
		if (loadingMarkdownUrlRef.current === sourceUrl) {
			return;
		}
		loadingMarkdownUrlRef.current = sourceUrl;
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(true);
		try {
			const requestUrl = buildMarkdownRequestUrl(sourceUrl, forceReload);
			const response = await fetch(requestUrl, {
				cache: forceReload ? 'no-store' : 'default',
			});
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}
			const content = await response.text();
			setMarkdown(
				section.creator?.id !== undefined
					? replaceImagePaths(content, section.creator.id)
					: content,
			);
			loadedMarkdownSourceKeyRef.current = sourceKey;
			failedMarkdownSourceKeyRef.current = undefined;
			setPlaceholderPollingDelay(
				containsImagePlaceholder(content) ? 4000 : undefined,
			);
		} catch (e: any) {
			failedMarkdownSourceKeyRef.current = sourceKey;
			setMarkdownGetError(e.message);
		} finally {
			setMarkdownIsFetching(false);
			if (loadingMarkdownUrlRef.current === sourceUrl) {
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
			sourceUrl: markdownUrl,
		};
	}, [markdownSourceKey, markdownUrl]);

	useEffect(() => {
		if (!markdownUrl || !markdownSourceKey) {
			return;
		}
		if (
			loadedMarkdownSourceKeyRef.current === markdownSourceKey ||
			failedMarkdownSourceKeyRef.current === markdownSourceKey
		) {
			return;
		}
		void onGetMarkdown(markdownSourceKey, markdownUrl);
	}, [markdownSourceKey, markdownUrl]);

	useEffect(() => {
		if (processStatus < SectionProcessStatus.SUCCESS) {
			shouldReloadOnSuccessRef.current = true;
			return;
		}
		if (
			!shouldReloadOnSuccessRef.current ||
			!markdownSourceKey ||
			!markdownUrl
		) {
			return;
		}
		shouldReloadOnSuccessRef.current = false;
		void onGetMarkdown(markdownSourceKey, markdownUrl, true);
	}, [markdownSourceKey, markdownUrl, processStatus]);

	useInterval(
		() => {
			const { sourceKey, sourceUrl } = latestMarkdownSourceRef.current;
			if (!sourceKey || !sourceUrl) return;
			void onGetMarkdown(sourceKey, sourceUrl, true);
		},
		placeholderPollingDelay,
	);

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

	return (
		<div className={cn('relative flex min-h-full w-full flex-col', className)}>
			{showEmpty ? (
				<div
					className={cn(
						'mx-auto flex w-full max-w-[880px] items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-background/25 px-6 text-center text-sm leading-7 text-muted-foreground',
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
				<div className='relative w-full'>
					{freshnessState.markdownStale ? (
						<div className='mx-auto mb-4 w-full max-w-[880px]'>
							<Alert className='border-amber-500/30 bg-amber-500/8 text-amber-800 dark:text-amber-200'>
								<AlertDescription>
									{t('section_markdown_stale_hint')}
								</AlertDescription>
							</Alert>
						</div>
					) : null}
					<div className='prose prose-zinc mx-auto max-w-[880px] overflow-x-hidden pb-6 dark:prose-invert prose-headings:scroll-mt-24 prose-headings:break-words prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-a:text-primary prose-strong:text-foreground prose-img:rounded-2xl sm:pb-14 [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words'>
						<CustomMarkdown content={markdown || t('section_no_md')} />
						<div className='not-prose mt-4 rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-center text-sm text-muted-foreground sm:mt-6'>
							{t('section_ai_tips')}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
};

export default SectionMarkdown;
