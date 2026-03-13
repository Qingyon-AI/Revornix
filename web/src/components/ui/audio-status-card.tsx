'use client';

import { AudioLines, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Badge } from './badge';
import { Button } from './button';
import { Card } from './card';

type AudioStatusTone = 'default' | 'warning' | 'danger';

const toneClassNames: Record<
	AudioStatusTone,
	{
		badge: string;
		iconShell: string;
		wave: string;
		hint: string;
	}
> = {
	default: {
		badge:
			'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300',
		iconShell:
			'border-border/60 bg-background/70 text-muted-foreground dark:bg-background/50',
		wave: 'bg-emerald-500/60 dark:bg-emerald-400/60',
		hint: 'border-border/60 bg-background/55 text-muted-foreground',
	},
	warning: {
		badge:
			'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
		iconShell:
			'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:border-amber-400/15 dark:bg-amber-400/10 dark:text-amber-300',
		wave: 'bg-amber-500/60 dark:bg-amber-400/60',
		hint: 'border-amber-500/15 bg-amber-500/10 text-amber-800 dark:text-amber-200',
	},
	danger: {
		badge:
			'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300',
		iconShell:
			'border-rose-500/15 bg-rose-500/10 text-rose-700 dark:border-rose-400/15 dark:bg-rose-400/10 dark:text-rose-300',
		wave: 'bg-rose-500/60 dark:bg-rose-400/60',
		hint: 'border-rose-500/15 bg-rose-500/10 text-rose-800 dark:text-rose-200',
	},
};

const AudioStatusCard = ({
	badge,
	title,
	description,
	actionLabel,
	onAction,
	actionDisabled,
	actionLoading,
	icon: Icon = AudioLines,
	tone = 'default',
	hint,
	className,
}: {
	badge: string;
	title: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	actionDisabled?: boolean;
	actionLoading?: boolean;
	icon?: LucideIcon;
	tone?: AudioStatusTone;
	hint?: string;
	className?: string;
}) => {
	const toneClasses = toneClassNames[tone];

	return (
		<Card
			className={cn(
				'gap-0 rounded-[30px] border border-border/60 bg-card/85 p-0 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur',
				className,
			)}>
			<div className='flex items-stretch gap-4 p-4 sm:p-5'>
				<div
					className={cn(
						'flex size-12 shrink-0 items-center justify-center rounded-[18px] border',
						toneClasses.iconShell,
					)}>
					<Icon className='size-5' />
				</div>

				<div className='min-w-0 flex-1 space-y-3'>
					<div className='space-y-1.5'>
						<h3
							className='text-base font-semibold leading-7 text-foreground line-clamp-1'
							title={title}>
							{title}
						</h3>
						{description ? (
							<p
								className='text-sm leading-6 text-muted-foreground line-clamp-2'
								title={description}>
								{description}
							</p>
						) : null}
					</div>

					{hint ? (
						<div
							className={cn(
								'rounded-[18px] border px-3 py-2 text-xs leading-5',
								toneClasses.hint,
							)}>
							{hint}
						</div>
					) : null}

					<div className='flex flex-wrap items-center gap-2'>
						<Badge
							variant='outline'
							className={cn(
								'rounded-full px-2.5 py-1 text-[11px] font-medium shadow-none',
								toneClasses.badge,
							)}>
							{badge}
						</Badge>
					</div>

					{actionLabel && onAction ? (
						<Button
							variant='outline'
							className='h-10 w-fit rounded-full border-border/70 bg-background/65 px-4 text-sm shadow-none hover:bg-background'
							onClick={onAction}
							disabled={actionDisabled || actionLoading}>
							{actionLabel}
						</Button>
					) : null}
				</div>
			</div>
		</Card>
	);
};

export default AudioStatusCard;
