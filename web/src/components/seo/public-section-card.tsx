'use client';

import { PublicSectionInfo, getPublicSectionHref } from '@/lib/seo';
import { replacePath } from '@/lib/utils';
import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { BookTextIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import SeoSectionSubscribeButton from './seo-section-subscribe-button';

const PublicSectionCard = ({ section }: { section: PublicSectionInfo }) => {
	const locale = useLocale();
	const t = useTranslations();
	const router = useRouter();
	const sectionHref = getPublicSectionHref(section);

	return (
		<div className='group flex h-full flex-col overflow-hidden rounded-[28px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-40px_rgba(15,23,42,0.62)]'>
			<Link href={sectionHref} className='block'>
				<div className='relative h-44 w-full overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_28%),linear-gradient(135deg,rgba(70,33,42,0.82),rgba(30,41,59,0.78))]'>
					{section.cover ? (
						<img
							src={replacePath(section.cover, section.creator.id)}
							alt={section.title}
							className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105'
						/>
					) : (
						<div className='flex h-full w-full items-center justify-center'>
							<div className='flex items-center justify-center rounded-[22px] border border-white/15 bg-white/10 p-4 text-white/75 backdrop-blur'>
								<BookTextIcon size={26} />
							</div>
						</div>
					)}
					<div className='absolute inset-0 bg-gradient-to-t from-black/48 via-black/10 to-transparent' />
				</div>
			</Link>

			<div className='flex flex-1 flex-col gap-4 p-5'>
				<Link href={sectionHref} className='block space-y-4'>
					<div className='space-y-2'>
						<h2 className='line-clamp-2 text-lg font-semibold leading-7'>
							{section.title ? section.title : t('section_title_empty')}
						</h2>
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
