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

const DeleteUserButton = ({ className }: { className?: string }) => {
	const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
	const [deleteUserSubmitStatus, setDeleteUserSubmitStatus] = useState(false);

	const onDeleteUser = async () => {
		setDeleteUserSubmitStatus(true);
		const [res, err] = await utils.to(deleteUser());
		if (err) {
			toast.error(err.message);
			return;
		}
		toast.success('账户注销成功');
		await utils.sleep(1000); // 等待1秒
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
						<DialogTitle>警告</DialogTitle>
					</DialogHeader>
					<div>
						<p className='mb-2'>确认注销账户吗？</p>
						<p className='text-sm text-muted-foreground font-bold'>
							一旦注销，你账户的所有相关信息将会删除，此操作不可撤销！
						</p>
					</div>
					<DialogFooter>
						<Button
							variant='destructive'
							onClick={onDeleteUser}
							disabled={deleteUserSubmitStatus}>
							确认删除
							{deleteUserSubmitStatus && (
								<Loader2 className='size-4 animate-spin' />
							)}
						</Button>
						<DialogClose asChild>
							<Button variant={'secondary'}>取消</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Button
				onClick={() => setShowDeleteUserDialog(true)}
				variant={'outline'}
				className={cn('w-full', className)}>
				<p className='text-red-500 font-bold'>注销账号</p>
			</Button>
		</>
	);
};

export default DeleteUserButton;
