import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { getSectionDetail } from '@/service/section';
import { useEffect, useState } from 'react';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { FileService } from '@/lib/file';
import { getUserFileSystemDetail } from '@/service/file-system';
import { cn } from '@/lib/utils';
import CustomMarkdown from '../ui/custom-markdown';

const SectionMarkdown = ({
	id,
	className,
}: {
	id: number;
	className?: string;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
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
		queryKey: ['getUserFileSystemDetail', mainUserInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	const [markdown, setMarkdown] = useState<string>();
	const [markdownIsFetching, setMarkdownIsFetching] = useState<boolean>(false);
	const [markdownGetError, setMarkdownGetError] = useState<string>();

	const onGetMarkdown = async () => {
		if (!section || !section.md_file_name || !mainUserInfo) return;
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(true);
		if (!mainUserInfo.default_user_file_system) {
			toast.error(t('error_default_file_system_not_found'));
			setMarkdownIsFetching(false);
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		try {
			const [res, err] = await utils.to(
				fileService.getFileContent(section?.md_file_name),
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
		if (section?.md_file_name) return;
		setMarkdown(undefined);
		setMarkdownGetError(undefined);
		setMarkdownIsFetching(false);
	}, [section?.md_file_name]);

	useEffect(() => {
		if (
			!section ||
			!section.md_file_name ||
			!mainUserInfo ||
			!userFileSystemDetail
		)
			return;
		onGetMarkdown();
	}, [section, mainUserInfo, userFileSystemDetail]);

	const hasMarkdownFile = Boolean(section?.md_file_name);
	const showSkeleton =
		(!section && isFetching && !isError) ||
		(hasMarkdownFile && markdownIsFetching && !markdown);
	const showError = !showSkeleton && (isError || Boolean(markdownGetError));
	const showEmpty =
		!showSkeleton &&
		!showError &&
		isFetched &&
		Boolean(section) &&
		!hasMarkdownFile;

	return (
		<>
			{showEmpty && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-sm'>
					{t('section_markdown_empty')}
				</div>
			)}

			{showSkeleton && <Skeleton className='h-full w-full' />}

			{showError && (
				<div className='h-full w-full flex justify-center items-center text-muted-foreground text-sm relative'>
					{error?.message ?? <p>{markdownGetError}</p>}
				</div>
			)}

			{markdown && (
				<div className={cn('relative w-full', className)}>
					<div className='prose mx-auto pt-4 pb-0 dark:prose-invert'>
						<CustomMarkdown content={markdown} />
						<div className='not-prose mt-4 rounded-lg bg-muted/80 px-3 py-2 text-center text-sm text-muted-foreground'>
							{t('section_ai_tips')}
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default SectionMarkdown;
