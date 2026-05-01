'use client';

import MineFileSystemAddCard from '@/components/setting/mine-file-system-add-card';
import MineFileSystemCard from '@/components/setting/mine-file-system-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ResourceCardSkeleton } from '@/components/ui/skeleton';
import { getMineFileSystems } from '@/service/file-system';
import { useQuery } from '@tanstack/react-query';
import { AlertCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

const FileSystemPage = () => {
	const t = useTranslations();
	const {
		data: mineFileSystems,
		isFetching,
		isError,
		isSuccess,
	} = useQuery({
		queryKey: ['mine-file-system'],
		queryFn: async () => {
			return await getMineFileSystems({ keyword: '' });
		},
	});

	return (
		<div className='px-5 pb-5'>
			<Alert className='mb-5'>
				<AlertCircleIcon />
				<AlertTitle>{t('important_notice')}</AlertTitle>
				<AlertDescription>
					{t('setting_file_system_page_alert')}
				</AlertDescription>
			</Alert>
			{isFetching && !mineFileSystems && (
				<div className='grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-4'>
					{Array.from({ length: 4 }).map((_, index) => (
						<ResourceCardSkeleton key={index} />
					))}
				</div>
			)}
			{isError && (
				<div className='flex h-full w-full items-center justify-center'>
					<p className='text-xs text-muted-foreground'>{t('something_wrong')}</p>
				</div>
			)}
			{isSuccess && (
				<div className='grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-5'>
					{mineFileSystems?.data?.map((file_system, index) => {
						return (
							<MineFileSystemCard key={index} user_file_system={file_system} />
						);
					})}
					<MineFileSystemAddCard />
				</div>
			)}
		</div>
	);
};

export default FileSystemPage;
