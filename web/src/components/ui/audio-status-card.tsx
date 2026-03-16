'use client';

import { AudioLines, Loader2, type LucideIcon } from 'lucide-react';

import { Button } from './button';
import TaskStateCard, { type TaskStateTone } from './task-state-card';

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
	hint?: string;
	className?: string;
	spinning?: boolean;
}) => {
	return (
		<TaskStateCard
			icon={Icon}
			badge={badge}
			title={title}
			description={description}
			tone={tone}
			hint={hint}
			className={className}
			spinning={spinning}
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
