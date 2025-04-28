import { SectionInfo } from '@/generated';
import { formatDistance } from 'date-fns';
import { BookTextIcon } from 'lucide-react';
import Link from 'next/link';
import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { useRouter } from 'nextjs-toploader/app';
import { Badge } from '../ui/badge';
import { useLocale, useTranslations } from 'next-intl';

const SectionCard = ({ section }: { section: SectionInfo }) => {
	const locale = useLocale();
	const t = useTranslations();
	const router = useRouter();
	return (
		<Link
			href={`/section/detail/${section.id}`}
			className='flex flex-col rounded overflow-hidden dark:bg-white/5 bg-black/5 group h-full'>
			<div className='relative w-full h-48 overflow-hidden'>
				{section?.cover ? (
					<img
						src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${section.cover.name}`}
						alt='cover'
						className='w-full h-full object-cover mb-2 group-hover:scale-105 transition-transform duration-300 ease-in-out'
					/>
				) : (
					<div className='flex justify-center items-center w-full h-full object-cover mb-2 bg-muted'>
						<div className='p-5 rounded ring-1 ring-inset dark:ring-white/10  ring-black/10 dark:bg-white/5 bg-black/5'>
							<BookTextIcon size={24} className='text-muted-foreground' />
						</div>
					</div>
				)}
			</div>
			<div className='flex flex-col flex-1 gap-2 p-2'>
				<h1 className='font-bold text-md'>
					{section.title ? section.title : t('section_title_empty')}
				</h1>
				<p className='line-clamp-3 text-muted-foreground text-sm'>
					{section.description
						? section.description
						: t('section_description_empty')}
				</p>
			</div>
			{section.labels && section.labels.length > 0 && (
				<div className='flex flex-row gap-2 items-center px-2 mb-2 flex-wrap'>
					{section.labels.map((label) => {
						return (
							<Badge key={label.id} variant={'outline'}>
								{label.name}
							</Badge>
						);
					})}
				</div>
			)}
			<div className='flex flex-row gap-2 items-center text-xs text-muted-foreground justify-between p-2'>
				<div className='flex flex-row items-center gap-1'>
					<img
						onClick={(e) => {
							router.push(`/user/detail/${section.creator.id}`);
							e.preventDefault();
							e.stopPropagation();
						}}
						src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${section.creator.avatar?.name}`}
						alt='avatar'
						className='rounded-full object-cover w-5 h-5'
					/>
					{formatDistance(new Date(section.update_time), new Date(), {
						addSuffix: true,
						locale: locale === 'zh' ? zhCN : enUS,
					})}
				</div>
				<div className='flex flex-row gap-1'>
					<p>
						{t('section_card_documents_count', {
							section_documents_count: section.documents_count,
						})}
					</p>
					<p>,</p>
					<p>
						{t('section_card_subscribers_count', {
							section_subscribers_count: section.subscribers_count,
						})}
					</p>
				</div>
			</div>
		</Link>
	);
};

export default SectionCard;
