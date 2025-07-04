import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { useMutation } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { installEngine } from '@/service/engine';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { EngineInfo } from '@/generated';
import { useTranslations } from 'next-intl';

const ProvideEngineCard = ({ engine }: { engine: EngineInfo }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const mutateInstallEngine = useMutation({
		mutationFn: installEngine,
		onSuccess: () => {
			toast.success(t('setting_engine_page_install_success'));
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
			<CardHeader className='flex-1'>
				<CardTitle>{engine.name}</CardTitle>
				<CardDescription>{engine.description}</CardDescription>
			</CardHeader>
			<CardFooter className='flex flex-col w-full gap-2'>
				<div className='w-full flex justify-between items-center'>
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
						{t('install')}
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
