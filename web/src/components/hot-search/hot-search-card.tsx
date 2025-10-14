import { Expand } from 'lucide-react';
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
				<DialogContent className='max-h-[80%] flex flex-col'>
					<DialogHeader>
						<DialogTitle>{website.title}</DialogTitle>
					</DialogHeader>
					<div className='flex-1 overflow-auto flex flex-col gap-2'>
						{website.data.map((item, index) => {
							return (
								<div key={index}>
									<Link href={item.url ?? ''} target='_blank'>
										<div className='flex flex-row gap-2 items-center'>
											<div
												className={cn(
													'size-5 rounded flex justify-center items-center',
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
					<DialogFooter>
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
			<Card className={cn('shrink-0')}>
				<CardHeader className='w-full flex flex-row items-center justify-between'>
					<CardTitle>{website.title}</CardTitle>
					<Button size={'icon'} variant={'outline'} onClick={handleShowMore}>
						<Expand size={4} className='text-muted-foreground' />
					</Button>
				</CardHeader>
				<CardContent>
					<div className='h-44 overflow-auto space-y-1 text-sm'>
						{website.data.map((item, index) => {
							return (
								<div key={index}>
									<Link href={item.url ?? ''} target='_blank'>
										<div className='flex flex-row gap-2 items-center'>
											<div
												className={cn(
													'size-5 rounded flex justify-center items-center',
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
