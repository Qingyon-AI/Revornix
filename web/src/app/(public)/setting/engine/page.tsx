'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getQueryClient } from '@/lib/get-query-client';
import {
	getMineEngines,
	getProvideEngines,
	installEngine,
} from '@/service/engine';
import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const EnginePage = () => {
	const queryClient = getQueryClient();
	const [installingEngineID, setInstallingEngineID] = useState<number | null>();
	const [unInstallingEngineID, setUnInstallingEngineID] = useState<
		number | null
	>();

	const { data: mineEngines, isFetching: isFetchingMineEngines } = useQuery({
		queryKey: ['mine-engine'],
		queryFn: async () => {
			return await getMineEngines({ keyword: '' });
		},
	});
	const { data: provideEngines, isFetching: isFetchingProvideEngines } =
		useQuery({
			queryKey: ['provide-engine'],
			queryFn: async () => {
				return await getProvideEngines({ keyword: '' });
			},
		});
	const mutateInstallEngine = useMutation({
		mutationFn: installEngine,
		onMutate(variables) {
			if (variables.status) {
				setInstallingEngineID(variables.engine_id);
			} else {
				setUnInstallingEngineID(variables.engine_id);
			}
		},
		onSuccess: () => {
			toast.success('安装成功');
			queryClient.invalidateQueries({
				queryKey: ['mine-engine'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
		onSettled(data, error, variables, context) {
			setInstallingEngineID(null);
			setUnInstallingEngineID(null);
		},
	});
	return (
		<div className='px-5 pb-5'>
			<Alert>
				<AlertDescription>
					引擎只是一个称呼，在本项目中其本质就是解析目标产品并且最终生成markdown的插件。
				</AlertDescription>
			</Alert>
			<h2 className='text-xs text-muted-foreground p-3'>官方引擎集</h2>
			{isFetchingProvideEngines && <Skeleton className='w-full h-52' />}
			{!isFetchingProvideEngines &&
				provideEngines?.data &&
				provideEngines?.data.length === 0 && (
					<p className='text-xs text-muted-foreground text-center bg-muted p-5 rounded'>
						暂无官方引擎
					</p>
				)}
			{provideEngines?.data && provideEngines.data.length > 0 && (
				<Card>
					<CardContent className='grid grid-cols-1 md:grid-cols-4 gap-5'>
						{provideEngines?.data?.map((engine) => {
							return (
								<Card key={engine.id} className='bg-muted/50'>
									<CardHeader>
										<CardTitle>{engine.name}</CardTitle>
										<CardDescription>{engine.description}</CardDescription>
									</CardHeader>
									<CardContent className='flex-1'>
										<p className='bg-muted/80 '>
											{engine.config_json && engine.config_json}
										</p>
									</CardContent>
									<CardFooter className='flex flex-col w-full gap-2'>
										<div className='w-full flex justify-between items-center'>
											<div>
												<p className='text-muted-foreground text-xs w-full mb-1'>
													{format(engine.create_time, 'MM-dd HH:mm')}
												</p>
												<p className='text-xs text-muted-foreground'>
													Created by Revornix
												</p>
											</div>
											<Button
												variant={'secondary'}
												className='text-xs'
												disabled={
													mutateInstallEngine.isPending &&
													installingEngineID === engine.id
												}
												onClick={() => {
													mutateInstallEngine.mutate({
														engine_id: engine.id,
														status: true,
													});
												}}>
												安装
												{mutateInstallEngine.isPending &&
													installingEngineID === engine.id && (
														<Loader2 className='animate-spin' />
													)}
											</Button>
										</div>
									</CardFooter>
								</Card>
							);
						})}
					</CardContent>
				</Card>
			)}
			<h2 className='text-xs text-muted-foreground p-3'>已安装引擎</h2>
			{isFetchingMineEngines && <Skeleton className='w-full h-52' />}
			{!isFetchingMineEngines &&
				mineEngines?.data &&
				mineEngines?.data.length === 0 && (
					<p className='text-xs text-muted-foreground text-center bg-muted p-5 rounded'>
						暂无已安装引擎
					</p>
				)}
			{mineEngines?.data && mineEngines.data.length > 0 && (
				<Card>
					<CardContent className='grid grid-cols-1 md:grid-cols-4 gap-5'>
						{mineEngines?.data?.map((engine) => {
							return (
								<Card key={engine.id} className='bg-muted/50'>
									<CardHeader>
										<CardTitle>{engine.name}</CardTitle>
										<CardDescription>{engine.description}</CardDescription>
									</CardHeader>
									<CardContent className='flex-1'>
										<p className='bg-muted/80 '>
											{engine.config_json && engine.config_json}
										</p>
									</CardContent>
									<CardFooter className='flex flex-col w-full gap-2'>
										<div className='w-full flex justify-between items-center'>
											<div>
												<p className='text-muted-foreground text-xs w-full mb-1'>
													{format(engine.create_time, 'MM-dd HH:mm')}
												</p>
												<p className='text-xs text-muted-foreground'>
													Created by Revornix
												</p>
											</div>
											<Button
												variant={'secondary'}
												className='text-xs'
												disabled={
													mutateInstallEngine.isPending &&
													unInstallingEngineID === engine.id
												}
												onClick={() => {
													mutateInstallEngine.mutate({
														engine_id: engine.id,
														status: false,
													});
												}}>
												删除
												{mutateInstallEngine.isPending &&
													unInstallingEngineID === engine.id && (
														<Loader2 className='animate-spin' />
													)}
											</Button>
										</div>
									</CardFooter>
								</Card>
							);
						})}
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default EnginePage;
