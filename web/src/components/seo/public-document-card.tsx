'use client';

import { formatDistance } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { FileText } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DocumentCategory } from '@/enums/document';
import { getDocumentCoverSrc } from '@/lib/document-cover';
import type { PublicDocumentPagination } from '@/lib/seo';
import { replacePath } from '@/lib/utils';

const getDocumentCategoryLabel = (
	category: number,
	t: ReturnType<typeof useTranslations>,
) => {
	if (category === DocumentCategory.WEBSITE) return t('document_category_link');
	if (category === DocumentCategory.FILE) return t('document_category_file');
	if (category === DocumentCategory.QUICK_NOTE) return t('document_category_quick_note');
	if (category === DocumentCategory.AUDIO) return t('document_category_audio');
	return t('document_category_others');
};

const PublicDocumentCard = ({
	document,
}: {
	document: PublicDocumentPagination['elements'][number];
}) => {
	const t = useTranslations();
	const locale = useLocale();
	const coverSrc = getDocumentCoverSrc(document);

	return (
		<div className='group flex h-full flex-col overflow-hidden rounded-[24px] border border-border/60 bg-background/28 transition-colors duration-200 hover:border-border/80 hover:bg-background/40'>
			<Link href={`/document/${document.id}`} className='block'>
				<div className='relative h-44 w-full overflow-hidden bg-muted/30'>
					{coverSrc ? (
						<img
							src={coverSrc}
							alt={document.title}
							className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]'
						/>
					) : (
						<div className='flex h-full w-full items-center justify-center'>
							<div className='flex items-center justify-center rounded-[20px] border border-border/60 bg-background/70 p-4 text-muted-foreground'>
								<FileText size={24} />
							</div>
						</div>
					)}
					<div className='absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent' />
				</div>
			</Link>

			<div className='flex flex-1 flex-col gap-4 p-5'>
				<Link href={`/document/${document.id}`} className='block space-y-4'>
					<div className='space-y-2'>
						<div className='flex flex-wrap gap-2'>
							<div className='rounded-full border border-border/60 bg-background/55 px-2.5 py-1 text-[11px] text-muted-foreground'>
								{getDocumentCategoryLabel(document.category, t)}
							</div>
							<div className='rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-700 dark:text-emerald-300'>
								{t('section_publish_status_on')}
							</div>
						</div>
						<h2 className='line-clamp-2 text-lg font-semibold leading-7'>
							{document.title}
						</h2>
						<p className='line-clamp-3 text-sm leading-6 text-muted-foreground'>
							{document.description || t('seo_community_documents_empty_description')}
						</p>
					</div>

					{document.labels && document.labels.length > 0 ? (
						<div className='flex flex-wrap gap-2'>
							{document.labels.slice(0, 4).map((label) => (
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
					{document.creator ? (
						<Link
							href={`/user/${document.creator.id}`}
							className='flex items-center gap-2 transition-colors hover:text-foreground'>
							<Avatar className='size-7'>
								<AvatarImage
									src={replacePath(document.creator.avatar, document.creator.id)}
									alt={document.creator.nickname}
									className='object-cover'
								/>
								<AvatarFallback className='text-[10px] font-semibold'>
									{document.creator.nickname.slice(0, 1)}
								</AvatarFallback>
							</Avatar>
							<div className='min-w-0'>
								<div className='line-clamp-1 text-sm text-foreground'>
									{document.creator.nickname}
								</div>
								<div className='line-clamp-1'>
									{formatDistance(
										new Date(document.update_time ?? document.create_time),
										new Date(),
										{
											addSuffix: true,
											locale: locale === 'zh' ? zhCN : enUS,
										},
									)}
								</div>
							</div>
						</Link>
					) : null}

					<div className='flex flex-wrap gap-2'>
						<div className='rounded-full border border-border/60 bg-background/55 px-3 py-1'>
							ID #{document.id}
						</div>
						{document.convert_task?.md_file_name ? (
							<div className='rounded-full border border-border/60 bg-background/55 px-3 py-1'>
								Markdown
							</div>
						) : null}
						{document.transcribe_task?.transcribed_text ? (
							<div className='rounded-full border border-border/60 bg-background/55 px-3 py-1'>
								Transcript
							</div>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
};

export default PublicDocumentCard;
