'use client';

import { useQuery } from '@tanstack/react-query';
import { getDayDocumentsSummarySection } from '@/service/section';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { getUserFileSystemDetail } from '@/service/file-system';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';
import { ChevronRight } from 'lucide-react';

const TodaySummary = () => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
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

	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const [markdown, setMarkdown] = useState<string>();

	const onGetMarkdown = async () => {
		if (!section || !section.md_file_name || !mainUserInfo) return;
		if (!mainUserInfo.default_user_file_system) {
			toast.error('No default file system found');
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		try {
			const [res, err] = await utils.to(
				fileService.getFileContent(section?.md_file_name)
			);
			if (!res || err) {
				setMarkdownGetError(err.message);
				return;
			}
			if (typeof res === 'string') {
				setMarkdown(res);
			}
		} catch (e: any) {
			setMarkdownGetError(e.message);
		}
	};

	useEffect(() => {
		if (
			!section ||
			!section?.md_file_name ||
			!mainUserInfo ||
			!userFileSystemDetail
		)
			return;
		onGetMarkdown();
	}, [section, mainUserInfo, userFileSystemDetail]);
	return (
		<Card>
			<CardHeader className='flex justify-between items-center'>
				<div className='flex flex-col gap-1.5'>
					<CardTitle>{t('dashboard_today_summary')}</CardTitle>
					<CardDescription>
						{t('dashboard_today_summary_description')}
					</CardDescription>
				</div>
				<Link href={'/section/today'}>
					<Button variant='ghost' className='text-sm text-muted-foreground'>
						{t('dashboard_today_summary_full')}
						<ChevronRight />
					</Button>
				</Link>
			</CardHeader>
			<CardContent className='flex-1'>
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
				{markdown && <div className='line-clamp-6'>{markdown}</div>}
			</CardContent>
		</Card>
	);
};

export default TodaySummary;
