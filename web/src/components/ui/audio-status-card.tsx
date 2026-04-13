'use client';

import type { ReactNode } from 'react';

import { AudioLines, Loader2, type LucideIcon } from 'lucide-react';

import { Button } from './button';
import SidebarTaskNode from './sidebar-task-node';
import type { TaskStateTone } from './task-state-card';

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
	spinning = false,
	variant: _variant = 'card',
}: {
	badge: string;
	title: string;
	description?: string;
	actionLabel?: string;
	onAction?: () => void;
	actionDisabled?: boolean;
	actionLoading?: boolean;
	icon?: LucideIcon;
	tone?: TaskStateTone;
	hint?: ReactNode;
	className?: string;
	spinning?: boolean;
	variant?: 'card' | 'panel' | 'plain';
}) => {
	return (
		<SidebarTaskNode
			icon={Icon}
			status={badge}
			title={title}
			description={description}
			tone={tone}
			hint={hint}
			className={className}
			iconClassName={spinning ? 'animate-spin' : undefined}
			action={
				actionLabel && onAction ? (
					<Button
						variant='outline'
						className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
						onClick={onAction}
						disabled={actionDisabled || actionLoading}>
						{actionLoading ? <Loader2 className='size-4 animate-spin' /> : null}
						{actionLabel}
					</Button>
				) : undefined
			}
		/>
	);
};

export default AudioStatusCard;
