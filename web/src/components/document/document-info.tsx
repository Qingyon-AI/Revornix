'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import { useRouter } from 'nextjs-toploader/app';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Separator } from '../ui/separator';
import CustomImage from '../ui/custom-image';
import {
	DocumentCategory,
	DocumentEmbeddingConvertStatus,
	DocumentMdConvertStatus,
	DocumentPodcastStatus,
} from '@/enums/document';

const DocumentInfo = ({ id }: { id: number }) => {
	const t = useTranslations();
	const router = useRouter();

	const { data, isPending, isError, error, isRefetching } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	return (
		<>
			{isPending && <Skeleton className='w-full h-full' />}
			{data && (
				<div className='relative h-full'>
					<div className='h-full overflow-auto pb-5'>
						<div className='mb-5'>
							<img
								className='w-full h-64 relative object-cover'
								alt='cover'
								src={data.cover ? data.cover : '/images/cover.jpg'}
							/>
						</div>
						<div className='flex flex-row justify-between items-center px-5 mb-3'>
							<div className='font-bold text-lg'>
								{data.title ? data.title : t('document_no_title')}
							</div>
						</div>
						<div className='text-muted-foreground mb-3 px-5 text-sm/6'>
							{data.description
								? data.description
								: t('document_no_description')}
						</div>
						{data.creator && (
							<div
								className='flex flex-row items-center px-5 mb-3'
								onClick={() => router.push(`/user/detail/${data.creator!.id}`)}>
								<CustomImage
									src={data.creator!.avatar!}
									className='w-5 h-5 rounded-full mr-2 object-cover'
								/>
								<p className='text-xs text-muted-foreground'>
									{data.creator!.nickname}
								</p>
							</div>
						)}
						<div className='text-muted-foreground mb-3 px-5 flex flex-row gap-3 items-center text-xs'>
							<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
								{t('document_from_plat') + ': '}
								{data.from_plat}
							</div>
							<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
								{t('document_category') + ': '}
								{data.category === DocumentCategory.WEBSITE
									? t('document_category_link')
									: data.category === DocumentCategory.FILE
									? t('document_category_file')
									: data.category === DocumentCategory.QUICK_NOTE
									? t('document_category_quick_note')
									: t('document_category_others')}
							</div>
						</div>
						<div className='text-muted-foreground mb-3 px-5 flex flex-row gap-3 items-center text-xs'>
							{data.sections?.map((section) => {
								return (
									<Link
										key={section.id}
										className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'
										href={`/section/detail/${section.id}`}>
										{`${t('document_related_sections')}: ${section.title}`}
									</Link>
								);
							})}
						</div>
						{data.labels && data.labels?.length > 0 && (
							<div className='flex flex-row items-center w-full overflow-auto px-5 gap-1 mb-3'>
								{data.labels?.map((label) => {
									return (
										<div
											key={label.id}
											className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5 text-xs text-muted-foreground'>
											{`# ${label.name}`}
										</div>
									);
								})}
							</div>
						)}
						<div className='px-5 mb-3'>
							<Separator />
						</div>
						<div className='flex flex-row flex-wrap gap-3 px-5 mb-3'>
							{data.embedding_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_embedding_status') + ': '}
										{data.embedding_task?.status ===
										DocumentEmbeddingConvertStatus.WAIT_TO
											? t('document_md_status_todo')
											: data.embedding_task?.status ===
											  DocumentEmbeddingConvertStatus.Embedding
											? t('document_md_status_doing')
											: data.embedding_task?.status ===
											  DocumentEmbeddingConvertStatus.SUCCESS
											? t('document_md_status_success')
											: t('document_md_status_failed')}
									</div>
								</div>
							)}
							{data.convert_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_md_status') + ': '}
										{data.convert_task?.status ===
										DocumentMdConvertStatus.WAIT_TO
											? t('document_md_status_todo')
											: data.convert_task?.status ===
											  DocumentMdConvertStatus.CONVERTING
											? t('document_md_status_doing')
											: data.convert_task?.status ===
											  DocumentMdConvertStatus.SUCCESS
											? t('document_md_status_success')
											: t('document_md_status_failed')}
									</div>
								</div>
							)}
							{data.podcast_task && (
								<div className='text-muted-foreground flex flex-row gap-1 items-center text-xs mt-auto'>
									<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
										{t('document_podcast_status') + ': '}
										{data.podcast_task?.status === DocumentPodcastStatus.WAIT_TO
											? t('document_podcast_status_todo')
											: data.convert_task?.status ===
											  DocumentPodcastStatus.GENERATING
											? t('document_podcast_status_doing')
											: data.convert_task?.status ===
											  DocumentPodcastStatus.SUCCESS
											? t('document_podcast_status_success')
											: t('document_podcast_status_failed')}
									</div>
								</div>
							)}
						</div>
						<div className='px-5 mb-3'>
							<Separator />
						</div>
						<div className='text-sm rounded mx-5 mb-3'>
							<h1 className='text-lg font-bold mb-3'>{t('ai_summary')}</h1>
							<p className='text-muted-foreground text-sm/6'>
								{data.ai_summary ? data.ai_summary : t('ai_summary_empty')}
							</p>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default DocumentInfo;
