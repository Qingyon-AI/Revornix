'use client';

import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { ArrowUpRight, BookTextIcon, FileText } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DocumentCategory } from '@/enums/document';
import { getDocumentCoverSrc } from '@/lib/document-cover';
import {
	getPublicSectionHref,
	type PublicDocumentPagination,
	type PublicSectionInfo,
} from '@/lib/seo';
import { getSectionCoverSrc } from '@/lib/section-cover';
import { replacePath } from '@/lib/utils';

const getDocumentCategoryLabel = (
	category: number,
	t: ReturnType<typeof useTranslations>,
) => {
	if (category === DocumentCategory.WEBSITE) return t('document_category_link');
	if (category === DocumentCategory.FILE) return t('document_category_file');
	if (category === DocumentCategory.QUICK_NOTE)
		return t('document_category_quick_note');
	if (category === DocumentCategory.AUDIO) return t('document_category_audio');
	return t('document_category_others');
};

const MetaLine = ({
	avatar,
	fallback,
	name,
	time,
	href,
}: {
	avatar?: string | null;
	fallback: string;
	name: string;
	time: string;
	href: string;
}) => (
	<Link
		href={href}
		onClick={(event) => {
			event.stopPropagation();
		}}
		onKeyDown={(event) => {
			event.stopPropagation();
		}}
		className='flex min-w-0 items-center gap-2 rounded-xl transition-colors hover:text-foreground'>
		<Avatar className='size-5 shrink-0'>
			<AvatarImage
				src={avatar ?? undefined}
				alt={name}
				className='object-cover'
			/>
			<AvatarFallback className='text-[10px] font-semibold'>
				{fallback}
			</AvatarFallback>
		</Avatar>
		<div className='line-clamp-1 text-xs text-foreground'>{name}</div>
		<div className='line-clamp-1 text-xs text-muted-foreground'>{time}</div>
	</Link>
);

export const SeoCommunityDocumentListItem = ({
	document,
}: {
	document: PublicDocumentPagination['elements'][number];
}) => {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const coverSrc = getDocumentCoverSrc(document);
	const href = `/document/${document.id}`;
	const updateText = formatDistance(
		new Date(document.update_time ?? document.create_time),
		new Date(),
		{
			addSuffix: true,
			locale: locale === 'zh' ? zhCN : enUS,
		},
	);

	return (
		<div
			role='link'
			tabIndex={0}
			onClick={() => router.push(href)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					router.push(href);
				}
			}}
			className='group block cursor-pointer py-4'>
			<div className='flex items-start gap-4'>
				<div className='min-w-0 flex-1'>
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0 space-y-1.5'>
							<h2 className='line-clamp-2 text-lg font-semibold leading-7'>
								{document.title}
							</h2>
							<p className='line-clamp-2 text-sm leading-6 text-muted-foreground'>
								{document.description ||
									t('seo_community_documents_empty_description')}
							</p>
						</div>
						<ArrowUpRight className='mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground' />
					</div>

					<div className='mt-2.5 flex flex-wrap items-center gap-2 text-[11px]'>
						<div className='rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300'>
							{getDocumentCategoryLabel(document.category, t)}
						</div>
						{document.labels?.map((label) => (
							<div
								key={label.id}
								className='rounded-full border border-border/45 bg-background/70 px-2.5 py-1 text-muted-foreground'>
								# {label.name}
							</div>
						))}
					</div>

					{document.creator ? (
						<div className='mt-3'>
							<MetaLine
								href={`/user/${document.creator.id}`}
								avatar={replacePath(
									document.creator.avatar,
									document.creator.id,
								)}
								fallback={document.creator.nickname.slice(0, 1)}
								name={document.creator.nickname}
								time={updateText}
							/>
						</div>
					) : null}
				</div>

				<div className='hidden shrink-0 md:block'>
					<div className='relative h-20 w-20 overflow-hidden rounded-xl bg-muted/30'>
						{coverSrc ? (
							<img
								src={coverSrc}
								alt={document.title}
								className='h-full w-full object-cover'
							/>
						) : (
							<div className='flex h-full w-full items-center justify-center text-muted-foreground'>
								<FileText className='size-5' />
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export const SeoCommunitySectionListItem = ({
	section,
}: {
	section: PublicSectionInfo;
}) => {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const href = getPublicSectionHref(section);
	const coverSrc = getSectionCoverSrc(section);
	const updateText = formatDistance(
		new Date(section.update_time ?? section.create_time),
		new Date(),
		{
			addSuffix: true,
			locale: locale === 'zh' ? zhCN : enUS,
		},
	);

	return (
		<div
			role='link'
			tabIndex={0}
			onClick={() => router.push(href)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					router.push(href);
				}
			}}
			className='group cursor-pointer transition-colors flex items-start gap-4'>
			<div className='min-w-0 flex-1'>
				<div className='flex items-start justify-between gap-3'>
					<div className='min-w-0 space-y-1.5'>
						<h2 className='line-clamp-2 text-lg font-semibold leading-7'>
							{section.title || t('section_title_empty')}
						</h2>
						<p className='line-clamp-2 text-sm leading-6 text-muted-foreground'>
							{section.description || t('section_description_empty')}
						</p>
					</div>
					<ArrowUpRight className='mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground' />
				</div>

				<div className='mt-2.5 flex flex-wrap items-center gap-2 text-[11px]'>
					{section.is_day_section ? (
						<div className='rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300'>
							{t('section_day_badge')}
						</div>
					) : null}
					{section.labels?.map((label) => (
						<div
							key={label.id}
							className='rounded-full border border-border/45 bg-background/70 px-2.5 py-1 text-muted-foreground'>
							# {label.name}
						</div>
					))}
					<div className='rounded-full border border-border/45 bg-transparent px-2.5 py-1 text-muted-foreground/80'>
						{t('section_card_documents_count', {
							section_documents_count: section.documents_count ?? 0,
						})}
					</div>
					<div className='rounded-full border border-border/45 bg-transparent px-2.5 py-1 text-muted-foreground/80'>
						{t('section_card_subscribers_count', {
							section_subscribers_count: section.subscribers_count ?? 0,
						})}
					</div>
				</div>

				<div className='mt-3'>
					<MetaLine
						href={`/user/${section.creator.id}`}
						avatar={replacePath(section.creator.avatar, section.creator.id)}
						fallback={section.creator.nickname.slice(0, 1) ?? '?'}
						name={section.creator.nickname}
						time={updateText}
					/>
				</div>
			</div>

			<div className='hidden shrink-0 md:block'>
				<div className='relative h-20 w-20 overflow-hidden rounded-xl bg-muted/30'>
					{coverSrc ? (
						<img
							src={coverSrc}
							alt={section.title}
							className='h-full w-full object-cover'
						/>
					) : (
						<div className='flex h-full w-full items-center justify-center text-muted-foreground'>
							<BookTextIcon className='size-5' />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
