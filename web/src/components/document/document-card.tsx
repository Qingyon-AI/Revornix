import { DocumentInfo } from '@/generated';
import { File, NotebookPen, Paperclip } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import { DocumentCategory } from '@/enums/document';
import { CardViewMode } from '@/lib/card-view-mode';
import { replacePath } from '@/lib/utils';
import { formatInUserTimeZone } from '@/lib/time';

const DocumentCard = ({
	document,
	layout = 'grid',
}: {
	document: DocumentInfo;
	layout?: CardViewMode;
}) => {
	const t = useTranslations();
	const router = useRouter();
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

	const cover = document?.cover ? (
		<img
			src={replacePath(document.cover, document.creator_id)}
			alt='cover'
			className='h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105'
		/>
	) : (
		<div className='flex h-full w-full items-center justify-center bg-card/60'>
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
	);

	if (layout === 'list') {
		return (
			<Link
				href={`/document/detail/${document.id}`}
				className='group flex overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm transition-colors hover:border-border hover:bg-card/90'>
				<div className='flex w-full flex-col gap-3 p-3 sm:grid sm:grid-cols-[88px,minmax(0,1.8fr),minmax(180px,0.9fr),auto] sm:items-center sm:gap-4 sm:p-4'>
					<div className='relative hidden h-16 overflow-hidden rounded-xl border border-border/60 bg-card/60 sm:block'>
						{cover}
					</div>
					<div className='min-w-0'>
						<div className='flex items-center gap-2'>
							<h1 className='line-clamp-1 text-sm font-semibold leading-6 sm:text-[15px]'>
								{document.title ? document.title : t('document_no_title')}
							</h1>
							<div className='rounded-md border border-border/50 bg-card/75 px-2 py-0.5 text-[11px] text-muted-foreground sm:hidden'>
								{categoryLabel}
							</div>
						</div>
						<p className='mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground sm:text-sm'>
							{document.description
								? document.description
								: t('document_no_description')}
						</p>
					</div>
					<div className='flex flex-wrap gap-1.5 text-[11px] text-muted-foreground sm:grid sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1 sm:text-xs'>
						<div className='rounded-md border border-border/50 bg-card/75 px-2 py-0.5 sm:border-none sm:bg-transparent sm:px-0 sm:py-0'>
							{t('document_from_plat') + ': '}
							{document.from_plat}
						</div>
						<div className='rounded-md border border-border/50 bg-card/75 px-2 py-0.5 sm:border-none sm:bg-transparent sm:px-0 sm:py-0'>
							{t('document_last_update') + ': '}
							{document.create_time &&
								formatInUserTimeZone(document.create_time, 'MM-dd HH:mm')}
						</div>
						{document?.labels && document.labels.length > 0 ? (
							<div className='sm:col-span-2 flex flex-wrap gap-1.5'>
								{document.labels.slice(0, 3).map((label, index) => {
									return (
										<div
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												router.push(`/document/mine?label_id=${label.id}`);
											}}
											key={index}
											className='w-fit rounded-md border border-border/50 bg-card/75 px-2 py-0.5 text-[11px] text-muted-foreground'>
											{`# ${label.name}`}
										</div>
									);
								})}
							</div>
						) : null}
					</div>
					<div className='hidden justify-end sm:flex'>
						<div className='rounded-lg border border-border/50 bg-card/75 px-2.5 py-1 text-[11px] text-muted-foreground'>
							{categoryLabel}
						</div>
					</div>
				</div>
			</Link>
		);
	}

	return (
		<Link
			href={`/document/detail/${document.id}`}
			className='group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md'>
			<div className='h-40 w-full'>{cover}</div>
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
						{categoryLabel}
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
