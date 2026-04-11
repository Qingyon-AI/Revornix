'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { Badge } from './badge';
import { Card } from './card';

export type TaskStateTone = 'default' | 'warning' | 'danger' | 'success';

const toneClassNames: Record<
	TaskStateTone,
	{
		badge: string;
		iconShell: string;
		hint: string;
		panel: string;
	}
> = {
	default: {
		badge:
			'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300',
		iconShell:
			'border-border/60 bg-background/70 text-muted-foreground dark:bg-background/50',
		hint: 'border-border/60 bg-background/55 text-muted-foreground',
		panel: 'bg-background/45',
	},
	warning: {
		badge:
			'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
		iconShell:
			'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:border-amber-400/15 dark:bg-amber-400/10 dark:text-amber-300',
		hint: 'border-amber-500/15 bg-amber-500/10 text-amber-800 dark:text-amber-200',
		panel: 'bg-amber-500/5',
	},
	danger: {
		badge:
			'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300',
		iconShell:
			'border-rose-500/15 bg-rose-500/10 text-rose-700 dark:border-rose-400/15 dark:bg-rose-400/10 dark:text-rose-300',
		hint: 'border-rose-500/15 bg-rose-500/10 text-rose-800 dark:text-rose-200',
		panel: 'bg-rose-500/5',
	},
	success: {
		badge:
			'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
		iconShell:
			'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-300',
		hint: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
		panel: 'bg-emerald-500/5',
	},
};

type TaskStateCardProps = {
	icon: LucideIcon;
	title: string;
	description?: string;
	badge?: string;
	hint?: ReactNode;
	action?: ReactNode;
	children?: ReactNode;
	tone?: TaskStateTone;
	variant?: 'card' | 'panel' | 'plain';
	layout?: 'inline' | 'centered';
	className?: string;
	bodyClassName?: string;
	iconClassName?: string;
	spinning?: boolean;
};

const TaskStateCard = ({
	icon: Icon,
	title,
	description,
	badge,
	hint,
	action,
	children,
	tone = 'default',
	variant = 'card',
	layout = 'inline',
	className,
	bodyClassName,
	iconClassName,
	spinning = false,
}: TaskStateCardProps) => {
	const toneClasses = toneClassNames[tone];
	const isPanel = variant === 'panel';
	const isPlain = variant === 'plain';

	const wrapperClassName = cn(
		isPlain
			? 'h-full w-full'
			: isPanel
			? `h-full w-full overflow-hidden rounded-[22px] border border-border/60 backdrop-blur-sm ${toneClasses.panel}`
			: 'gap-0 p-0 overflow-hidden rounded-[26px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur',
		className,
	);

	const content = layout === 'centered' ? (
		<div className='flex h-full items-center justify-center p-4 sm:p-5'>
			<div className='mx-auto flex w-full max-w-sm flex-col items-center gap-2.5 text-center'>
				<div
					className={cn(
						'flex size-11 items-center justify-center rounded-[16px] border',
						toneClasses.iconShell,
					)}>
					<Icon
						className={cn(
							'size-[18px]',
							spinning ? 'animate-spin' : undefined,
							iconClassName,
						)}
					/>
				</div>

				{badge ? (
					<Badge
						variant='outline'
						className={cn(
							'rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-none',
							toneClasses.badge,
						)}>
						{badge}
					</Badge>
				) : null}

				<div className='space-y-1'>
					<p className='text-sm font-semibold leading-[22px] text-foreground'>{title}</p>
					{description ? (
						<p className='text-xs leading-[22px] text-muted-foreground'>{description}</p>
					) : null}
				</div>

				{hint ? (
					<div
						className={cn(
							'w-full rounded-[14px] border px-3 py-2 text-xs leading-5 text-left',
							toneClasses.hint,
						)}>
						{hint}
					</div>
				) : null}

				{action ? <div className='flex flex-wrap justify-center gap-2'>{action}</div> : null}
			</div>
		</div>
	) : (
		<div className='flex items-center gap-3.5 p-4 sm:p-[18px]'>
			<div
				className={cn(
					'flex size-11 shrink-0 items-center justify-center rounded-[16px] border',
					toneClasses.iconShell,
				)}>
				<Icon
					className={cn(
						'size-[18px]',
						spinning ? 'animate-spin' : undefined,
						iconClassName,
					)}
				/>
			</div>

			<div className='min-w-0 flex-1 space-y-2'>
				{badge || action ? (
					<div className='flex flex-wrap items-center gap-2'>
						{badge ? (
							<Badge
								variant='outline'
								className={cn(
									'rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-none',
									toneClasses.badge,
								)}>
								{badge}
							</Badge>
						) : null}
						{action ? <div className='ml-auto flex flex-wrap items-center gap-2'>{action}</div> : null}
					</div>
				) : null}

				<div className='space-y-1'>
					<h3
						className='break-words text-[15px] font-semibold leading-6 text-foreground'
						title={title}>
						{title}
					</h3>
					{description ? (
						<p
							className='break-words text-sm leading-[26px] text-muted-foreground'
							title={description}>
							{description}
						</p>
					) : null}
				</div>

				{hint ? (
					<div
						className={cn(
							'rounded-[14px] border px-3 py-2 text-xs leading-5',
							toneClasses.hint,
						)}>
						{hint}
					</div>
				) : null}

			</div>
		</div>
	);

	const body = children ? (
		<div
			className={cn(
				isPlain
					? 'px-4 pb-4 pt-3.5 sm:px-[18px] sm:pb-[18px]'
					: 'border-t border-border/60 px-4 pb-4 pt-3.5 sm:px-[18px] sm:pb-[18px]',
				bodyClassName,
			)}>
			{children}
		</div>
	) : null;

	if (isPanel || isPlain) {
		return (
			<div className={wrapperClassName}>
				{content}
				{body}
			</div>
		);
	}

	return (
		<Card className={wrapperClassName}>
			{content}
			{body}
		</Card>
	);
};

export default TaskStateCard;
