import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
	getDocumentDetail,
	getDocumentMarkdownContent,
	updateDocument,
} from '@/service/document';
import 'katex/dist/katex.min.css';
import { MarkdownContentSkeleton } from '../ui/skeleton';
import { useInView } from 'react-intersection-observer';
import { useEffect, useRef, useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';
import { shouldPollDocumentDetail } from '@/lib/document-task';
import { toStableMarkdownSourceKey } from '@/lib/markdown-source';
import EditableMarkdownPanel from '../markdown/editable-markdown-panel';
import useDocumentMarkdownEditable from '@/hooks/use-document-markdown-editable';
import { NotFoundView } from '../not-found/not-found-view';
import { AlertTriangle, FileText } from 'lucide-react';

const QuickDocumentDetail = ({
	id,
	className,
	onFinishRead,
}: {
	id: number;
	className?: string;
	onFinishRead?: () => void;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const {
		isFetching,
		isFetched,
		data: document,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});
	const { canEditMarkdown } = useDocumentMarkdownEditable({
		documentId: id,
		creatorId: document?.creator.id,
	});

	const [delay, setDelay] = useState<number>();
	useInterval(() => {
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	}, delay);

	const [markdown, setMarkdown] = useState<string>();
	const [markdownIsFetching, setMarkdownIsFetching] = useState(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const loadedMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const failedMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const loadingMarkdownSourceKeyRef = useRef<string | undefined>(undefined);

	const markdownFilePath = document?.quick_note_info?.md_file_name ?? undefined;
	const stableMarkdownSourceKey = toStableMarkdownSourceKey(markdownFilePath);
	const markdownSourceKey = stableMarkdownSourceKey
		? `${stableMarkdownSourceKey}:${document?.content_update_time ?? ''}`
		: undefined;

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (shouldPollDocumentDetail(document)) {
			setDelay(1000);
		} else {
			setDelay(undefined);
		}
	}, [document]);

	useEffect(() => {
		if (markdownFilePath) return;
		setMarkdown(undefined);
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(false);
		loadedMarkdownSourceKeyRef.current = undefined;
		failedMarkdownSourceKeyRef.current = undefined;
		loadingMarkdownSourceKeyRef.current = undefined;
	}, [markdownFilePath]);

	const onGetMarkdown = async (sourceKey: string) => {
		if (!document?.quick_note_info?.md_file_name) return;
		if (
			loadedMarkdownSourceKeyRef.current === sourceKey ||
			failedMarkdownSourceKeyRef.current === sourceKey ||
			loadingMarkdownSourceKeyRef.current === sourceKey
		) {
			return;
		}
		loadingMarkdownSourceKeyRef.current = sourceKey;
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(true);
		try {
			const res = await getDocumentMarkdownContent({
				document_id: document.id,
			});
			setMarkdown(res);
			loadedMarkdownSourceKeyRef.current = sourceKey;
			failedMarkdownSourceKeyRef.current = undefined;
		} catch (e: any) {
			failedMarkdownSourceKeyRef.current = sourceKey;
			setMarkdownGetError(e?.message);
		} finally {
			setMarkdownIsFetching(false);
			if (loadingMarkdownSourceKeyRef.current === sourceKey) {
				loadingMarkdownSourceKeyRef.current = undefined;
			}
		}
	};

	useEffect(() => {
		if (!markdownSourceKey) return;
		void onGetMarkdown(markdownSourceKey);
	}, [markdownSourceKey]);

	useEffect(() => {
		if (!inView) return;
		if (markdown === undefined) return;
		onFinishRead && onFinishRead();
	}, [inView, markdown, onFinishRead]);

	const handleSaveMarkdown = async (content: string) => {
		await updateDocument({
			document_id: id,
			content,
		});
		setMarkdown(content);
		setMarkdownGetError(undefined);
		loadedMarkdownSourceKeyRef.current = undefined;
		failedMarkdownSourceKeyRef.current = undefined;
		loadingMarkdownSourceKeyRef.current = undefined;
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
			exact: true,
		});
	};

	const contentFallbackMinHeightClassName =
		'min-h-[calc(100dvh-14rem)] sm:min-h-[calc(100dvh-14.25rem)]';

	const hasMarkdownFile = Boolean(markdownFilePath);
	const showDocumentLoadingSkeleton = !document && isFetching && !isError;
	const showMarkdownLoadingSkeleton =
		hasMarkdownFile && markdownIsFetching && markdown === undefined;
	const showSkeleton =
		showDocumentLoadingSkeleton || showMarkdownLoadingSkeleton;
	const showError = !showSkeleton && (isError || Boolean(markdownGetError));
	const showEmpty =
		!showSkeleton &&
		!showError &&
		isFetched &&
		Boolean(document) &&
		!hasMarkdownFile;

	return (
		<div className={cn('w-full relative pt-4', className)}>
			{showSkeleton ? (
				<MarkdownContentSkeleton
					className={contentFallbackMinHeightClassName}
					showToolbar={canEditMarkdown}
				/>
			) : null}

			{showError ? (
				<div className='mx-auto w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px] px-4 sm:px-6'>
					<NotFoundView
						code={null}
						icon={AlertTriangle}
						title={t('document_markdown_load_failed')}
						description={error?.message ?? markdownGetError}
						className={cn('py-12 px-4', contentFallbackMinHeightClassName)}
					/>
				</div>
			) : null}

			{showEmpty ? (
				<div className='mx-auto w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px] px-4 sm:px-6'>
					<NotFoundView
						code={null}
						icon={FileText}
						title={t('document_markdown_empty')}
						description={t('document_markdown_empty_description')}
						className={cn('py-12 px-4', contentFallbackMinHeightClassName)}
					/>
				</div>
			) : null}

			{markdown !== undefined ? (
				<>
					<EditableMarkdownPanel
						content={markdown}
						creatorId={document?.creator.id}
						onSave={handleSaveMarkdown}
						editable={canEditMarkdown}
						showFloatingToc
					/>
					<div
						ref={bottomRef}
						className='pointer-events-none absolute inset-x-0 bottom-0 h-px'
					/>
				</>
			) : null}
		</div>
	);
};

export default QuickDocumentDetail;
