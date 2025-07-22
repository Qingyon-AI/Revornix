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
			className='relative bg-white dark:bg-black rounded ring-1 ring-inset dark:ring-white/10 ring-black/10 flex justify-between items-center gap-3 p-5'>
			<div className='flex flex-col gap-2'>
				<div className='text-sm font-bold line-clamp-1'>
					{document.title
						? document.title
						: t('section_document_card_no_title')}
				</div>
				<div className='text-xs text-muted-foreground line-clamp-2'>
					{document.description
						? document.description
						: t('section_document_card_no_description')}
				</div>
				<div className='flex flex-row items-center gap-2 overflow-auto'>
					<div className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
						{t('document_category') + ': '}
						{document.category === 1
							? t('document_category_link')
							: document.category === 0
							? t('document_category_file')
							: document.category === 2
							? t('document_category_quick_note')
							: t('document_category_others')}
					</div>
					<div className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
						{t('section_document_card_section_supplement') + ': '}
						{document.status === 0
							? t('section_document_card_section_supplement_todo')
							: document.status === 1
							? t('section_document_card_section_supplement_doing')
							: document.status === 2
							? t('section_document_card_section_supplement_done')
							: document.status === 3
							? t('section_document_card_section_supplement_failed')
							: t('section_document_card_section_supplement_unknown')}
					</div>
				</div>

				{document.labels && document.labels.length > 0 && (
					<div className='flex flex-row gap-3 items-center'>
						{document.labels?.map((label, index) => {
							return (
								<div
									key={index}
									className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
									{label.name}
								</div>
							);
						})}
					</div>
				)}
				<div className='text-xs text-muted-foreground'>
					{document.create_time &&
						format(new Date(document.create_time), 'yyyy-MM-dd HH:mm:ss')}
				</div>
			</div>
			{document.cover && (
				<img
					src={document.cover}
					alt='cover'
					className='relative h-12 aspect-square rounded overflow-hidden shrink-0 object-cover'
				/>
			)}
		</div>
	);
};

export default SectionDocumentCard;
