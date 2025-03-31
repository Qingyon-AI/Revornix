'use client';

import { searchUserRecentReadDocument } from '@/service/document';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import StackedDocuments from '@/components/dashboard/stacked-documents';

const RecentReadDocumentBox = () => {
	const router = useRouter();
	const {
		data: recentReadDocuments,
		isFetching: isFetchingRecentReadDocuments,
		isSuccess: isSuccessRecentReadDocuments,
	} = useQuery({
		queryKey: ['searchUserRecentReadDocument'],
		queryFn: () => searchUserRecentReadDocument({ limit: 10, keyword: '' }),
	});
	return (
		<Card
			className='cursor-pointer'
			onClick={() => {
				router.push('/document/recent');
			}}>
			<CardHeader>
				<CardTitle className='flex flex-row items-center'>
					<span>最近阅读</span>
					<span className='ml-2 font-bold text-sm'>
						{isFetchingRecentReadDocuments && <Skeleton className='size-4' />}
						{!isFetchingRecentReadDocuments && recentReadDocuments?.total}
					</span>
				</CardTitle>
				<CardDescription>这里会显示近期阅读记录</CardDescription>
			</CardHeader>
			<CardContent className='flex-1'>
				{isFetchingRecentReadDocuments && <Skeleton className='w-full h-24' />}
				{!isFetchingRecentReadDocuments &&
					recentReadDocuments &&
					recentReadDocuments.total > 0 && (
						<StackedDocuments documents={recentReadDocuments.elements} />
					)}
				{recentReadDocuments?.total === 0 && !isFetchingRecentReadDocuments && (
					<span className='h-full text-xs text-muted-foreground flex justify-center items-center'>
						暂无最近阅读文档
					</span>
				)}
			</CardContent>
		</Card>
	);
};

export default RecentReadDocumentBox;
