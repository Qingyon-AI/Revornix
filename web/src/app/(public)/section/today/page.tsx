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
import { useTranslations } from 'next-intl';
import CustomImage from '@/components/ui/custom-image';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';

const SectionDetailPage = () => {
	const t = useTranslations();
	const { userInfo } = useUserContext();
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
		if (!userInfo?.default_file_system) {
			toast.error('No default file system found');
			return;
		}
		const fileService = new FileService(userInfo.default_file_system);
		try {
			const [res, err] = await utils.to(
				fileService.getFileContent(section?.md_file_name)
			);
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
							{t('today_section_documents_summary', {
								today_documents_count: section?.documents.length || 0,
							})}
						</SheetTrigger>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>{t('section_documents')}</SheetTitle>
								<SheetDescription>
									{t('section_documents_description')}
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
							{t('section_updated_at')}
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
										return <CustomImage {...props} />;
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
			</div>
		</>
	);
};
export default SectionDetailPage;
