import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { getSectionDetail } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import { formatDistance } from 'date-fns';
import { Card } from '../ui/card';
import { useUserContext } from '@/provider/user-provider';
import SectionConfiguration from './section-configuration';
import SectionDocument from './section-document';
import { useRouter } from 'nextjs-toploader/app';
import SectionComments from './section-comments';
import SectionSubscribe from './section-subscribe';
import SectionDelete from './section-delete';
import { Badge } from '../ui/badge';
import { useLocale, useTranslations } from 'next-intl';
import CustomImage from '../ui/custom-image';

const SectionInfo = ({ id }: { id: number }) => {
	const locale = useLocale();
	const t = useTranslations();
	const router = useRouter();

	const { userInfo } = useUserContext();
	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	return (
		<Card className='h-full overflow-auto flex py-0 col-span-4 gap-0 relative'>
			<div className='flex flex-row gap-2 items-center absolute top-0 right-0 p-5 bg-linear-to-b from-white dark:from-black w-full justify-end'>
				{section && userInfo?.id === section?.creator.id && (
					<>
						<SectionConfiguration section_id={id} />
						<SectionDelete section_id={id} />
					</>
				)}
				{section && userInfo?.id !== section?.creator.id && (
					<SectionSubscribe section_id={id} />
				)}
			</div>
			<div className='h-full overflow-auto pb-5'>
				<div className='mb-5'>
					<CustomImage
						src={section?.cover?.name}
						alt='cover'
						className='w-full h-64 object-cover'
					/>
				</div>
				{section?.update_time && (
					<div className='px-5 mb-3'>
						<p className='text-xs text-muted-foreground'>
							{t('section_updated_at')}
							{formatDistance(new Date(section.update_time), new Date(), {
								addSuffix: true,
								locale: locale === 'zh' ? zhCN : enUS,
							})}
						</p>
					</div>
				)}
				<div className='flex flex-row justify-between items-center px-5 mb-3'>
					<div className='font-bold text-lg'>
						{section?.title ? section?.title : t('section_title_empty')}
					</div>
				</div>
				<div className='text-sm text-muted-foreground mb-3 px-5'>
					{section?.description
						? section?.description
						: t('section_description_empty')}
				</div>
				{section?.labels && section.labels.length > 0 && (
					<div className='flex flex-row gap-2 items-center px-5 mb-3 flex-wrap'>
						{section.labels.map((label) => {
							return (
								<Badge key={label.id} variant={'secondary'}>
									{label.name}
								</Badge>
							);
						})}
					</div>
				)}
				<div
					className='flex flex-row items-center gap-1 px-5 mb-3'
					onClick={(e) => {
						router.push(`/user/detail/${section?.creator.id}`);
						e.preventDefault();
						e.stopPropagation();
					}}>
					<CustomImage
						src={section?.creator.avatar?.name}
						alt='avatar'
						className='rounded-full object-cover w-5 h-5'
					/>
					<p className='text-xs text-muted-foreground'>
						{section?.creator.nickname}
					</p>
				</div>
				<div className='px-5 mb-3'>
					<SectionDocument id={id} />
				</div>
				<SectionComments id={id} />
			</div>
		</Card>
	);
};

export default SectionInfo;
