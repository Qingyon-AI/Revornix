import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { useMutation } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { FileSystemInfo } from '@/generated';
import { useTranslations } from 'next-intl';
import { installFileSystem } from '@/service/file_system';

const ProvideFileSystemCard = ({
	file_system,
}: {
	file_system: FileSystemInfo;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const mutateInstallFileSystem = useMutation({
		mutationFn: installFileSystem,
		onSuccess: () => {
			toast.success(t('setting_file_system_install_success'));
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});
	return (
		<Card className='bg-muted/50'>
			<CardHeader className='flex-1'>
				<CardTitle>{file_system.name}</CardTitle>
				<CardDescription>{file_system.description}</CardDescription>
			</CardHeader>
			<CardFooter className='flex flex-col w-full gap-2'>
				<div className='w-full flex justify-between items-center'>
					<Button
						variant={'outline'}
						className='text-xs shadow-none'
						disabled={mutateInstallFileSystem.isPending}
						onClick={() => {
							mutateInstallFileSystem.mutate({
								file_system_id: file_system.id,
								status: true,
							});
						}}>
						{t('install')}
						{mutateInstallFileSystem.isPending && (
							<Loader2 className='animate-spin' />
						)}
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
};
export default ProvideFileSystemCard;
