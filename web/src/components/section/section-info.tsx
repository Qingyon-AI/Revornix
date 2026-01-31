'use client';

import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { getSectionDetail } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import { formatDistance } from 'date-fns';
import { useRouter } from 'nextjs-toploader/app';
import { Badge } from '../ui/badge';
import { useLocale, useTranslations } from 'next-intl';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import SectionInfoSubscriber from './section-info-subscriber';
import SectionInfoMember from './section-info-member';
import { replacePath } from '@/lib/utils';

const SectionInfo = ({ id }: { id: number }) => {
	const locale = useLocale();
	const t = useTranslations();
	const router = useRouter();

	const {
		data: section,
		isFetching,
		isFetched,
	} = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	return (
		<>
			<div className='mb-5'>
				<img
					src={
						section?.cover
							? replacePath(section.cover, section.creator.id)
							: '/images/cover.jpg'
					}
					alt='cover'
					className='w-full h-40 object-cover'
				/>
			</div>

			{isFetching && !isFetched && (
				<div className='px-5'>
					<Skeleton className='w-full h-50' />
				</div>
			)}

			{isFetched && (
				<>
					{section?.create_time && (
						<div className='px-5 mb-3'>
							<p className='text-xs text-muted-foreground'>
								{t('section_updated_at')}{' '}
								{formatDistance(new Date(section.create_time), new Date(), {
									addSuffix: true,
									locale: locale === 'zh' ? zhCN : enUS,
								})}
							</p>
						</div>
					)}
					<div className='flex flex-row justify-between items-center px-5 mb-3'>
						<div className='font-bold text-lg'>
							{section?.title ? section?.title : t('section_title_empty')}
						</div>
					</div>
					<div className='text-sm text-muted-foreground mb-3 px-5'>
						{section?.description
							? section?.description
							: t('section_description_empty')}
					</div>
					{section?.labels && section.labels.length > 0 && (
						<div className='flex flex-row gap-2 items-center px-5 mb-3 flex-wrap'>
							{section.labels.map((label) => {
								return (
									<Badge key={label.id} variant={'secondary'}>
										{label.name}
									</Badge>
								);
							})}
						</div>
					)}
					<div className='grid grid-cols-12 px-5 mb-3 text-xs text-muted-foreground gap-5'>
						<div className='col-span-3'>{t('section_creator')}</div>
						{section?.creator && (
							<div className='flex flex-row items-center gap-1 col-span-9'>
								<Avatar
									className='size-6'
									title={section?.creator.nickname ?? ''}
									onClick={(e) => {
										router.push(`/user/detail/${section?.creator.id}`);
										e.preventDefault();
										e.stopPropagation();
									}}>
									<AvatarImage
										src={replacePath(
											section?.creator.avatar,
											section.creator.id,
										)}
										alt='avatar'
										className='size-6'
									/>
									<AvatarFallback className='size-6'>
										{section?.creator.nickname}
									</AvatarFallback>
								</Avatar>
								<p
									onClick={(e) => {
										router.push(`/user/detail/${section?.creator.id}`);
										e.preventDefault();
										e.stopPropagation();
									}}>
									{section?.creator.nickname}
								</p>
							</div>
						)}
					</div>
					<div className='grid grid-cols-12 px-5 mb-3 text-xs text-muted-foreground gap-5'>
						<div className='col-span-3'>{t('section_participants')}</div>
						<div className='col-span-9'>
							<SectionInfoMember section_id={id} />
						</div>
					</div>
					<div className='grid grid-cols-12 px-5 mb-3 text-xs text-muted-foreground gap-5'>
						<div className='col-span-3'>{t('section_subscribers')}</div>
						<div className='col-span-9'>
							<SectionInfoSubscriber section_id={id} />
						</div>
					</div>
				</>
			)}
		</>
	);
};

export default SectionInfo;
