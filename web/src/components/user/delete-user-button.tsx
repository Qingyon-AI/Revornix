'use client';

import {
	Dialog,
	DialogFooter,
	DialogHeader,
	DialogClose,
	DialogContent,
	DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { deleteUser } from '@/service/user';
import { useTranslations } from 'next-intl';

const DeleteUserButton = ({ className }: { className?: string }) => {
	const t = useTranslations();
	const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
	const [deleteUserSubmitStatus, setDeleteUserSubmitStatus] = useState(false);

	const onDeleteUser = async () => {
		setDeleteUserSubmitStatus(true);
		const [res, err] = await utils.to(deleteUser());
		if (err) {
			toast.error(err.message);
			return;
		}
		toast.success(t('account_delete_success'));
		await utils.sleep(1000);
		Cookies.remove('access_token');
		Cookies.remove('refresh_token');
		setDeleteUserSubmitStatus(false);
		window.location.reload();
	};
	return (
		<>
			<Dialog
				open={showDeleteUserDialog}
				onOpenChange={setShowDeleteUserDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('warning')}</DialogTitle>
					</DialogHeader>
					<div>
						<p className='mb-2'>{t('account_delete_alert')}</p>
						<p className='text-sm text-muted-foreground font-bold'>
							{t('account_delete_alert_description')}
						</p>
					</div>
					<DialogFooter>
						<Button
							variant='destructive'
							onClick={onDeleteUser}
							disabled={deleteUserSubmitStatus}>
							{t('account_delete_confirm')}
							{deleteUserSubmitStatus && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</Button>
						<DialogClose asChild>
							<Button variant={'secondary'}>
								{t('account_delete_cancel')}
							</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Button
				onClick={() => setShowDeleteUserDialog(true)}
				variant={'outline'}
				className={cn('w-full', className)}>
				<p className='text-red-500 font-bold'>{t('account_delete')}</p>
			</Button>
		</>
	);
};

export default DeleteUserButton;
