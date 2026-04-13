'use client';

import { PublicSectionInfo, getPublicSectionHref } from '@/lib/seo';
import { replacePath } from '@/lib/utils';
import { getSectionCoverSrc } from '@/lib/section-cover';
import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { BookTextIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import SectionCardPodcast from '../section/section-card-podcast';
import SeoSectionSubscribeButton from './seo-section-subscribe-button';

const PublicSectionCard = ({ section }: { section: PublicSectionInfo }) => {
	const locale = useLocale();
	const t = useTranslations();
	const router = useRouter();
	const sectionHref = getPublicSectionHref(section);
	const coverSrc = getSectionCoverSrc(section);

	return (
		<div className='group flex h-full flex-col overflow-hidden rounded-[24px] border border-border/60 bg-background/28 transition-colors duration-200 hover:border-border/80 hover:bg-background/40'>
			<Link href={sectionHref} className='block'>
				<div className='relative h-44 w-full overflow-hidden bg-muted/30'>
					{coverSrc ? (
						<img
							src={coverSrc}
							alt={section.title}
							className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]'
						/>
					) : (
						<div className='flex h-full w-full items-center justify-center'>
							<div className='flex items-center justify-center rounded-[20px] border border-border/60 bg-background/70 p-4 text-muted-foreground'>
								<BookTextIcon size={24} />
							</div>
						</div>
					)}
					<div className='absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent' />
				</div>
			</Link>

			<div className='flex flex-1 flex-col gap-4 p-5'>
				<Link href={sectionHref} className='block space-y-4'>
					<div className='space-y-2'>
						<h2 className='line-clamp-2 text-lg font-semibold leading-7'>
							{section.title ? section.title : t('section_title_empty')}
						</h2>
						{section.is_day_section ? (
							<div className='flex flex-wrap gap-2'>
								<div className='inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300'>
									{t('section_day_badge')}
								</div>
							</div>
						) : null}
						<p className='line-clamp-3 text-sm leading-6 text-muted-foreground'>
							{section.description
								? section.description
								: t('section_description_empty')}
						</p>
					</div>

					{section.labels && section.labels.length > 0 ? (
						<div className='flex flex-wrap gap-2'>
							{section.labels.map((label) => (
								<div
									key={label.id}
									className='rounded-full border border-border/60 bg-background/55 px-2.5 py-1 text-[11px] text-muted-foreground'>
									{label.name}
								</div>
							))}
						</div>
					) : null}
				</Link>

				<SectionCardPodcast section={section} />

				<div className='mt-auto flex flex-col gap-3 text-xs text-muted-foreground'>
					<div className='flex items-center gap-2'>
						<Avatar
							className='size-7'
							title={section.creator.nickname ?? ''}
							onClick={() => {
								router.push(`/user/${section.creator.id}`);
							}}>
							<AvatarImage
								src={replacePath(section.creator.avatar, section.creator.id)}
								alt='avatar'
								className='object-cover'
							/>
							<AvatarFallback className='font-semibold'>
								{section.creator.nickname.slice(0, 1) ?? '?'}
							</AvatarFallback>
						</Avatar>
						<div className='min-w-0'>
							<div className='line-clamp-1 text-sm text-foreground'>
								{section.creator.nickname}
							</div>
							<div className='line-clamp-1'>
								{formatDistance(
									new Date(section.update_time ?? section.create_time),
									new Date(),
									{
										addSuffix: true,
										locale: locale === 'zh' ? zhCN : enUS,
									},
								)}
							</div>
						</div>
					</div>

					<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
						<div className='flex flex-wrap gap-2'>
							<div className='rounded-full border border-border/60 bg-background/55 px-3 py-1'>
								{t('section_card_documents_count', {
									section_documents_count: section.documents_count ?? 0,
								})}
							</div>
							<div className='rounded-full border border-border/60 bg-background/55 px-3 py-1'>
								{t('section_card_subscribers_count', {
									section_subscribers_count: section.subscribers_count ?? 0,
								})}
							</div>
						</div>
						<SeoSectionSubscribeButton
							sectionId={section.id}
							creatorId={section.creator.id}
							initialIsSubscribed={section.is_subscribed}
							className='h-8 px-3 text-xs'
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PublicSectionCard;
