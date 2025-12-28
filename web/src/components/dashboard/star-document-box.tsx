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
import { TrashIcon } from 'lucide-react';

const StarDocumentBox = () => {
	const t = useTranslations();
	const router = useRouter();
	const { data: starDocuments, isFetching: isFetchingStarDocuments } = useQuery(
		{
			queryKey: ['searchMyStarDocument'],
			queryFn: () => searchUserStarDocument({ limit: 10, keyword: '' }),
		}
	);
	return (
		<Card
			className='cursor-pointer'
			onClick={() => {
				router.push('/document/star');
			}}>
			<CardHeader className='flex-1'>
				<CardTitle className='flex flex-row items-center'>
					<span>{t('star_documents_card_title')}</span>
					<span className='ml-2 font-bold text-sm'>
						{isFetchingStarDocuments && <Skeleton className='size-4' />}
						{!isFetchingStarDocuments && starDocuments?.total}
					</span>
				</CardTitle>
				<CardDescription>
					{t('star_documents_card_description')}
				</CardDescription>
			</CardHeader>
			<CardContent className='flex-1'>
				{isFetchingStarDocuments && <Skeleton className='w-full h-24' />}
				{!isFetchingStarDocuments &&
					starDocuments &&
					starDocuments.total > 0 && (
						<StackedDocuments documents={starDocuments.elements} />
					)}
				{starDocuments?.total === 0 && !isFetchingStarDocuments && (
					<Empty>
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
