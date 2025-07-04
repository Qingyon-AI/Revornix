'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { useRouter } from 'nextjs-toploader/app';
import { getMineLabels } from '@/service/section';
import { useTranslations } from 'next-intl';

const SectionLabelsBox = () => {
	const router = useRouter();
	const t = useTranslations();
	const { data, isFetching, isSuccess } = useQuery({
		queryKey: ['getSectionLabels'],
		queryFn: getMineLabels,
	});
	return (
		<>
			{isFetching && <Skeleton className='w-full h-10' />}
			{isSuccess && data.data.length === 0 && (
				<div className='text-muted-foreground text-xs text-center w-full'>{t('section_label_empty')}</div>
			)}
			{!isFetching &&
				data &&
				data.data.map((label, index) => {
					return (
						<Badge
							className='cursor-pointer'
							key={index}
							onClick={() => {
								router.push(`/section/mine?label_id=${label.id}`);
							}}>
							{'# ' + label.name}
						</Badge>
					);
				})}
		</>
	);
};

export default SectionLabelsBox;
