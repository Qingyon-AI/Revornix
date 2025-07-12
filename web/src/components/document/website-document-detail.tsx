import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail, transformToMarkdown } from '@/service/document';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkParse from 'remark-parse';
import remarkHtml from 'remark-html';
import { VFile } from 'vfile';
import { unified } from 'unified';
import { Button } from '../ui/button';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { Info, Loader2 } from 'lucide-react';
import { getQueryClient } from '@/lib/get-query-client';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/hybrid-tooltip';
import { getFile } from '@/service/file';
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';
import { EditorContent, EditorContext, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button';
import { Import } from '@tiptap-pro/extension-import';

import '@/components/tiptap-node/paragraph-node/paragraph-node.scss';
import '@/styles/_variables.scss';
import '@/styles/_keyframe-animations.scss';

const WebsiteDocumentDetail = ({
	id,
	className,
}: {
	id: string;
	className?: string;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const {
		data: document,
		isError,
		error,
		isRefetching,
		refetch,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: Number(id) }),
	});
	const [delay, setDelay] = useState<number | undefined>(1000);
	useInterval(() => {
		if (
			document &&
			document?.transform_task &&
			document?.transform_task?.status >= 2
		) {
			setDelay(undefined);
		}
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	}, delay);
	const [markdown, setMarkdown] = useState<string>();
	const onGetMarkdown = async () => {
		if (!document || !document?.website_info?.md_file_name) return;
		try {
			const [res, err] = await utils.to(
				getFile(document?.website_info?.md_file_name)
			);
			if (!res || err) {
				throw new Error(err.message);
			}
			setMarkdown(res);
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	const handleTransformToMarkdown = async () => {
		setMarkdowningTransform(true);
		const [res, err] = await utils.to(
			transformToMarkdown({
				document_id: Number(id),
			})
		);
		if (err) {
			toast.error(err.message);
			setMarkdowningTransform(false);
			return;
		}
		setMarkdowningTransform(false);
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	};

	const handleInitMarkdown = async () => {
		const html = String(
			await unified().use(remarkParse).use(remarkHtml).process(markdown)
		);
		editor && editor.chain().focus().setContent(html).run();
	};

	useEffect(() => {
		if (markdown) {
			handleInitMarkdown();
		}
	}, [markdown]);

	useEffect(() => {
		if (!document || !document.website_info?.md_file_name) return;
		onGetMarkdown();
		// 初始化 unified processor
	}, [document]);

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit,
			Import.configure({
				// Your Convert App ID from https://cloud.tiptap.dev/convert-settings
				appId: '8mz07p19',
				// JWT token you generated
				token:
					'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTIyOTY4NTEsIm5iZiI6MTc1MjI5Njg1MSwiZXhwIjoxNzUyMzgzMjUxLCJpc3MiOiJodHRwczovL2Nsb3VkLnRpcHRhcC5kZXYiLCJhdWQiOiJhMmUxMDM4ZC01YWI1LTQyZjItOTExNy0zNTgxNTIxNTRhOGIifQ.Wbt7Meq4Y38FPhuN-N5eqZFkmYtGbSY_d7q8LS8xIdw',
				// If your markdown includes images, you can provide a URL for image upload
				// imageUploadCallbackUrl: 'https://your-image-upload-url.com',
			}),
		],
	});

	return (
		<div className={cn('h-full w-full relative', className)}>
			{((isError && error) || markdownGetError) && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
					{error?.message ?? (
						<div className='flex flex-col text-center gap-2'>
							<p>{markdownGetError}</p>
						</div>
					)}
				</div>
			)}
			{document && document.transform_task?.status === 0 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-xs text-muted-foreground gap-2'>
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
			{document && document.transform_task?.status === 1 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-muted-foreground text-xs gap-2'>
					<p>{t('document_transform_to_markdown_doing')}</p>
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
			{document && document.transform_task?.status === 3 && (
				<div className='h-full w-full flex flex-col justify-center items-center text-muted-foreground text-xs gap-2'>
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
				document.transform_task?.status === 2 && (
					<Skeleton className='h-full w-full' />
				)}
			<EditorContext.Provider value={{ editor }}>
				<div className='tiptap-button-group' data-orientation='horizontal'>
					<BlockquoteButton />
				</div>
				<EditorContent editor={editor} role='presentation' />
			</EditorContext.Provider>
			{/* {markdown && !isError && !markdownGetError && (
				<div className='prose dark:prose-invert mx-auto'>
					<Markdown
						components={{
							img: (props) => {
								let src = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/images/cover.jpg`;
								if (typeof props.src === 'string') {
									if (props.src.startsWith('images/')) {
										src = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${props.src}`;
									} else if (props.src) {
										src = props.src;
									}
								}
								return <img {...props} src={src} />;
							},
						}}
						remarkPlugins={[remarkMath, remarkGfm]}
						rehypePlugins={[rehypeKatex, rehypeRaw]}>
						{markdown}
					</Markdown>
					<p className='text-xs text-center text-muted-foreground bg-muted rounded py-2'>
						{t('document_ai_tips')}
					</p>
				</div>
			)} */}
		</div>
	);
};

export default WebsiteDocumentDetail;
