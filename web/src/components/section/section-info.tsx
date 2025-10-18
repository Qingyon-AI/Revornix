'use client';

import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { getSectionDetail, getSectionUser } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import { formatDistance } from 'date-fns';
import SectionDocument from './section-document';
import { useRouter } from 'nextjs-toploader/app';
import { Badge } from '../ui/badge';
import { useLocale, useTranslations } from 'next-intl';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { UserSectionRole } from '@/enums/section';

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

	const { data: sectionMembers, isLoading: isLoadingMembers } = useQuery({
		queryKey: ['getSectionMembers', id, UserSectionRole.MEMBER],
		queryFn: async () => {
			return getSectionUser({
				section_id: id,
				filter_role: UserSectionRole.MEMBER,
			});
		},
	});

	const { data: sectionSubscribers, isLoading: isLoadingSubscribers } =
		useQuery({
			queryKey: ['getSectionSubscribers', id],
			queryFn: async () => {
				return getSectionUser({
					section_id: id,
					filter_role: UserSectionRole.SUBSCRIBER,
				});
			},
		});

	return (
		<>
			<div className='mb-5'>
				<img
					src={section?.cover ? section.cover : '/images/cover.jpg'}
					alt='cover'
					className='w-full h-52 object-cover'
				/>
			</div>

			{isFetching && !isFetched && (
				<div className='px-5 mb-3'>
					<Skeleton className='w-full h-40' />
				</div>
			)}

			{isFetched && (
				<>
					{section?.update_time && (
						<div className='px-5 mb-3'>
							<p className='text-xs text-muted-foreground'>
								{t('section_updated_at')}{' '}
								{formatDistance(new Date(section.update_time), new Date(), {
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
						<div className='col-span-2'>{t('section_creator')}</div>
						<div className='flex flex-row items-center gap-1 col-span-10'>
							<Avatar
								className='size-5'
								title={section?.creator.nickname ?? ''}
								onClick={(e) => {
									router.push(`/user/detail/${section?.creator.id}`);
									e.preventDefault();
									e.stopPropagation();
								}}>
								<AvatarImage src={section?.creator.avatar} alt='avatar' />
								<AvatarFallback>{section?.creator.nickname}</AvatarFallback>
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
					</div>
					<div className='grid grid-cols-12 px-5 mb-3 text-xs text-muted-foreground gap-5'>
						<div className='col-span-2'>{t('section_participants')}</div>
						<div className='flex flex-row items-center gap-1 col-span-10'>
							{isLoadingMembers && <Skeleton className='w-full h-5' />}
							{!isLoadingMembers && sectionMembers && (
								<div className='*:data-[slot=avatar]:ring-background flex -space-x-1 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale'>
									{sectionMembers?.users &&
										sectionMembers?.users.length > 0 &&
										sectionMembers.users.map((member, index) => {
											return (
												<Avatar
													key={index}
													className='size-5'
													title={member?.nickname ?? ''}
													onClick={(e) => {
														router.push(`/user/detail/${member?.id}`);
														e.preventDefault();
														e.stopPropagation();
													}}>
													<AvatarImage src={member.avatar} alt='avatar' />
													<AvatarFallback>{member.nickname}</AvatarFallback>
												</Avatar>
											);
										})}
									{sectionMembers?.users &&
										sectionMembers?.users.length === 0 && (
											<p>{t('section_participants_empty')}</p>
										)}
								</div>
							)}
						</div>
					</div>
					<div className='grid grid-cols-12 px-5 mb-3 text-xs text-muted-foreground gap-5'>
						<div className='col-span-2'>{t('section_subscribers')}</div>
						<div className='flex flex-row items-center gap-1 col-span-10'>
							{isLoadingSubscribers && <Skeleton className='w-full h-5' />}
							{!isLoadingSubscribers && sectionSubscribers && (
								<div className='*:data-[slot=avatar]:ring-background flex -space-x-1 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:grayscale'>
									{sectionSubscribers?.users &&
										sectionSubscribers?.users.length > 0 &&
										sectionSubscribers?.users?.map((subscriber, index) => {
											return (
												<Avatar
													key={index}
													className='size-5'
													title={subscriber?.nickname ?? ''}
													onClick={(e) => {
														router.push(`/user/detail/${subscriber?.id}`);
														e.preventDefault();
														e.stopPropagation();
													}}>
													<AvatarImage src={subscriber.avatar} alt='avatar' />
													<AvatarFallback>{subscriber.nickname}</AvatarFallback>
												</Avatar>
											);
										})}
									{sectionSubscribers?.users &&
										sectionSubscribers?.users.length === 0 && (
											<p>{t('section_subscribers_empty')}</p>
										)}
								</div>
							)}
						</div>
					</div>
				</>
			)}

			<div className='px-5'>
				<SectionDocument id={id} />
			</div>
		</>
	);
};

export default SectionInfo;
