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
import {
	getUserFileSystemDetail,
	getUserFileUrlPrefix,
} from '@/service/file-system';

const SectionMarkdown = ({ id }: { id: number }) => {
	const t = useTranslations();
	const { userInfo } = useUserContext();
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

	const { data: userRemoteFileUrlPrefix } = useQuery({
		queryKey: ['getUserRemoteFileUrlPrefix', section?.creator?.id],
		queryFn: () => {
			return getUserFileUrlPrefix({ user_id: section!.creator!.id });
		},
		enabled: !!section?.creator?.id,
	});

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
		if (
			!section ||
			!section.md_file_name ||
			!userInfo ||
			!userFileSystemDetail ||
			!userRemoteFileUrlPrefix
		)
			return;
		onGetMarkdown();
	}, [section, userInfo, userRemoteFileUrlPrefix, userFileSystemDetail]);

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
		</>
	);
};

export default SectionMarkdown;
