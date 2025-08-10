import { SectionInfo } from '@/generated';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';

const RssSectionCard = ({ section }: { section: SectionInfo }) => {
	const t = useTranslations();
	const router = useRouter();
	return (
		<div
			onClick={() => router.push(`/section/detail/${section.id}`)}
			className='relative bg-white dark:bg-black rounded ring-1 ring-inset dark:ring-white/10 ring-black/10 flex justify-between items-center gap-3 p-5'>
			<div className='flex flex-col gap-2'>
				<div className='text-sm font-bold line-clamp-1'>
					{section.title ? section.title : t('rss_section_card_no_title')}
				</div>
				<div className='text-xs text-muted-foreground line-clamp-2 break-all'>
					{section.description
						? section.description
						: t('rss_section_card_no_description')}
				</div>
				<div className='text-xs text-muted-foreground'>
					{section.create_time &&
						format(new Date(section.create_time), 'yyyy-MM-dd HH:mm:ss')}
				</div>
			</div>
		</div>
	);
};

export default RssSectionCard;
