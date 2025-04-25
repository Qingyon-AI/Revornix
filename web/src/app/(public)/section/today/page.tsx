'use client';

import { Separator } from '@/components/ui/separator';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { useQuery } from '@tanstack/react-query';
import { getDayDocumentsSummarySection } from '@/service/section';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import SectionDocumentCard from '@/components/section/section-document-card';
import Markdown from 'react-markdown';
import { utils } from '@kinda/utils';
import { getFile } from '@/service/file';

const SectionDetailPage = () => {
	const today = new Date().toISOString().split('T')[0];
	const {
		data: section,
		isFetching,
		isError,
		error,
	} = useQuery({
		queryKey: ['todayDocumentSummarySection'],
		queryFn: () => getDayDocumentsSummarySection({ date: today }),
	});

	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const [markdown, setMarkdown] = useState<string>();

	const onGetMarkdown = async () => {
		if (!section || !section.md_file_name) return;
		try {
			const [res, err] = await utils.to(getFile(section?.md_file_name));
			if (!res || err) {
				setMarkdownGetError(err.message);
				return;
			}
			setMarkdown(res);
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	useEffect(() => {
		if (!section || !section?.md_file_name) return;
		onGetMarkdown();
	}, [section]);

	return (
		<>
			<div className='px-5 pb-5 w-full flex flex-col gap-5 relative flex-1 box-border'>
				<div className='flex justify-between items-center'>
					<Sheet>
						<SheetTrigger className='bg-muted rounded px-4 py-2 text-xs'>
							当天累计分析
							<span className='font-bold text-sm px-1'>
								{section?.documents.length || 0}
							</span>
							篇文档
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>关联文档</SheetTitle>
								<SheetDescription>
									这里可以查看本文章关联的所有文档。
								</SheetDescription>
							</SheetHeader>
							<div className='px-5 flex flex-col gap-5 overflow-auto pb-5'>
								{section &&
									section.documents &&
									section.documents.map((document, index) => {
										return (
											<SectionDocumentCard key={index} document={document} />
										);
									})}
							</div>
						</SheetContent>
					</Sheet>
					{section && (
						<p className='text-xs bg-muted rounded px-4 py-2'>
							最近更新：
							{format(section.update_time as Date, 'yyyy-MM-dd HH:mm:ss')}
						</p>
					)}
				</div>
				<Separator />
				<div
					className='w-full prose max-w-none dark:prose-invert overflow-auto'
					style={{ flex: '1 1 0' }}>
					{isFetching && <Skeleton className='h-full w-full' />}
					{((isError && error) || markdownGetError) && (
						<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
							{error?.message ?? (
								<div className='flex flex-col text-center gap-2'>
									<p>获取markdown文件出错</p>
									<p>{markdownGetError}</p>
								</div>
							)}
						</div>
					)}
					{markdown && !isError && !markdownGetError && (
						<div className='prose dark:prose-invert mx-auto'>
							<Markdown
								components={{
									img: (props) => {
										let src = '';
										if (props.src?.startsWith('images/')) {
											src = `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${props.src}`;
										} else {
											src =
												props.src ??
												`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/images/cover.jpg`;
										}
										return <img {...props} src={src} />;
									},
								}}
								remarkPlugins={[remarkMath, remarkGfm]}
								rehypePlugins={[rehypeKatex, rehypeRaw]}>
								{markdown}
							</Markdown>
							<p className='text-xs text-center text-muted-foreground bg-muted rounded py-2'>
								本文由AI识别网站而来，请酌情识别信息。
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
};
export default SectionDetailPage;
