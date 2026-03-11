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
import { useTranslations } from 'next-intl';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { Clock3 } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import CardTitleIcon from '@/components/ui/card-title-icon';

const RecentReadDocumentBox = () => {
	const t = useTranslations();
	const router = useRouter();
	const { mainUserInfo } = useUserContext();
	const {
		data: recentReadDocuments,
		isFetching: isFetchingRecentReadDocuments,
	} = useQuery({
		enabled: !!mainUserInfo?.id,
		queryKey: ['searchUserRecentReadDocument', mainUserInfo?.id],
		queryFn: () => searchUserRecentReadDocument({ limit: 10, keyword: '' }),
	});
	return (
		<Card
			className='cursor-pointer gap-4 rounded-2xl border border-border/60 bg-card/80 py-4 shadow-sm backdrop-blur-sm'
			onClick={() => {
				router.push('/document/recent');
			}}>
			<CardHeader className='flex flex-1 flex-col gap-1 px-5'>
				<CardTitle className='flex items-center gap-3'>
					<CardTitleIcon icon={Clock3} tone='indigo' />
					<div className='flex items-center'>
						<span>{t('recent_read_documents_card_title')}</span>
						<span className='ml-2 font-bold text-sm'>
						{isFetchingRecentReadDocuments && <Skeleton className='size-4' />}
						{!isFetchingRecentReadDocuments && recentReadDocuments?.total}
						</span>
					</div>
				</CardTitle>
				<CardDescription>
					{t('recent_read_documents_card_description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='flex-1 px-5 pt-0'>
				{isFetchingRecentReadDocuments && (
					<Skeleton className='h-32 w-full rounded-xl' />
				)}
				{!isFetchingRecentReadDocuments &&
					recentReadDocuments &&
					recentReadDocuments.total > 0 && (
						<StackedDocuments documents={recentReadDocuments.elements} />
					)}
				{recentReadDocuments?.total === 0 && !isFetchingRecentReadDocuments && (
					<Empty className='gap-4 py-4 md:py-6'>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<Clock3 />
							</EmptyMedia>
							<EmptyDescription>{t('no_recent_read_documents')}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</CardContent>
		</Card>
	);
};

export default RecentReadDocumentBox;
