'use client';

import MineEngineCard from '@/components/setting/mine-engine-card';
import ProvideEngineCard from '@/components/setting/provide-engine-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getMineEngines, getProvideEngines } from '@/service/engine';
import { useQuery } from '@tanstack/react-query';
import { Info, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const EnginePage = () => {
	const t = useTranslations();
	const {
		data: mineEngines,
		isFetching: isFetchingMineEngines,
		isRefetching: isRefetchingMineEngines,
	} = useQuery({
		queryKey: ['mine-engine'],
		queryFn: async () => {
			return await getMineEngines({ keyword: '' });
		},
	});
	const {
		data: provideEngines,
		isFetching: isFetchingProvideEngines,
		isRefetching: isRefetchingProvideEngines,
	} = useQuery({
		queryKey: ['provide-engine'],
		queryFn: async () => {
			return await getProvideEngines({ keyword: '' });
		},
	});

	return (
		<div className='px-5 pb-5'>
			<Alert>
				<Info />
				<AlertTitle>{t('tip')}</AlertTitle>
				<AlertDescription>{t('setting_engine_page_tip')}</AlertDescription>
			</Alert>
			<h2 className='text-xs text-muted-foreground p-3 flex flex-row items-center'>
				{t('setting_engine_page_official_engine')}
				{isRefetchingProvideEngines && (
					<Loader2 className='animate-spin size-4 ml-2' />
				)}
			</h2>
			{isFetchingProvideEngines && !provideEngines && (
				<Skeleton className='w-full h-52' />
			)}
			{!isFetchingProvideEngines &&
				provideEngines?.data &&
				provideEngines?.data.length === 0 && (
					<p className='text-xs text-muted-foreground text-center bg-muted p-5 rounded'>
						{t('setting_engine_page_official_engine_empty')}
					</p>
				)}
			{provideEngines?.data && provideEngines.data.length > 0 && (
				<Card>
					<CardContent className='grid grid-cols-1 md:grid-cols-4 gap-5'>
						{provideEngines?.data?.map((engine, index) => {
							return <ProvideEngineCard key={index} engine={engine} />;
						})}
					</CardContent>
				</Card>
			)}
			<h2 className='text-xs text-muted-foreground p-3 flex flex-row items-center'>
				{t('setting_engine_page_mine_engine')}
				{isRefetchingMineEngines && (
					<Loader2 className='animate-spin size-4 ml-2' />
				)}
			</h2>
			{isFetchingMineEngines && !mineEngines && (
				<Skeleton className='w-full h-52' />
			)}
			{!isFetchingMineEngines &&
				mineEngines?.data &&
				mineEngines?.data.length === 0 && (
					<p className='text-xs text-muted-foreground text-center bg-muted p-5 rounded'>
						{t('setting_engine_page_mine_engine_empty')}
					</p>
				)}
			{mineEngines?.data && mineEngines.data.length > 0 && (
				<Card>
					<CardContent className='grid grid-cols-1 md:grid-cols-4 gap-5'>
						{mineEngines?.data?.map((engine, index) => {
							return <MineEngineCard key={index} engine={engine} />;
						})}
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default EnginePage;
