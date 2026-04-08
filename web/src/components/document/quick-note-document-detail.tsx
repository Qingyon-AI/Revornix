import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import 'katex/dist/katex.min.css';
import { Skeleton } from '../ui/skeleton';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { getQueryClient } from '@/lib/get-query-client';
import { useInterval } from 'ahooks';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import { shouldPollDocumentDetail } from '@/lib/document-task';
import TipTapMarkdownViewer from '../markdown/tiptap-markdown-viewer';

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
						<div className='prose prose-zinc mx-auto max-w-[880px] dark:prose-invert prose-headings:scroll-mt-24 prose-headings:break-words prose-h1:text-3xl prose-h1:font-semibold prose-h2:text-2xl prose-h3:text-xl prose-p:leading-8 prose-a:text-primary prose-strong:text-foreground prose-img:rounded-2xl xl:pb-14 [&_li]:break-words [&_p]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_table]:w-full [&_table]:table-fixed [&_td]:break-words [&_th]:break-words'>
							<TipTapMarkdownViewer
								content={
									document?.quick_note_info?.content
										? document.quick_note_info.content
										: t('document_no_md')
								}
								ownerId={document?.creator.id}
							/>
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

export default QuickDocumentDetail;
