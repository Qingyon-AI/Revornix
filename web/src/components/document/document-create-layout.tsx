'use client';

import type { ComponentType, ReactNode } from 'react';
import { OctagonAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormDescription, FormLabel } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export const DocumentCreatePanelTitle = ({
	icon: Icon,
	title,
	children,
}: {
	icon: ComponentType<{ className?: string }>;
	title: string;
	children?: ReactNode;
}) => {
	return (
		<div className='flex items-center gap-2'>
			<div className='flex size-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/50 text-muted-foreground'>
				<Icon className='size-3.5' />
			</div>
			<div className='min-w-0'>
				<p className='text-sm font-medium leading-none'>{title}</p>
				{children && (
					<div className='mt-1 text-xs text-muted-foreground'>{children}</div>
				)}
			</div>
		</div>
	);
};

export const DocumentCreateAutomationOption = ({
	title,
	description,
	checked,
	disabled,
	onCheckedChange,
	alert,
	icon: Icon,
}: {
	title: string;
	description: string;
	checked: boolean;
	disabled: boolean;
	onCheckedChange: (checked: boolean) => void;
	alert?: string;
	icon: ComponentType<{ className?: string }>;
}) => {
	return (
		<div
			className={cn(
				'rounded-md border border-border/70 bg-background p-2.5 transition-colors',
				checked && 'border-primary/40 bg-primary/5',
			)}>
			<div className='flex items-start gap-2.5'>
				<div className='mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
					<Icon className='size-4' />
				</div>
				<div className='min-w-0 flex-1'>
					<div className='flex items-center gap-3'>
						<FormLabel className='min-w-0 flex-1 text-sm font-medium leading-5'>
							{title}
						</FormLabel>
						<Switch
							disabled={disabled}
							checked={checked}
							onCheckedChange={onCheckedChange}
						/>
					</div>
					<FormDescription className='mt-1 text-xs leading-4'>
						{description}
					</FormDescription>
				</div>
			</div>
			{alert && (
				<Alert className='mt-2.5 border-destructive/20 bg-destructive/10 py-2 dark:bg-destructive/20'>
					<OctagonAlert className='h-4 w-4 text-destructive!' />
					<AlertDescription className='text-xs leading-5'>
						{alert}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
};
