'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { useRouter } from 'nextjs-toploader/app';
import { getLabels } from '@/service/document';
import { useTranslations } from 'next-intl';

const DocumentLabelsBox = () => {
	const router = useRouter();
	const t = useTranslations();
	const {
		data: documentLabels,
		isFetching: isFetchingDocumentLabels,
		isSuccess: isSuccessDocumentLabels,
	} = useQuery({
		queryKey: ['getDocumentLabels'],
		queryFn: getLabels,
	});
	return (
		<>
			{isFetchingDocumentLabels && <Skeleton className='w-full h-10' />}
			{isSuccessDocumentLabels && documentLabels.data.length === 0 && (
				<div className='text-muted-foreground text-xs text-center w-full'>{t('document_label_empty')}</div>
			)}
			{!isFetchingDocumentLabels &&
				documentLabels &&
				documentLabels.data.map((label, index) => {
					return (
						<Badge
							className='cursor-pointer'
							key={index}
							onClick={() => {
								router.push(`/document/mine?label_id=${label.id}`);
							}}>
							{'# ' + label.name}
						</Badge>
					);
				})}
		</>
	);
};

export default DocumentLabelsBox;
