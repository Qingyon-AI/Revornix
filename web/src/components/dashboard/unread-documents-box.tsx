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
import { useTranslations } from 'next-intl';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { TrashIcon } from 'lucide-react';

const UnReadDocumentBox = () => {
	const router = useRouter();
	const t = useTranslations();
	const { data: unReadDocuments, isFetching: isFetchingUnReadDocuments } =
		useQuery({
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
				<CardHeader className='flex-1 flex flex-col'>
					<CardTitle className='flex flex-row items-center'>
						<span>{t('unread_documents_card_title')}</span>
						<span className='ml-2 font-bold text-sm'>
							{isFetchingUnReadDocuments && <Skeleton className='size-4' />}
							{!isFetchingUnReadDocuments && unReadDocuments?.total}
						</span>
					</CardTitle>
					<CardDescription className='flex-1'>
						{t('unread_documents_card_description')}
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
						<Empty>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<TrashIcon />
								</EmptyMedia>
								<EmptyDescription>{t('no_unread_documents')}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
				</CardContent>
			</Card>
		</>
	);
};

export default UnReadDocumentBox;
