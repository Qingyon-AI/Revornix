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
import { UserFileSystemInfo } from '@/generated';
import { useTranslations } from 'next-intl';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
import { useState } from 'react';
import { deleteUserFileSystem } from '@/service/file-system';
import { useUserContext } from '@/provider/user-provider';
import FileSystemUpdate from './file-system-update';

const MineFileSystemCard = ({
	user_file_system,
}: {
	user_file_system: UserFileSystemInfo;
}) => {
	const t = useTranslations();
	const { refreshMainUserInfo } = useUserContext();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const queryClient = getQueryClient();

	const mutateDeleteUserFileSystem = useMutation({
		mutationFn: deleteUserFileSystem,
		onSuccess: () => {
			toast.success(t('setting_file_system_delete_success'));
			queryClient.invalidateQueries({
				queryKey: ['mine-file-system'],
			});
			refreshMainUserInfo();
		},
	});

	return (
		<>
			<Card>
				<CardHeader className='flex-1'>
					<CardTitle>{user_file_system.title}</CardTitle>
					<CardDescription>{user_file_system.description}</CardDescription>
				</CardHeader>
				<CardFooter className='flex justify-end gap-2'>
					<FileSystemUpdate userFileSystemId={user_file_system.id} />
					<AlertDialog
						open={deleteDialogOpen}
						onOpenChange={setDeleteDialogOpen}>
						<AlertDialogTrigger asChild>
							<Button variant={'secondary'} className='text-xs shadow-none'>
								{t('delete')}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{t('tip')}</AlertDialogTitle>
								<AlertDialogDescription>
									{t('setting_file_system_page_mine_file_system_delete_alert')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<Button
									variant={'destructive'}
									onClick={async () => {
										const res = await mutateDeleteUserFileSystem.mutateAsync({
											user_file_system_id: user_file_system.id,
										});
										if (res.success) {
											setDeleteDialogOpen(false);
										}
									}}
									disabled={mutateDeleteUserFileSystem.isPending}>
									{t('confirm')}
									{mutateDeleteUserFileSystem.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
								<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardFooter>
			</Card>
		</>
	);
};
export default MineFileSystemCard;
