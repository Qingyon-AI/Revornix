'use client';

import type { ReactNode } from 'react';

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	confirmLabel: string;
	onConfirm: () => void;
	confirmDisabled?: boolean;
	confirmLoading?: boolean;
	children?: ReactNode;
};

const ResourceConfirmDialog = ({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	onConfirm,
	confirmDisabled = false,
	confirmLoading = false,
	children,
}: Props) => {
	const t = useTranslations();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div className='space-y-4'>
					<div className='rounded-[18px] border border-border/60 bg-background/45 px-4 py-3 text-sm leading-6 text-muted-foreground'>
						{t('resource_action_notice')}
					</div>
					{children}
				</div>
				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						onClick={() => onOpenChange(false)}
						disabled={confirmLoading}>
						{t('cancel')}
					</Button>
					<Button
						type='button'
						onClick={onConfirm}
						disabled={confirmDisabled || confirmLoading}>
						{confirmLoading ? <Loader2 className='size-4 animate-spin' /> : null}
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ResourceConfirmDialog;
