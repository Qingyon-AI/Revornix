import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { getSectionDetail } from '@/service/section';
import { useEffect, useState } from 'react';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import Markdown from 'react-markdown';
import { utils } from '@kinda/utils';
import { getFile } from '@/service/file';
import { useTranslations } from 'next-intl';

const SectionMarkdown = ({ id }: { id: number }) => {
	const t = useTranslations();
	const {
		data: section,
		isFetching,
		error,
		isError,
	} = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	const [markdown, setMarkdown] = useState<string>();
	const [markdownIsFetching, setMarkdownIsFetching] = useState<boolean>(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();

	const onGetMarkdown = async () => {
		if (!section || !section.md_file_name) return;
		setMarkdownIsFetching(true);
		try {
			const [res, err] = await utils.to(getFile(section?.md_file_name));
			if (!res || err) {
				setMarkdownGetError(err.message);
				setMarkdownIsFetching(false);
				return;
			}
			setMarkdown(res);
			setMarkdownIsFetching(false);
		} catch (e: any) {
			setMarkdownIsFetching(false);
			setMarkdownGetError(e.message);
		}
	};

	useEffect(() => {
		if (!section || !section?.md_file_name) return;
		onGetMarkdown();
	}, [section]);

	return (
		<>
			{isFetching ||
				(markdownIsFetching && <Skeleton className='h-full w-full' />)}
			<div
				className='h-full w-full prose mx-auto dark:prose-invert overflow-auto'
				style={{ flex: '1 1 0' }}>
				{!isFetching &&
					section &&
					section.documents &&
					section.documents.length === 0 && (
						<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
							<div className='flex flex-col text-center gap-2'>
								<p>{t('section_document_empty')}</p>
							</div>
						</div>
					)}
				{((isError && error) || markdownGetError) && (
					<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
						{error?.message ?? (
							<div className='flex flex-col text-center gap-2'>
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
							{t('section_ai_tips')}
						</p>
					</div>
				)}
			</div>
		</>
	);
};

export default SectionMarkdown;
