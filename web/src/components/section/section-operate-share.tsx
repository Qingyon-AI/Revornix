import { Button } from '../ui/button';
import { useQuery } from '@tanstack/react-query';
import { getSectionDetail, getSectionPublish } from '@/service/section';
import { Badge } from '../ui/badge';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useTranslations } from 'next-intl';
import { InfoIcon, ShareIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import SectionPublish from './section-publish';
import SectionShare from './section-share';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';

const SectionOperateShare = ({
	section_id,
	className,
	onTriggerClick,
	showPublishBadge = true,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
	showPublishBadge?: boolean;
}) => {
	const t = useTranslations();

	const { data: sectionPublish } = useQuery({
		queryKey: ['getSectionPublish', section_id],
		queryFn: async () => {
			return getSectionPublish({ section_id: section_id });
		},
	});

	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<Button
						className={cn('flex-1 w-full text-xs', className)}
						variant={'ghost'}
						onClick={onTriggerClick}>
						<ShareIcon />
						{t('section_share')}
						{showPublishBadge && sectionPublish && sectionPublish.status && (
							<Badge className='bg-amber-600/10 dark:bg-amber-600/20 hover:bg-amber-600/10 text-amber-500 shadow-none rounded-full'>
								<span className='relative flex size-2'>
									<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75'></span>
									<span className='relative inline-flex size-2 rounded-full bg-amber-500'></span>
								</span>
								{t('section_publish_status_on')}
							</Badge>
						)}
					</Button>
				</DialogTrigger>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-3xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>{t('section_share')}</DialogTitle>
					</DialogHeader>
					<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
						<Tabs defaultValue='share' className='flex min-h-0 flex-1 flex-col'>
						<TabsList className='w-full'>
							<TabsTrigger value='share'>{t('section_share')}</TabsTrigger>
							<TabsTrigger value='publish'>{t('section_publish')}</TabsTrigger>
						</TabsList>
						<TabsContent value='share'>
							<Alert className='bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-500 border-emerald-500/50 dark:border-emerald-600/50 mb-5'>
								<InfoIcon />
								<AlertDescription>
									{t('section_share_description')}
								</AlertDescription>
							</Alert>
							<SectionShare section_id={section_id} />
						</TabsContent>
						<TabsContent value='publish'>
							<Alert className='bg-emerald-600/10 dark:bg-emerald-600/15 text-emerald-500 border-emerald-500/50 dark:border-emerald-600/50 mb-5'>
								<InfoIcon />
								<AlertDescription>
									{t('section_publish_description')}
								</AlertDescription>
							</Alert>
							<div className='flex flex-col gap-5'>
								<SectionPublish section_id={section_id} />
							</div>
						</TabsContent>
					</Tabs>
					</div>
					<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
						<DialogClose asChild>
							<Button variant='outline'>{t('cancel')}</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SectionOperateShare;
