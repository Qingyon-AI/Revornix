'use client';

import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { getSectionDetail } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import { formatDistance } from 'date-fns';
import { useRouter } from 'nextjs-toploader/app';
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
	const chipClassName =
		'w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground';

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
			<div className='mb-4'>
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
				<div className='px-4 pb-4'>
					<Skeleton className='w-full h-50' />
				</div>
			)}

			{isFetched && (
				<div className='space-y-4 px-4 pb-4'>
					<div className='rounded-xl border border-border/50 bg-card/70 p-4'>
						<div className='space-y-4'>
							{section?.create_time && (
								<p className='text-xs text-muted-foreground'>
									{t('section_updated_at')}{' '}
									{formatDistance(new Date(section.create_time), new Date(), {
										addSuffix: true,
										locale: locale === 'zh' ? zhCN : enUS,
									})}
								</p>
							)}
							<div className='flex flex-row items-center justify-between'>
								<div className='font-bold text-lg'>
									{section?.title ? section?.title : t('section_title_empty')}
								</div>
							</div>
							<div className='text-sm text-muted-foreground'>
								{section?.description
									? section?.description
									: t('section_description_empty')}
							</div>
							{section?.labels && section.labels.length > 0 && (
								<div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
									{section.labels.map((label) => {
										return (
											<div key={label.id} className={chipClassName}>
												{label.name}
											</div>
										);
									})}
								</div>
							)}
						</div>
					</div>
					<div className='rounded-xl border border-border/50 bg-card/70 p-4'>
						<div className='space-y-4'>
							<div className='grid grid-cols-12 gap-4 text-xs text-muted-foreground'>
								<div className='col-span-3'>{t('section_creator')}</div>
								{section?.creator && (
									<div className='col-span-9 flex flex-row items-center gap-1'>
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
							<div className='grid grid-cols-12 gap-4 text-xs text-muted-foreground'>
								<div className='col-span-3'>{t('section_participants')}</div>
								<div className='col-span-9'>
									<SectionInfoMember section_id={id} />
								</div>
							</div>
							<div className='grid grid-cols-12 gap-4 text-xs text-muted-foreground'>
								<div className='col-span-3'>{t('section_subscribers')}</div>
								<div className='col-span-9'>
									<SectionInfoSubscriber section_id={id} />
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default SectionInfo;
