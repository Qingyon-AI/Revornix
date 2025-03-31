'use client';

import { searchUserUnreadDocument } from '@/service/document';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'nextjs-toploader/app';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import StackedDocuments from '@/components/dashboard/stacked-documents';

const UnReadDocumentBox = () => {
	const router = useRouter();
	const {
		data: unReadDocuments,
		isFetching: isFetchingUnReadDocuments,
		isSuccess: isSuccessUnReadDocuments,
	} = useQuery({
		queryKey: ['searchUserUnreadDocument'],
		queryFn: () => searchUserUnreadDocument({ limit: 10, keyword: '' }),
	});
	return (
		<>
			<Card
				className='cursor-pointer'
				onClick={() => {
					router.push('/document/unread');
				}}>
				<CardHeader>
					<CardTitle className='flex flex-row items-center'>
						<span>未读文档</span>
						<span className='ml-2 font-bold text-sm'>
							{isFetchingUnReadDocuments && <Skeleton className='size-4' />}
							{!isFetchingUnReadDocuments && unReadDocuments?.total}
						</span>
					</CardTitle>
					<CardDescription>
						添加后，还未阅读的文档即会显示在这里。
					</CardDescription>
				</CardHeader>
				<CardContent className='flex-1'>
					{isFetchingUnReadDocuments && <Skeleton className='w-full h-24' />}
					{!isFetchingUnReadDocuments &&
						unReadDocuments &&
						unReadDocuments.total > 0 && (
							<StackedDocuments documents={unReadDocuments.elements} />
						)}
					{unReadDocuments?.total === 0 && !isFetchingUnReadDocuments && (
						<span className='h-full text-xs text-muted-foreground flex justify-center items-center'>
							暂无未读文档
						</span>
					)}
				</CardContent>
			</Card>
		</>
	);
};

export default UnReadDocumentBox;
