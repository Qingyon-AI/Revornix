'use client';

import DefaultFileSystemChange from '@/components/setting/default-file-system-change';
import MineFileSystemAddCard from '@/components/setting/mine-file-system-add-card';
import MineFileSystemCard from '@/components/setting/mine-file-system-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getMineFileSystems } from '@/service/file-system';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const FileSystemPage = () => {
	const t = useTranslations();
	const {
		data: mineFileSystems,
		isFetching: isFetchingMineFileSystems,
		isRefetching: isRefetchingMineFileSystems,
	} = useQuery({
		queryKey: ['mine-file-system'],
		queryFn: async () => {
			return await getMineFileSystems({ keyword: '' });
		},
	});

	return (
		<div className='px-5 pb-5'>
			{isFetchingMineFileSystems && !mineFileSystems && (
				<Skeleton className='w-full h-52' />
			)}
			{!isFetchingMineFileSystems &&
				mineFileSystems?.data &&
				mineFileSystems?.data.length === 0 && (
					<p className='text-xs text-muted-foreground text-center bg-muted p-5 rounded'>
						{t('setting_file_system_page_mine_file_system_empty')}
					</p>
				)}
			{mineFileSystems?.data && mineFileSystems.data.length > 0 && (
				<div className='grid grid-cols-1 md:grid-cols-4 gap-5'>
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
