import { RssDocumentInfo } from '@/generated';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';

const RssDocumentCard = ({ document }: { document: RssDocumentInfo }) => {
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
						: t('rss_document_card_no_title')}
				</div>
				<div className='text-xs text-muted-foreground line-clamp-2 break-all'>
					{document.description
						? document.description
						: t('rss_document_card_no_description')}
				</div>
				<div className='text-xs text-muted-foreground'>
					{document.create_time &&
						format(new Date(document.create_time), 'yyyy-MM-dd HH:mm:ss')}
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
	);
};

export default RssDocumentCard;
