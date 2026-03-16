'use client';

import type { ReactNode } from 'react';

import { DocumentCategory, SectionDocumentIntegration } from '@/enums/document';
import { SectionDocumentInfo } from '@/generated';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { formatInUserTimeZone } from '@/lib/time';

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
	return (
		<div
			onClick={() => router.push(detailHref)}
			className='group relative space-y-3 overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition-shadow hover:shadow-md'>
			<div className='flex min-w-0 flex-row gap-3'>
				<div className='min-w-0 flex-1'>
					<div className='line-clamp-2 break-words text-sm font-semibold leading-6'>
						{document.title
							? document.title
							: t('section_document_card_no_title')}
					</div>
					<div className='line-clamp-2 break-words text-xs leading-5 text-muted-foreground'>
						{document.description
							? document.description
							: t('section_document_card_no_description')}
					</div>
				</div>
				{document.cover && (
					<img
						src={document.cover}
						alt='cover'
						className='relative h-14 w-14 shrink-0 rounded-xl object-cover'
					/>
				)}
			</div>

			{document.labels && document.labels.length > 0 && (
				<div className='flex flex-wrap gap-2'>
					{document.labels?.map((label, index) => {
						return (
							<div
								key={index}
								className='max-w-full rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground'>
								{'# ' + label.name}
							</div>
						);
					})}
				</div>
			)}

			<div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
				<div className='flex min-w-0 flex-wrap items-center gap-2'>
					<div className='w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground'>
						{document.category === DocumentCategory.WEBSITE
							? t('document_category_link')
							: document.category === DocumentCategory.FILE
								? t('document_category_file')
								: document.category === DocumentCategory.QUICK_NOTE
									? t('document_category_quick_note')
									: document.category === DocumentCategory.AUDIO
										? t('document_category_audio')
									: t('document_category_others')}
					</div>
					<div className='w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground'>
						{document.status === SectionDocumentIntegration.WAIT_TO
							? t('section_document_card_section_supplement_todo')
							: document.status === SectionDocumentIntegration.SUPPLEMENTING
								? t('section_document_card_section_supplement_doing')
								: document.status === SectionDocumentIntegration.SUCCESS
									? t('section_document_card_section_supplement_done')
									: document.status === SectionDocumentIntegration.FAILED
										? t('section_document_card_section_supplement_failed')
							: t('section_document_card_section_supplement_unknown')}
					</div>
					{action}
				</div>
				<div className='text-[11px] text-muted-foreground sm:shrink-0 sm:self-end'>
					{document.create_time &&
						formatInUserTimeZone(document.create_time, 'yyyy-MM-dd HH:mm')}
				</div>
			</div>
		</div>
	);
};

export default SectionDocumentCard;
