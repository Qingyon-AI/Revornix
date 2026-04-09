import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail, updateDocument } from '@/service/document';
import 'katex/dist/katex.min.css';
import { Skeleton } from '../ui/skeleton';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { useInterval } from 'ahooks';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import { shouldPollDocumentDetail } from '@/lib/document-task';
import EditableMarkdownPanel from '../markdown/editable-markdown-panel';

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

	const [delay, setDelay] = useState<number>();

	useInterval(() => {
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	}, delay);

	const [markdownRendered, setMarkdownRendered] = useState(false);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (shouldPollDocumentDetail(document)) {
			setDelay(1000);
		} else {
			setDelay(undefined);
		}
	}, [document]);

	useEffect(() => {
		if (!document || !document.quick_note_info) return;
		setMarkdownRendered(true);
	}, [document, mainUserInfo]);

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView, markdownRendered, onFinishRead]);

	const handleSaveMarkdown = async (content: string) => {
		await updateDocument({
			document_id: id,
			content,
		});
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
			exact: true,
		});
	};

	return (
		<div className={cn('h-full w-full relative', className)}>
			{isError && error && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? (
						<div className='flex flex-col text-center gap-2'>
							<p>{error.message}</p>
						</div>
					)}
				</div>
			)}
			{isFetching && !isRefetching && <Skeleton className='w-full h-full' />}
			{!isError && (
				<div className='w-full h-full flex flex-col'>
					<div className='flex-1 overflow-auto relative'>
						<EditableMarkdownPanel
							content={
								document?.quick_note_info?.content
									? document.quick_note_info.content
									: t('document_no_md')
							}
							ownerId={document?.creator.id}
							onSave={handleSaveMarkdown}
						/>
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

export default QuickDocumentDetail;
