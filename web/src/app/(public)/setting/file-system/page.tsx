'use client';

import DefaultFileSystemChange from '@/components/setting/default-file-system-change';
import MineFileSystemCard from '@/components/setting/mine-file-system-card';
import ProvideFileSystemCard from '@/components/setting/provide-file-system-card';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
	getMineFileSystems,
	getProvideFileSystems,
} from '@/service/file-system';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
	const {
		data: provideFileSystems,
		isFetching: isFetchingProvideFileSystems,
		isRefetching: isRefetchingProvideFileSystems,
	} = useQuery({
		queryKey: ['provide-file-system'],
		queryFn: async () => {
			return await getProvideFileSystems({ keyword: '' });
		},
	});

	return (
		<div className='px-5 pb-5'>
			<Card className='shadow-none'>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_file_system_page_current_file_system')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DefaultFileSystemChange />
						</div>
					</div>
				</CardContent>
			</Card>
			<h2 className='text-xs text-muted-foreground p-3 flex flex-row items-center'>
				{t('setting_file_system_page_official_file_system')}
				{isFetchingProvideFileSystems && (
					<Loader2 className='animate-spin size-4 ml-2' />
				)}
			</h2>
			{isFetchingProvideFileSystems && !provideFileSystems && (
				<Skeleton className='w-full h-52' />
			)}
			{!isFetchingProvideFileSystems &&
				provideFileSystems?.data &&
				provideFileSystems?.data.length === 0 && (
					<p className='text-xs text-muted-foreground text-center bg-muted p-5 rounded'>
						{t('setting_file_system_page_official_file_system')}
					</p>
				)}
			{provideFileSystems?.data && provideFileSystems.data.length > 0 && (
				<Card>
					<CardContent className='grid grid-cols-1 md:grid-cols-4 gap-5'>
						{provideFileSystems?.data?.map((file_system, index) => {
							return (
								<ProvideFileSystemCard key={index} file_system={file_system} />
							);
						})}
					</CardContent>
				</Card>
			)}
			<h2 className='text-xs text-muted-foreground p-3 flex flex-row items-center'>
				{t('setting_file_system_page_mine_file_system')}
				{isRefetchingMineFileSystems && (
					<Loader2 className='animate-spin size-4 ml-2' />
				)}
			</h2>
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
				<Card>
					<CardContent className='grid grid-cols-1 md:grid-cols-4 gap-5'>
						{mineFileSystems?.data?.map((file_system, index) => {
							return (
								<MineFileSystemCard key={index} file_system={file_system} />
							);
						})}
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default FileSystemPage;
