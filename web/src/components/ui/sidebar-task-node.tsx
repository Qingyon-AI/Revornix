'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import NoticeBox from './notice-box';

type TaskTone = 'default' | 'warning' | 'danger' | 'success';

const toneClassNames: Record<
	TaskTone,
	{
		badge: string;
		iconShell: string;
	}
> = {
	default: {
		badge:
			'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300',
		iconShell:
			'border-border/50 bg-background/45 text-muted-foreground dark:bg-background/30',
	},
	warning: {
		badge:
			'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
		iconShell:
			'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:border-amber-400/15 dark:bg-amber-400/10 dark:text-amber-300',
	},
	danger: {
		badge:
			'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300',
		iconShell:
			'border-rose-500/15 bg-rose-500/10 text-rose-700 dark:border-rose-400/15 dark:bg-rose-400/10 dark:text-rose-300',
	},
	success: {
		badge:
			'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
		iconShell:
			'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-300',
	},
};

const SidebarTaskNode = ({
	icon: Icon,
	title,
	description,
	status,
	tone = 'default',
	action,
	result,
	hint,
	className,
	iconClassName,
}: {
	icon: LucideIcon;
	title: string;
	description?: ReactNode;
	status?: ReactNode;
	tone?: TaskTone;
	action?: ReactNode;
	result?: ReactNode;
	hint?: ReactNode;
	className?: string;
	iconClassName?: string;
}) => {
	return (
		<div className={cn('space-y-3', className)}>
			<div className='flex flex-row items-center gap-3'>
				<div
					className={cn(
						'flex size-11 shrink-0 items-center justify-center rounded-[16px] border',
						toneClassNames[tone].iconShell,
					)}>
					<Icon className={cn('size-[18px]', iconClassName)} />
				</div>
				<div className='flex flex-col gap-1'>
					<h4 className='break-words text-[15px] font-semibold leading-6 text-foreground'>
						{title}
					</h4>
					{status ? (
						<Badge
							variant='outline'
							className={cn(
								'rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-none',
								toneClassNames[tone].badge,
							)}>
							{status}
						</Badge>
					) : null}
				</div>
			</div>
			<div className='min-w-0 space-y-1.5'>
				<div className='space-y-1'>
					{description ? (
						<div className='break-words text-sm leading-7 text-muted-foreground'>
							{description}
						</div>
					) : null}
				</div>
				{hint ? (
					<NoticeBox tone={tone} className='break-words'>
						{hint}
					</NoticeBox>
				) : null}
			</div>
			{result ? <div>{result}</div> : null}
			{action ? (
				<div className='shrink-0 flex justify-end gap-2'>{action}</div>
			) : null}
		</div>
	);
};

export default SidebarTaskNode;
