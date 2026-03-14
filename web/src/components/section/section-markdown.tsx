import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { SectionProcessStatus } from '@/enums/section';
import { cn, replaceImagePaths } from '@/lib/utils';
import { getSectionDetail } from '@/service/section';

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

	const onGetMarkdown = async () => {
		if (!section || !section.md_file_name) return;
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(true);
		try {
			const response = await fetch(section.md_file_name);
			if (!response.ok) {
				throw new Error(`Request failed with status ${response.status}`);
			}
			const content = await response.text();
			setMarkdown(
				section.creator?.id !== undefined
					? replaceImagePaths(content, section.creator.id)
					: content,
			);
		} catch (e: any) {
			setMarkdownGetError(e.message);
		} finally {
			setMarkdownIsFetching(false);
		}
	};

	useEffect(() => {
		if (section?.md_file_name) return;
		setMarkdown(undefined);
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(false);
	}, [section?.md_file_name]);

	useEffect(() => {
		if (!section || !section.md_file_name) {
			return;
		}
		onGetMarkdown();
	}, [section?.md_file_name, section?.creator?.id]);

	const hasMarkdownFile = Boolean(section?.md_file_name);
	const isMarkdownProcessing =
		(section?.process_task?.status ?? SectionProcessStatus.SUCCESS) <
			SectionProcessStatus.SUCCESS &&
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
	const contentFallbackMinHeightClassName =
		'min-h-[calc(100dvh-8rem)] sm:min-h-[calc(100dvh-8.25rem)]';

	return (
		<div className={cn('relative flex min-h-full w-full flex-col', className)}>
			{showEmpty ? (
				<div
					className={cn(
						'mx-auto flex w-full max-w-[880px] items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-background/25 px-6 text-center text-sm leading-7 text-muted-foreground',
						contentFallbackMinHeightClassName,
					)}>
					<div className='max-w-md'>{t('section_markdown_empty')}</div>
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

			{markdown ? (
				<div className='relative w-full'>
					<div className='prose prose-zinc mx-auto max-w-[880px] overflow-x-hidden pb-6 dark:prose-invert prose-headings:scroll-mt-24 prose-headings:break-words prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-a:text-primary prose-strong:text-foreground prose-img:rounded-2xl sm:pb-14 [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words'>
						<CustomMarkdown content={markdown} />
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
