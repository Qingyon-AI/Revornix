import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { MarkdownContentSkeleton } from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import {
	getDocumentDetail,
	getDocumentMarkdownContent,
	transformToMarkdown,
	updateDocument,
	touchDocumentContent,
} from '@/service/document';
import 'katex/dist/katex.min.css';
import {
	ExternalLink,
	Hourglass,
	Loader2,
	RefreshCw,
	TriangleAlert,
} from 'lucide-react';
import { Button } from '../ui/button';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';
import { useInView } from 'react-intersection-observer';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import { DocumentMdConvertStatus } from '@/enums/document';
import { shouldPollDocumentDetail } from '@/lib/document-task';
import { useRef } from 'react';
import { toStableMarkdownSourceKey } from '@/lib/markdown-source';
import EditableMarkdownPanel from '../markdown/editable-markdown-panel';
import useDocumentMarkdownEditable from '@/hooks/use-document-markdown-editable';
import { NotFoundView } from '../not-found/not-found-view';

const FileDocumentDetail = ({
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
	const statusContainerClassName = cn(
		'mx-auto w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px] px-4 sm:px-6',
	);
	const statusViewClassName =
		'min-h-[calc(100dvh-14rem)] px-4 py-12 sm:min-h-[calc(100dvh-14.25rem)]';
	const [markdownRendered, setMarkdownRendered] = useState(false);
	const {
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

	const [delay, setDelay] = useState<number>();
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

	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const [markdown, setMarkdown] = useState<string>();
	const loadedMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const loadingMarkdownSourceKeyRef = useRef<string | undefined>(undefined);
	const stableMarkdownSourceKey = toStableMarkdownSourceKey(
		document?.convert_task?.md_file_name,
	);
	const markdownSourceKey =
		document?.convert_task?.status === DocumentMdConvertStatus.SUCCESS &&
		stableMarkdownSourceKey
			? stableMarkdownSourceKey
			: undefined;

	const onGetMarkdown = async (sourceKey: string) => {
		if (
			!document ||
			document.convert_task?.status !== DocumentMdConvertStatus.SUCCESS
		) {
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
			setMarkdownGetError(e.message);
		} finally {
			if (loadingMarkdownSourceKeyRef.current === sourceKey) {
				loadingMarkdownSourceKeyRef.current = undefined;
			}
		}
	};

	const touchDocumentAfterMarkdownEdit = async () => {
		if (!document) {
			return;
		}

		await updateDocument({
			document_id: id,
			title: document.title,
			description: document.description ?? '',
			cover: document.cover ?? null,
			labels: document.labels?.map((label) => label.id) ?? [],
			sections: document.sections?.map((section) => section.id) ?? [],
		});
		await touchDocumentContent({ document_id: id });
	};

	const handleSaveMarkdown = async (content: string) => {
		if (
			!document?.convert_task?.md_file_name ||
			!userFileSystemDetail?.file_system_id
		) {
			throw new Error(t('document_markdown_file_missing'));
		}

		const fileName =
			document.convert_task.md_file_name.split('/').pop() ||
			`document-${id}.md`;
		const fileService = new FileService(userFileSystemDetail.file_system_id);
		const file = new File([content], fileName, {
			type: 'text/markdown;charset=utf-8',
		});

		await fileService.uploadFile(document.convert_task.md_file_name, file);
		await touchDocumentAfterMarkdownEdit();
		setMarkdown(content);
		setMarkdownRendered(true);
		setMarkdownGetError(undefined);
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
			exact: true,
		});
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
		setMarkdown(undefined);
		toast.success(t('document_transform_again'));
		setDelay(1000);
	};

	const renderRetryButton = () => (
		<Button
			className='rounded-full'
			disabled={markdownTransforming}
			onClick={() => void handleTransformToMarkdown()}>
			{markdownTransforming ? (
				<Loader2 className='size-4 animate-spin' />
			) : (
				<RefreshCw className='size-4' />
			)}
			{t('retry')}
		</Button>
	);

	const renderOriginalFileButton = () => {
		if (!document?.file_info?.file_name) {
			return null;
		}

		return (
			<Button asChild variant='outline' className='rounded-full'>
				<a href={document.file_info.file_name} target='_blank' rel='noreferrer'>
					<ExternalLink className='size-4' />
					{t('file_document_go_to_origin')}
				</a>
			</Button>
		);
	};

	useEffect(() => {
		if (!markdownSourceKey) {
			return;
		}
		void onGetMarkdown(markdownSourceKey);
	}, [markdownSourceKey]);

	useEffect(() => {
		if (document?.convert_task?.status === DocumentMdConvertStatus.SUCCESS) {
			return;
		}
		loadedMarkdownSourceKeyRef.current = undefined;
		loadingMarkdownSourceKeyRef.current = undefined;
	}, [document?.convert_task?.status]);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView, markdownRendered, onFinishRead]);

	return (
		<div className={cn('w-full relative pt-4', className)}>
			{((isError && error) || markdownGetError) && (
				<div className={statusContainerClassName}>
					<NotFoundView
						code={null}
						icon={TriangleAlert}
						title={t('document_markdown_load_failed')}
						description={error?.message ?? markdownGetError}
						className={statusViewClassName}
					/>
				</div>
			)}
			{document &&
				(document.convert_task?.status === DocumentMdConvertStatus.WAIT_TO ||
					!document.convert_task) && (
					<div className={statusContainerClassName}>
						<NotFoundView
							code={null}
							icon={Hourglass}
							title={t('document_transform_to_markdown_todo')}
							description={t('document_transform_to_markdown_todo_tips')}
							className={statusViewClassName}
							footer={
								<>
									{renderRetryButton()}
									{renderOriginalFileButton()}
								</>
							}
						/>
					</div>
				)}
			{document &&
				document.convert_task?.status ===
					DocumentMdConvertStatus.CONVERTING && (
					<div className={statusContainerClassName}>
						<NotFoundView
							code={null}
							icon={Loader2}
							title={t('document_transform_to_markdown_doing_title')}
							description={t('document_transform_to_markdown_doing')}
							className={statusViewClassName}
							footer={
								<>
									{renderRetryButton()}
									{renderOriginalFileButton()}
								</>
							}
						/>
					</div>
				)}
			{document &&
				document.convert_task?.status === DocumentMdConvertStatus.FAILED && (
					<div className={statusContainerClassName}>
						<NotFoundView
							code={null}
							icon={TriangleAlert}
							title={t('document_transform_to_markdown_failed')}
							description={t('document_transform_to_markdown_failed_description')}
							className={statusViewClassName}
							footer={
								<>
									{renderRetryButton()}
									{renderOriginalFileButton()}
								</>
							}
						/>
					</div>
				)}
			{document &&
				!markdown &&
				!isError &&
				!markdownGetError &&
				document.convert_task?.status === DocumentMdConvertStatus.SUCCESS && (
					<MarkdownContentSkeleton
						className='min-h-[calc(100dvh-14rem)]'
						showToolbar={canEditMarkdown}
					/>
				)}
			{markdown && !isError && !markdownGetError && (
				<>
					<EditableMarkdownPanel
						content={markdown}
						creatorId={document?.creator.id}
						onSave={handleSaveMarkdown}
						editable={canEditMarkdown}
						showFloatingToc
						viewerFooter={
							<div className='my-4 w-full rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-center text-sm text-muted-foreground'>
								{t('document_ai_tips')}
							</div>
						}
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

export default FileDocumentDetail;
