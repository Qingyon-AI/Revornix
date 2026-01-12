'use client';

import {
	DocumentCategory,
	DocumentMdConvertStatus,
	SectionDocumentIntegration,
} from '@/enums/document';
import { SectionDocumentInfo } from '@/generated';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';

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
			className='relative bg-white dark:bg-black rounded ring-1 ring-inset dark:ring-white/10 ring-black/10 p-5'>
			<div className='flex flex-row mb-3'>
				<div className='flex-1'>
					<div className='text-sm font-bold line-clamp-1'>
						{document.title
							? document.title
							: t('section_document_card_no_title')}
					</div>
					<div className='text-xs text-muted-foreground line-clamp-2 break-all'>
						{document.description
							? document.description
							: t('section_document_card_no_description')}
					</div>
				</div>
				{document.cover && (
					<img
						src={document.cover}
						alt='cover'
						className='relative h-16 aspect-square rounded overflow-hidden shrink-0 object-cover'
					/>
				)}
			</div>

			{document.labels && document.labels.length > 0 && (
				<div className='flex flex-row gap-3 items-center mb-3'>
					{document.labels?.map((label, index) => {
						return (
							<div
								key={index}
								className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
								{'# ' + label.name}
							</div>
						);
					})}
				</div>
			)}

			<div className='flex justify-between items-center'>
				<div className='flex flex-row items-center gap-2 overflow-auto'>
					<div className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
						{document.category === DocumentCategory.WEBSITE
							? t('document_category_link')
							: document.category === DocumentCategory.FILE
							? t('document_category_file')
							: document.category === DocumentCategory.QUICK_NOTE
							? t('document_category_quick_note')
							: t('document_category_others')}
					</div>
					<div className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
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
				<div className='text-xs text-muted-foreground'>
					{document.create_time &&
						format(new Date(document.create_time), 'yyyy-MM-dd HH:mm:ss')}
				</div>
			</div>
		</div>
	);
};

export default SectionDocumentCard;
