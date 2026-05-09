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
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import SectionCardPodcast from '../section/section-card-podcast';
import SeoSectionSubscribeButton from './seo-section-subscribe-button';

const PublicSectionCard = ({ section }: { section: PublicSectionInfo }) => {
	const locale = useLocale();
	const t = useTranslations();
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
						<p className='line-clamp-2 text-sm leading-6 text-muted-foreground'>
							{section.description
								? section.description
								: t('section_description_empty')}
						</p>
					</div>

					<div className='flex flex-wrap gap-2'>
						{section.is_day_section ? (
							<div className='inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300'>
								{t('section_day_badge')}
							</div>
						) : null}
						{section.labels?.slice(0, 3).map((label) => (
							<div
								key={label.id}
								className='rounded-full border border-border/60 bg-background/55 px-2.5 py-1 text-[11px] text-muted-foreground'>
								{label.name}
							</div>
						))}
						<div className='rounded-full border border-border/45 bg-transparent px-2.5 py-1 text-[11px] text-muted-foreground/80'>
							{t('section_card_documents_count', {
								section_documents_count: section.documents_count ?? 0,
							})}
						</div>
						<div className='rounded-full border border-border/45 bg-transparent px-2.5 py-1 text-[11px] text-muted-foreground/80'>
							{t('section_card_subscribers_count', {
								section_subscribers_count: section.subscribers_count ?? 0,
							})}
						</div>
					</div>
				</Link>

				<SectionCardPodcast section={section} />

				<div className='mt-auto space-y-3 text-xs text-muted-foreground'>
					<div className='flex justify-start'>
						<SeoSectionSubscribeButton
							sectionId={section.id}
							creatorId={section.creator.id}
							initialIsSubscribed={section.is_subscribed}
							className='h-8 shrink-0 px-3 text-xs'
						/>
					</div>

					<Link
						href={`/user/${section.creator.id}`}
						className='flex items-center gap-2 rounded-xl transition-colors hover:text-foreground'>
						<Avatar
							className='size-7 shrink-0'
							title={section.creator.nickname ?? ''}>
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
					</Link>
				</div>
			</div>
		</div>
	);
};

export default PublicSectionCard;
