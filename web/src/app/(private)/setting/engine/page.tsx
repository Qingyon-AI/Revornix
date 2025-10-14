'use client';

import MineEngineAddCard from '@/components/setting/mine-engine-add-card';
import MineEngineCard from '@/components/setting/mine-engine-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { getMineEngines } from '@/service/engine';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

const EnginePage = () => {
	const t = useTranslations();
	const {
		data: mineEngines,
		isFetching,
		isRefetching,
		isSuccess,
		isError,
	} = useQuery({
		queryKey: ['mine-engine'],
		queryFn: async () => {
			return await getMineEngines({ keyword: '' });
		},
	});

	return (
		<div className='px-5 pb-5'>
			<Alert className='mb-5'>
				<Info />
				<AlertTitle>{t('tip')}</AlertTitle>
				<AlertDescription>{t('setting_engine_page_tip')}</AlertDescription>
			</Alert>
			{isFetching && !mineEngines && <Skeleton className='w-full h-52' />}
			{isError && (
				<div className='w-full h-full flex justify-center items-center'>
					<p className='text-muted-foreground text-xs'>something wrong</p>
				</div>
			)}
			{isSuccess && (
				<div className='grid grid-cols-1 md:grid-cols-4 gap-5'>
					{mineEngines?.data?.map((engine, index) => {
						return <MineEngineCard key={index} user_engine={engine} />;
					})}
					<MineEngineAddCard />
				</div>
			)}
		</div>
	);
};

export default EnginePage;
