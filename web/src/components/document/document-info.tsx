'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import { useRouter } from 'nextjs-toploader/app';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { useTranslations } from 'next-intl';
import { Separator } from '../ui/separator';
import CustomImage from '../ui/custom-image';

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
							<div className='w-full h-64 object-cover relative'>
								<CustomImage src={data.cover} />
							</div>
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
									src={data.creator!.avatar?.name}
									className='w-5 h-5 rounded-full mr-2 object-cover'
								/>
								<p className='text-xs text-muted-foreground'>
									{data.creator!.nickname}
								</p>
							</div>
						)}
						<div className='text-muted-foreground mb-3 px-5 flex flex-row gap-1 items-center text-xs'>
							<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
								{t('document_from_plat') + ': '}
								{data.from_plat === 'qingyun-web'
									? t('document_from_plat_website')
									: data.from_plat === 'api'
									? t('document_from_plat_api')
									: t('document_from_plat_others')}
							</div>
							<div className='w-fit px-2 py-1 rounded bg-black/5 dark:bg-white/5'>
								{t('document_category') + ': '}
								{data.category === 1
									? t('document_category_link')
									: data.category === 0
									? t('document_category_file')
									: data.category === 2
									? t('document_category_quick_note')
									: t('document_category_others')}
							</div>
						</div>
						<div className='text-muted-foreground mb-3 px-5 flex flex-row gap-1 items-center text-xs'>
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
							<div className='flex flex-row items-center w-full overflow-auto px-5 gap-5 mb-3'>
								{data.labels?.map((label) => {
									return (
										<Badge variant={'outline'} key={label.id}>
											{`# ${label.name}`}
										</Badge>
									);
								})}
							</div>
						)}
						<div className='px-5 my-5'>
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
