import { DocumentInfo } from '@/generated';
import { format } from 'date-fns';
import { File, NotebookPen, Paperclip } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import {
	DocumentCategory,
	DocumentMdConvertStatus,
	DocumentEmbeddingConvertStatus,
} from '@/enums/document';

const DocumentCard = ({ document }: { document: DocumentInfo }) => {
	const t = useTranslations();
	const router = useRouter();
	return (
		<Link
			href={`/document/detail/${document.id}`}
			className='flex flex-col rounded overflow-hidden dark:bg-white/5 bg-black/5 group h-full'>
			{document?.cover ? (
				<img
					src={document.cover}
					alt='cover'
					className='w-full h-36 object-cover mb-2 group-hover:scale-105 transition-transform duration-300 ease-in-out'
				/>
			) : (
				<div className='flex justify-center items-center w-full h-36 object-cover mb-2 bg-muted'>
					<div className='p-5 rounded ring-1 ring-inset dark:ring-white/10  ring-black/10 dark:bg-white/5 bg-black/5'>
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
			<div className='flex flex-col pb-2 flex-1'>
				<h1 className='font-bold text-md mb-2 px-2 line-clamp-2'>
					{document.title ? document.title : t('document_no_title')}
				</h1>
				<p className='line-clamp-3 text-muted-foreground text-sm/6 px-2 mb-2 flex-1'>
					{document.description
						? document.description
						: t('document_no_description')}
				</p>
				{document?.labels && document.labels.length > 0 && (
					<div className='flex flex-row gap-2 px-2 mb-2'>
						{document.labels.map((label, index) => {
							return (
								<div
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										router.push(`/document/mine?label_id=${label.id}`);
									}}
									key={index}
									className='text-muted-foreground text-xs w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
									{`# ${label.name}`}
								</div>
							);
						})}
					</div>
				)}
				<div className='text-muted-foreground px-2 flex flex-row gap-1 items-center text-xs mt-auto mb-2'>
					<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
						{t('document_from_plat') + ': '}
						{document.from_plat}
					</div>
					<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
						{t('document_category') + ': '}
						{document.category === DocumentCategory.WEBSITE
							? t('document_category_link')
							: document.category === DocumentCategory.FILE
							? t('document_category_file')
							: document.category === DocumentCategory.QUICK_NOTE
							? t('document_category_quick_note')
							: t('document_category_others')}
					</div>
				</div>
				{document.embedding_task && (
					<div className='text-muted-foreground px-2 flex flex-row gap-1 items-center text-xs mt-auto mb-2'>
						<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
							{t('document_embedding_status') + ': '}
							{document.embedding_task?.status ===
							DocumentEmbeddingConvertStatus.WAIT_TO
								? t('document_embedding_status_todo')
								: document.embedding_task?.status ===
								  DocumentEmbeddingConvertStatus.Embedding
								? t('document_embedding_status_doing')
								: document.embedding_task?.status ===
								  DocumentEmbeddingConvertStatus.SUCCESS
								? t('document_embedding_status_success')
								: t('document_embedding_status_failed')}
						</div>
					</div>
				)}
				{document.convert_task && (
					<div className='text-muted-foreground px-2 flex flex-row gap-1 items-center text-xs mt-auto mb-2'>
						<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
							{t('document_md_status') + ': '}
							{document.convert_task?.status === DocumentMdConvertStatus.WAIT_TO
								? t('document_md_status_todo')
								: document.convert_task?.status ===
								  DocumentMdConvertStatus.CONVERTING
								? t('document_md_status_doing')
								: document.convert_task?.status ===
								  DocumentMdConvertStatus.SUCCESS
								? t('document_md_status_success')
								: t('document_md_status_failed')}
						</div>
					</div>
				)}
				<div className='text-muted-foreground px-2 flex flex-row gap-1 items-center text-xs mt-auto'>
					<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
						{t('document_last_update') + ': '}
						{document.update_time &&
							format(new Date(document.update_time), 'MM-dd HH:mm')}
					</div>
				</div>
			</div>
		</Link>
	);
};

export default DocumentCard;
