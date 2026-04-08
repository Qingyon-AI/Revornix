import { Expand, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { zhCN } from 'date-fns/locale/zh-CN';
import { enUS } from 'date-fns/locale/en-US';
import { Website } from '@/app/(private)/hot-search/page';
import {
	Dialog,
	DialogHeader,
	DialogTitle,
	DialogContent,
	DialogFooter,
} from '../ui/dialog';
import { memo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import CardTitleIcon from '@/components/ui/card-title-icon';

const HotSearchCard = ({ website }: { website: Website }) => {
	const locale = useLocale();
	const t = useTranslations();

	const [showDialog, setShowDialog] = useState(false);

	const handleShowMore = () => {
		setShowDialog(true);
	};

	return (
		<>
			<Dialog open={showDialog} onOpenChange={setShowDialog}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-2xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>{website.title}</DialogTitle>
					</DialogHeader>
					<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
						<div className='flex flex-col gap-2'>
						{website.data.map((item, index) => {
							return (
								<div key={index}>
									<Link href={item.url ?? ''} target='_blank'>
										<div className='flex flex-row gap-2 items-center'>
											<div
												className={cn(
													'size-6 rounded flex justify-center items-center',
													{
														'bg-red-500 text-white': index == 0,
														'bg-orange-500 text-white': index == 1,
														'bg-yellow-500 text-white': index == 2,
													}
												)}>
												{index + 1}
											</div>
											<div className='flex-1 line-clamp-2'>{item.title}</div>
										</div>
									</Link>
								</div>
							);
						})}
						</div>
					</div>
					<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
						<div className='text-xs text-muted-foreground'>
							{t('hot_search_last_update')}
							{formatDistance(new Date(website.updateTime), new Date(), {
								addSuffix: true,
								locale: locale === 'zh' ? zhCN : enUS,
							})}
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Card className={cn('shrink-0', 'h-full', 'flex', 'flex-col')}>
				<CardHeader className='w-full flex flex-row items-center justify-between'>
					<CardTitle className='flex min-w-0 items-center gap-3'>
						<CardTitleIcon icon={Newspaper} tone='sky' />
						<span className='truncate'>{website.title}</span>
					</CardTitle>
					<Button size={'icon'} variant={'outline'} onClick={handleShowMore}>
						<Expand size={4} className='text-muted-foreground' />
					</Button>
				</CardHeader>
				<CardContent className='flex-1'>
					<div className='h-44 overflow-auto space-y-1 text-sm'>
						{website.data.map((item, index) => {
							return (
								<div key={index}>
									<Link href={item.url ?? ''} target='_blank'>
										<div className='flex flex-row gap-2 items-center'>
											<div
												className={cn(
													'size-6 rounded flex justify-center items-center',
													{
														'bg-red-500 text-white': index == 0,
														'bg-orange-500 text-white': index == 1,
														'bg-yellow-500 text-white': index == 2,
													}
												)}>
												{index + 1}
											</div>
											<div className='flex-1 line-clamp-2'>{item.title}</div>
										</div>
									</Link>
								</div>
							);
						})}
					</div>
				</CardContent>
				<CardFooter>
					<div className='text-xs text-muted-foreground'>
						{formatDistance(new Date(website.updateTime), new Date(), {
							addSuffix: true,
							locale: locale === 'zh' ? zhCN : enUS,
						})}
					</div>
				</CardFooter>
			</Card>
		</>
	);
};

export default memo(HotSearchCard);
