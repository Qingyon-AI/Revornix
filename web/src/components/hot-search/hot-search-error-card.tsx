import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Expand } from 'lucide-react';

const HotSearchErrorCard = () => {
	const t = useTranslations();
	return (
		<Card className={cn('shrink-0', 'flex', 'flex-col')}>
			<CardHeader className='w-full flex flex-row items-center justify-between'>
				<CardTitle>{t('hot_search_error_title')}</CardTitle>
				<Button size={'icon'} variant={'outline'} disabled>
					<Expand size={4} className='text-muted-foreground' />
				</Button>
			</CardHeader>
			<CardContent className='flex-1 flex flex-col justify-center items-center gap-2 text-muted-foreground text-xs'>
				<div>Oops</div>
				<div>{t('hot_search_error_description')}</div>
			</CardContent>
		</Card>
	);
};

export default memo(HotSearchErrorCard);
