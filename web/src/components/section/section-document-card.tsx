'use client';

import type { ReactNode } from 'react';

import { DocumentCategory, SectionDocumentIntegration } from '@/enums/document';
import { SectionDocumentInfo } from '@/generated';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { formatInUserTimeZone } from '@/lib/time';
import DocumentVisibilityHint from '../document/document-visibility-hint';
import ImageWithFallback from '../ui/image-with-fallback';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SectionDocumentCard = ({
	document,
	publicMode = false,
	action,
}: {
	document: SectionDocumentInfo;
	publicMode?: boolean;
	action?: ReactNode;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const detailHref = publicMode
		? `/document/${document.id}`
		: `/document/detail/${document.id}`;

	const categoryLabel =
		document.category === DocumentCategory.WEBSITE
			? t('document_category_link')
			: document.category === DocumentCategory.FILE
				? t('document_category_file')
				: document.category === DocumentCategory.QUICK_NOTE
					? t('document_category_quick_note')
					: document.category === DocumentCategory.AUDIO
						? t('document_category_audio')
						: t('document_category_others');

	const statusLabel =
		document.status === SectionDocumentIntegration.WAIT_TO
			? t('section_document_card_section_supplement_todo')
			: document.status === SectionDocumentIntegration.SUPPLEMENTING
				? t('section_document_card_section_supplement_doing')
				: document.status === SectionDocumentIntegration.SUCCESS
					? t('section_document_card_section_supplement_done')
					: document.status === SectionDocumentIntegration.FAILED
						? t('section_document_card_section_supplement_failed')
						: t('section_document_card_section_supplement_unknown');
	return (
		<div
			onClick={() => router.push(detailHref)}
			className='group relative cursor-pointer'>
			<div className='flex min-w-0'>
				<div className='min-w-0 flex-1'>
					<div className='flex items-start justify-between gap-3'>
						<div className='min-w-0 space-y-2'>
							<div className='line-clamp-2 break-words text-[1.05rem] font-semibold leading-7'>
								{document.title
									? document.title
									: t('section_document_card_no_title')}
							</div>
							<div className='line-clamp-2 break-words pl-0 text-sm leading-6 text-muted-foreground'>
								{document.description
									? document.description
									: t('section_document_card_no_description')}
							</div>
							{document.create_time ? (
								<div className='text-xs text-muted-foreground'>
									{formatInUserTimeZone(
										document.create_time,
										'yyyy-MM-dd HH:mm',
									)}
								</div>
							) : null}
							<div className='flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground'>
								{!publicMode ? (
									<DocumentVisibilityHint documentId={document.id} />
								) : null}
								<div className='w-fit rounded-full border border-sky-500/25 bg-sky-500/10 px-2.5 py-1 text-sky-700'>
									{categoryLabel}
								</div>
								<div
									className={cn(
										'w-fit rounded-full border px-2.5 py-1',
										document.status === SectionDocumentIntegration.SUCCESS &&
											'border-emerald-500/25 bg-emerald-500/10 text-emerald-700',
										document.status ===
											SectionDocumentIntegration.SUPPLEMENTING &&
											'border-amber-500/25 bg-amber-500/10 text-amber-700',
										document.status === SectionDocumentIntegration.WAIT_TO &&
											'border-zinc-500/25 bg-zinc-500/10 text-zinc-700',
										document.status === SectionDocumentIntegration.FAILED &&
											'border-rose-500/25 bg-rose-500/10 text-rose-700',
										![
											SectionDocumentIntegration.SUCCESS,
											SectionDocumentIntegration.SUPPLEMENTING,
											SectionDocumentIntegration.WAIT_TO,
											SectionDocumentIntegration.FAILED,
										].includes(document.status as SectionDocumentIntegration) &&
											'border-border/40 bg-muted/50 text-muted-foreground',
									)}>
									{statusLabel}
								</div>
								{document.labels && document.labels.length > 0
									? document.labels.map((label, index) => (
											<div
												key={index}
												className='max-w-full rounded-full border border-border/40 bg-background/45 px-2.5 py-1 text-muted-foreground'>
												{'# ' + label.name}
											</div>
										))
									: null}
							</div>
						</div>
						<ArrowUpRight className='mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground' />
					</div>
				</div>
				{document.cover ? (
					<ImageWithFallback
						src={document.cover}
						alt='cover'
						className='relative h-16 w-16 shrink-0 rounded-2xl object-cover'
						fallbackSvgClassName='p-2'
					/>
				) : null}
			</div>
			{action ? <div className='mt-3 flex px-1'>{action}</div> : null}
		</div>
	);
};

export default SectionDocumentCard;
