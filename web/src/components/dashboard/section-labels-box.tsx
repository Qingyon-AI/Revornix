'use client';

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { useRouter } from 'nextjs-toploader/app';
import { getMineLabels } from '@/service/section';
import { useTranslations } from 'next-intl';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { TrashIcon } from 'lucide-react';

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
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<TrashIcon />
						</EmptyMedia>
						<EmptyDescription>{t('section_label_empty')}</EmptyDescription>
					</EmptyHeader>
				</Empty>
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
