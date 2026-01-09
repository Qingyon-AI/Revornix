import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import 'katex/dist/katex.min.css';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import DocumentOperate from './document-operate';
import { useInView } from 'react-intersection-observer';
import { useEffect, useState } from 'react';
import { DocumentProcessStatus } from '@/enums/document';
import { getQueryClient } from '@/lib/get-query-client';
import { useInterval } from 'ahooks';
import { useUserContext } from '@/provider/user-provider';
import CustomMarkdown from '../ui/custom-markdown';
import { useTranslations } from 'next-intl';

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
		if (
			document &&
			document.process_task &&
			document.process_task?.status < DocumentProcessStatus.SUCCESS
		) {
			setDelay(1000);
		} else {
			setDelay(undefined);
		}
	}, [document?.process_task?.status]);

	useEffect(() => {
		if (!document || !document.quick_note_info) return;
		setMarkdownRendered(true);
	}, [document, mainUserInfo]);

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView]);

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
						<div className='prose dark:prose-invert mx-auto pb-5'>
							<CustomMarkdown
								content={
									document?.quick_note_info?.content
										? document.quick_note_info.content
										: t('document_no_md')
								}
							/>
						</div>
						<div ref={bottomRef}></div>
					</div>
					<Separator className='mb-5' />
					<DocumentOperate id={id} className='mb-5 md:mb-0 overflow-auto' />
				</div>
			)}
		</div>
	);
};

export default QuickDocumentDetail;
