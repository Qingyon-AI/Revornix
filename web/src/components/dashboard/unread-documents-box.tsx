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
import { Inbox } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import CardTitleIcon from '@/components/ui/card-title-icon';

const UnReadDocumentBox = () => {
	const router = useRouter();
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { data: unReadDocuments, isFetching: isFetchingUnReadDocuments } =
		useQuery({
			enabled: !!mainUserInfo?.id,
			queryKey: ['searchUserUnreadDocument', mainUserInfo?.id],
			queryFn: () => searchUserUnreadDocument({ limit: 10, keyword: '' }),
		});
	return (
		<>
			<Card
				className='cursor-pointer gap-4 rounded-2xl border border-border/60 bg-card/80 py-4 shadow-sm backdrop-blur-sm'
				onClick={() => {
					router.push('/document/unread');
				}}>
				<CardHeader className='flex flex-1 flex-col gap-1 px-5'>
					<CardTitle className='flex items-center gap-3'>
						<CardTitleIcon icon={Inbox} tone='sky' />
						<div className='flex items-center'>
							<span>{t('unread_documents_card_title')}</span>
							<span className='ml-2 font-bold text-sm'>
							{isFetchingUnReadDocuments && <Skeleton className='size-4' />}
							{!isFetchingUnReadDocuments && unReadDocuments?.total}
							</span>
						</div>
					</CardTitle>
					<CardDescription>
						{t('unread_documents_card_description')}
					</CardDescription>
				</CardHeader>
				<CardContent className='flex-1 px-5 pt-0'>
					{isFetchingUnReadDocuments && (
						<Skeleton className='h-32 w-full rounded-xl' />
					)}
					{!isFetchingUnReadDocuments &&
						unReadDocuments &&
						unReadDocuments.total > 0 && (
							<StackedDocuments documents={unReadDocuments.elements} />
						)}
					{unReadDocuments?.total === 0 && !isFetchingUnReadDocuments && (
						<Empty className='gap-4 py-4 md:py-6'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<Inbox />
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
