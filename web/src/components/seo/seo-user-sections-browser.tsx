'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { BookMarked, BookTextIcon, Search, Users } from 'lucide-react';

import PublicSectionCard from '@/components/seo/public-section-card';
import SeoSectionSubscribeButton from '@/components/seo/seo-section-subscribe-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import CardViewToggle from '@/components/ui/card-view-toggle';
import { Input } from '@/components/ui/input';
import { useCardViewMode } from '@/hooks/use-card-view-mode';
import { getSectionCoverSrc } from '@/lib/section-cover';
import { getPublicSectionHref, type PublicSectionInfo } from '@/lib/seo';
import { replacePath } from '@/lib/utils';

const SeoUserSectionListRow = ({
	section,
}: {
	section: PublicSectionInfo;
}) => {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const href = getPublicSectionHref(section);
	const coverSrc = getSectionCoverSrc(section);
	const creatorAvatar = replacePath(section.creator.avatar, section.creator.id);

	return (
		<div className='rounded-[24px] border border-border/60 bg-background/28 px-4 py-4'>
			<div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
				<div className='min-w-0 flex-1'>
					<div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
						<Link
							href={href}
							className='block h-28 w-full shrink-0 overflow-hidden rounded-[20px] border border-border/50 bg-background/45 sm:w-44'>
							{coverSrc ? (
								<img
									src={coverSrc}
									alt={section.title}
									className='h-full w-full object-cover'
								/>
							) : (
								<div className='flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(70,33,42,0.82),rgba(30,41,59,0.78))] text-white/70'>
									<BookTextIcon className='size-7' />
								</div>
							)}
						</Link>

						<div className='min-w-0 flex-1 space-y-3'>
							<div className='space-y-2'>
								<div className='flex flex-wrap items-center gap-2'>
									{section.is_day_section ? (
										<div className='inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300'>
											{t('section_day_badge')}
										</div>
									) : null}
								</div>
								<Link href={href} className='block'>
									<h3 className='line-clamp-2 text-lg font-semibold leading-7'>
										{section.title || t('section_title_empty')}
									</h3>
								</Link>
								<p className='line-clamp-2 text-sm leading-7 text-muted-foreground'>
									{section.description || t('section_description_empty')}
								</p>
							</div>

							<div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
								<button
									type='button'
									className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/45 px-2.5 py-1.5 text-left transition-colors hover:bg-background/70'
									onClick={() => {
										router.push(`/user/${section.creator.id}`);
									}}>
									<Avatar className='size-5'>
										<AvatarImage
											src={creatorAvatar}
											alt={section.creator.nickname}
											className='object-cover'
										/>
										<AvatarFallback className='text-[10px] font-semibold'>
											{section.creator.nickname.slice(0, 1) ?? '?'}
										</AvatarFallback>
									</Avatar>
									<span>{section.creator.nickname}</span>
								</button>
								<div className='rounded-full border border-border/50 bg-background/45 px-3 py-1.5'>
									{formatDistance(
										new Date(section.update_time ?? section.create_time),
										new Date(),
										{
											addSuffix: true,
											locale: locale === 'zh' ? zhCN : enUS,
										},
									)}
								</div>
								<div className='inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/45 px-3 py-1.5'>
									<BookMarked className='size-3.5' />
									<span>
										{t('section_card_documents_count', {
											section_documents_count: section.documents_count ?? 0,
										})}
									</span>
								</div>
								<div className='inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/45 px-3 py-1.5'>
									<Users className='size-3.5' />
									<span>
										{t('section_card_subscribers_count', {
											section_subscribers_count:
												section.subscribers_count ?? 0,
										})}
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className='flex shrink-0 items-center justify-end'>
					<SeoSectionSubscribeButton
						sectionId={section.id}
						creatorId={section.creator.id}
						initialIsSubscribed={section.is_subscribed}
						className='h-9 px-4 text-xs'
					/>
				</div>
			</div>
		</div>
	);
};

const SeoUserSectionsBrowser = ({
	userId,
	sections,
	keyword,
	hasMore,
	nextStart,
}: {
	userId: number;
	sections: PublicSectionInfo[];
	keyword: string;
	hasMore?: boolean;
	nextStart?: number | null;
}) => {
	const t = useTranslations();
	const { viewMode, setViewMode } = useCardViewMode(
		'seo-user-sections-view-mode',
	);

	const nextHref = new URLSearchParams();
	if (keyword) {
		nextHref.set('q', keyword);
	}
	if (hasMore && nextStart !== undefined && nextStart !== null) {
		nextHref.set('start', String(nextStart));
	}

	return (
		<div className='mx-auto w-full max-w-[1160px] rounded-[28px] border border-border/60 bg-background/24'>
			<div className='border-b border-border/60 px-5 py-5'>
				<div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.92fr)] xl:items-center'>
					<div className='min-w-0 space-y-2'>
						<h2 className='text-xl font-semibold tracking-tight sm:text-2xl'>
							{t('user_detail_sections_title')}
						</h2>
						<p className='max-w-[40rem] text-sm leading-6 text-muted-foreground'>
							{t('user_detail_sections_description')}
						</p>
					</div>
					<div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center xl:justify-self-end'>
						<form action={`/user/${userId}`} className='w-full min-w-0 flex-1 xl:min-w-[360px]'>
							<div className='relative'>
								<Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
								<Input
									name='q'
									defaultValue={keyword}
									placeholder={t('user_detail_sections_search_placeholder')}
									className='h-11 rounded-2xl border-border/60 bg-background/45 pl-9'
								/>
							</div>
						</form>
						<CardViewToggle
							value={viewMode}
							onChange={setViewMode}
							className='h-11 self-end rounded-2xl border-border/60 bg-background/45 [&_button]:h-full [&_button]:w-11'
						/>
					</div>
				</div>
			</div>
			<div className='px-5 py-5'>
				{sections.length === 0 ? (
					<div className='flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-border/70 bg-background/50 px-6 text-center'>
						<div className='max-w-md'>
							<h3 className='text-lg font-semibold tracking-tight'>
								{keyword
									? t('user_detail_sections_search_empty')
									: t('user_sections_empty')}
							</h3>
							<p className='mt-2 text-sm leading-7 text-muted-foreground'>
								{keyword ? `"${keyword}"` : t('user_detail_sections_description')}
							</p>
						</div>
					</div>
				) : viewMode === 'grid' ? (
					<div className='grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3'>
						{sections.map((section) => (
							<div className='h-full' key={section.id}>
								<PublicSectionCard section={section} />
							</div>
						))}
					</div>
				) : (
					<div className='space-y-4'>
						{sections.map((section) => (
							<SeoUserSectionListRow key={section.id} section={section} />
						))}
					</div>
				)}
				{hasMore && nextStart !== undefined && nextStart !== null ? (
					<div className='mt-5 flex justify-end'>
						<Link href={`/user/${userId}?${nextHref.toString()}`}>
							<Button variant='outline' className='rounded-2xl'>
								{t('seo_community_next')}
							</Button>
						</Link>
					</div>
				) : null}
			</div>
		</div>
	);
};

export default SeoUserSectionsBrowser;
