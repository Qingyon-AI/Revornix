'use client';

import { searchUserStarDocument } from '@/service/document';
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
import { Star, TrashIcon } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import CardTitleIcon from '@/components/ui/card-title-icon';

const StarDocumentBox = () => {
	const t = useTranslations();
	const router = useRouter();
	const { mainUserInfo } = useUserContext();
	const { data: starDocuments, isFetching: isFetchingStarDocuments } = useQuery(
		{
			enabled: !!mainUserInfo?.id,
			queryKey: ['searchMyStarDocument', mainUserInfo?.id],
			queryFn: () => searchUserStarDocument({ limit: 10, keyword: '' }),
		}
	);
	return (
		<Card
			className='cursor-pointer gap-4 rounded-2xl border border-border/60 bg-card/80 py-4 shadow-sm backdrop-blur-sm'
			onClick={() => {
				router.push('/document/star');
			}}>
			<CardHeader className='flex flex-1 flex-col gap-1 px-5'>
				<CardTitle className='flex items-center gap-3'>
					<CardTitleIcon icon={Star} tone='amber' />
					<div className='flex items-center'>
						<span>{t('star_documents_card_title')}</span>
						<span className='ml-2 font-bold text-sm'>
						{isFetchingStarDocuments && <Skeleton className='size-4' />}
						{!isFetchingStarDocuments && starDocuments?.total}
						</span>
					</div>
				</CardTitle>
				<CardDescription>
					{t('star_documents_card_description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='flex-1 px-5 pt-0'>
				{isFetchingStarDocuments && (
					<Skeleton className='h-32 w-full rounded-xl' />
				)}
				{!isFetchingStarDocuments &&
					starDocuments &&
					starDocuments.total > 0 && (
						<StackedDocuments documents={starDocuments.elements} />
					)}
				{starDocuments?.total === 0 && !isFetchingStarDocuments && (
					<Empty className='gap-4 py-4 md:py-6'>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<TrashIcon />
							</EmptyMedia>
							<EmptyDescription>{t('no_star_documents')}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
			</CardContent>
		</Card>
	);
};

export default StarDocumentBox;
