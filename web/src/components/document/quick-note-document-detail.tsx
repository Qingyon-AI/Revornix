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
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import { shouldPollDocumentDetail } from '@/lib/document-task';
import { toStableMarkdownSourceKey } from '@/lib/markdown-source';
import EditableMarkdownPanel from '../markdown/editable-markdown-panel';
import useDocumentMarkdownEditable from '@/hooks/use-document-markdown-editable';

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
	const { mainUserInfo } = useUserContext();
	const {
		isFetching,
		data: document,
		isError,
		isRefetching,
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

	const [markdownRendered, setMarkdownRendered] = useState(false);
	const [markdown, setMarkdown] = useState<string>();
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const loadedMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const loadingMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const stableMarkdownSourceKey = toStableMarkdownSourceKey(
		document?.quick_note_info?.md_file_name,
	);
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

	const onGetMarkdown = async (sourceKey: string) => {
		if (!document?.quick_note_info?.md_file_name) {
			return;
		}
		if (
			loadedMarkdownSourceKeyRef.current === sourceKey ||
			loadingMarkdownSourceKeyRef.current === sourceKey
		) {
			return;
		}
		loadingMarkdownSourceKeyRef.current = sourceKey;
		try {
			const res = await getDocumentMarkdownContent({
				document_id: document.id,
			});
			setMarkdown(res);
			setMarkdownGetError(undefined);
			setMarkdownRendered(true);
			loadedMarkdownSourceKeyRef.current = sourceKey;
		} catch (e: any) {
			setMarkdownGetError(e?.message);
		} finally {
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
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView, markdownRendered, onFinishRead]);

	const handleSaveMarkdown = async (content: string) => {
		await updateDocument({
			document_id: id,
			content,
		});
		setMarkdown(content);
		setMarkdownRendered(true);
		setMarkdownGetError(undefined);
		loadedMarkdownSourceKeyRef.current = undefined;
		loadingMarkdownSourceKeyRef.current = undefined;
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
			exact: true,
		});
	};

	return (
		<div className={cn('w-full relative pt-4', className)}>
			{((isError && error) || markdownGetError) && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? markdownGetError}
				</div>
			)}
			{isFetching && !isRefetching && (
				<MarkdownContentSkeleton
					className='min-h-[calc(100dvh-14rem)]'
					showToolbar={canEditMarkdown}
				/>
			)}
			{!isError && !markdownGetError && (
				<>
					<EditableMarkdownPanel
						content={markdown ? markdown : t('document_no_md')}
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
			)}
		</div>
	);
};

export default QuickDocumentDetail;
