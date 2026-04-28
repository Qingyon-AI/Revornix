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
import { clearAuthCookies } from '@/lib/auth-cookies';
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
		await utils.sleep(500);
		toast.success(t('account_delete_success'));
		clearAuthCookies();
		setDeleteUserSubmitStatus(false);
		window.location.reload();
	};
	return (
		<>
			<Dialog
				open={showDeleteUserDialog}
				onOpenChange={setShowDeleteUserDialog}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-md'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>{t('warning')}</DialogTitle>
					</DialogHeader>
					<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
						<p className='mb-2'>{t('account_delete_alert')}</p>
						<p className='text-sm text-muted-foreground font-bold'>
							{t('account_delete_alert_description')}
						</p>
					</div>
					<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
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
