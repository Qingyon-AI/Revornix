'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

type AccountUnbindConfirmButtonProps = {
	description: ReactNode;
	disabled?: boolean;
	onConfirm: () => void | Promise<void>;
	className?: string;
};

const AccountUnbindConfirmButton = ({
	description,
	disabled = false,
	onConfirm,
	className,
}: AccountUnbindConfirmButtonProps) => {
	const t = useTranslations();

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant='link' className={className} disabled={disabled}>
					{t('account_unbind')}
					{disabled && <Loader2 className='size-4 animate-spin' />}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t('account_unbind_confirm_title')}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
					<AlertDialogAction
						onClick={() => {
							void onConfirm();
						}}>
						{t('confirm')}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};

export default AccountUnbindConfirmButton;
