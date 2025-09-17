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
import { useTranslations } from 'next-intl';
import CustomImage from '../ui/custom-image';
import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { FileService } from '@/lib/file';
import { getUserFileSystemDetail } from '@/service/file-system';
import { Separator } from '../ui/separator';
import SectionOperate from './section-operate';
import { cn } from '@/lib/utils';

const SectionMarkdown = ({
	id,
	className,
}: {
	id: number;
	className?: string;
}) => {
	const t = useTranslations();
	const { userInfo } = useUserContext();
	const {
		data: section,
		isFetching,
		isFetched,
		error,
		isError,
	} = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	const { data: userFileSystemDetail } = useQuery({
		queryKey: ['getUserFileSystemDetail', userInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: userInfo!.default_user_file_system!,
			}),
		enabled:
			userInfo?.id !== undefined &&
			userInfo?.default_user_file_system !== undefined,
	});

	const [markdown, setMarkdown] = useState<string>();
	const [markdownIsFetching, setMarkdownIsFetching] = useState<boolean>(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();

	const onGetMarkdown = async () => {
		if (!section || !section.md_file_name || !userInfo) return;
		setMarkdownIsFetching(true);
		if (!userInfo.default_user_file_system) {
			toast.error('No user default file system found');
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		try {
			const [res, err] = await utils.to(
				fileService.getFileContent(section?.md_file_name)
			);
			if (!res || err) {
				setMarkdownGetError(err.message);
				setMarkdownIsFetching(false);
				return;
			}
			if (typeof res === 'string') {
				setMarkdown(res);
			}
			setMarkdownIsFetching(false);
		} catch (e: any) {
			setMarkdownIsFetching(false);
			setMarkdownGetError(e.message);
		}
	};

	useEffect(() => {
		if (!section || !section.md_file_name || !userInfo || !userFileSystemDetail)
			return;
		onGetMarkdown();
	}, [section, userInfo, userFileSystemDetail]);

	return (
		<>
			{((isFetching && !isFetched) || (markdownIsFetching && !isFetched)) && (
				<Skeleton className='h-full w-full' />
			)}

			<div className={cn('h-full w-full relative', className)}>
				{((isError && error) || markdownGetError) && (
					<div className='h-full w-full flex justify-center items-center text-muted-foreground text-xs'>
						{error?.message ?? (
							<div className='flex flex-col text-center gap-2 w-full'>
								<p>{markdownGetError}</p>
								<Separator />
								<SectionOperate id={id} />
							</div>
						)}
					</div>
				)}

				{markdown && !isError && !markdownGetError && (
					<div className='w-full h-full flex flex-col'>
						<div className='flex-1 overflow-auto relative'>
							<div className='prose dark:prose-invert mx-auto pb-5'>
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
						</div>
						<Separator className='mb-5' />
						<SectionOperate id={id} />
					</div>
				)}
			</div>
		</>
	);
};

export default SectionMarkdown;
