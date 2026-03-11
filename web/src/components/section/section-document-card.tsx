'use client';

import { DocumentCategory, SectionDocumentIntegration } from '@/enums/document';
import { SectionDocumentInfo } from '@/generated';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { formatInUserTimeZone } from '@/lib/time';

const SectionDocumentCard = ({
	document,
}: {
	document: SectionDocumentInfo;
}) => {
	const t = useTranslations();
	const router = useRouter();
	return (
		<div
			onClick={() => router.push(`/document/detail/${document.id}`)}
			className='group relative rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition-shadow hover:shadow-md'>
			<div className='mb-3 flex flex-row gap-3'>
				<div className='flex-1'>
					<div className='line-clamp-1 text-sm font-semibold leading-6'>
						{document.title
							? document.title
							: t('section_document_card_no_title')}
					</div>
					<div className='line-clamp-2 break-all text-xs leading-5 text-muted-foreground'>
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
				<div className='mb-3 flex flex-wrap gap-2'>
					{document.labels?.map((label, index) => {
						return (
							<div
								key={index}
								className='w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground'>
								{'# ' + label.name}
							</div>
						);
					})}
				</div>
			)}

			<div className='flex items-end justify-between gap-3'>
				<div className='flex flex-1 flex-wrap items-center gap-2 overflow-auto'>
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
				</div>
				<div className='shrink-0 text-[11px] text-muted-foreground'>
					{document.create_time &&
						formatInUserTimeZone(document.create_time, 'yyyy-MM-dd HH:mm')}
				</div>
			</div>
		</div>
	);
};

export default SectionDocumentCard;
