import { DocumentInfo } from '@/generated';
import { File, NotebookPen, Paperclip } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import {
	DocumentCategory,
	DocumentMdConvertStatus,
	DocumentEmbeddingStatus,
} from '@/enums/document';
import { replacePath } from '@/lib/utils';
import { formatInUserTimeZone } from '@/lib/time';

const DocumentCard = ({ document }: { document: DocumentInfo }) => {
	const t = useTranslations();
	const router = useRouter();
	return (
		<Link
			href={`/document/detail/${document.id}`}
			className='group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md'>
			{document?.cover ? (
				<img
					src={replacePath(document.cover, document.creator_id)}
					alt='cover'
					className='h-40 w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105'
				/>
			) : (
				<div className='flex h-40 w-full items-center justify-center bg-card/60'>
					<div className='flex items-center justify-center rounded-xl border border-border/60 bg-card/75 p-4'>
						{document.category === DocumentCategory.WEBSITE ? (
							<Paperclip size={24} className='text-muted-foreground' />
						) : document.category === DocumentCategory.FILE ? (
							<File size={24} className='text-muted-foreground' />
						) : (
							<NotebookPen size={24} className='text-muted-foreground' />
						)}
					</div>
				</div>
			)}
			<div className='flex flex-1 flex-col gap-3 p-4'>
				<h1 className='line-clamp-2 text-base font-semibold leading-6'>
					{document.title ? document.title : t('document_no_title')}
				</h1>
				<p className='flex-1 line-clamp-3 text-sm/6 text-muted-foreground'>
					{document.description
						? document.description
						: t('document_no_description')}
				</p>
				{document?.labels && document.labels.length > 0 && (
					<div className='flex flex-wrap gap-2'>
						{document.labels.map((label, index) => {
							return (
								<div
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										router.push(`/document/mine?label_id=${label.id}`);
									}}
									key={index}
									className='w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-xs text-muted-foreground'>
									{`# ${label.name}`}
								</div>
							);
						})}
					</div>
				)}
				<div className='mt-auto flex flex-wrap gap-2 text-xs text-muted-foreground'>
					<div className='w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1'>
						{t('document_from_plat') + ': '}
						{document.from_plat}
					</div>
					<div className='w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1'>
						{t('document_category') + ': '}
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
				</div>
				<div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
					<div className='w-fit rounded-lg border border-border/50 bg-card/75 px-2.5 py-1'>
						{t('document_last_update') + ': '}
						{document.create_time &&
							formatInUserTimeZone(document.create_time, 'MM-dd HH:mm')}
					</div>
				</div>
			</div>
		</Link>
	);
};

export default DocumentCard;
