import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { useMutation } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { installEngine } from '@/service/engine';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { EngineInfo } from '@/generated';

const ProvideEngineCard = ({ engine }: { engine: EngineInfo }) => {
	const queryClient = getQueryClient();
	const mutateInstallEngine = useMutation({
		mutationFn: installEngine,
		onSuccess: () => {
			toast.success('安装成功');
			queryClient.invalidateQueries({
				queryKey: ['mine-engine'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	return (
		<Card className='bg-muted/50'>
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
						<p className='text-xs text-muted-foreground'>Created by Revornix</p>
					</div>
					<Button
						variant={'outline'}
						className='text-xs shadow-none'
						disabled={mutateInstallEngine.isPending}
						onClick={() => {
							mutateInstallEngine.mutate({
								engine_id: engine.id,
								status: true,
							});
						}}>
						安装
						{mutateInstallEngine.isPending && (
							<Loader2 className='animate-spin' />
						)}
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
};
export default ProvideEngineCard;
