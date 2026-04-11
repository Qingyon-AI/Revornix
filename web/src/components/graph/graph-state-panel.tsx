'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import TaskStateCard, { type TaskStateTone } from '@/components/ui/task-state-card';

type GraphStatePanelProps = {
	icon: LucideIcon;
	title: string;
	description?: string;
	badge?: string;
	className?: string;
	iconClassName?: string;
	spinning?: boolean;
	tone?: TaskStateTone;
	action?: ReactNode;
};

const GraphStatePanel = ({
	icon: Icon,
	title,
	description,
	badge,
	className,
	iconClassName,
	spinning = false,
	tone = 'default',
	action,
}: GraphStatePanelProps) => {
	return (
		<TaskStateCard
			variant='plain'
			layout='centered'
			icon={Icon}
			badge={badge}
			title={title}
			description={description}
			className={className}
			iconClassName={iconClassName}
			spinning={spinning}
			tone={tone}
			action={action}
		/>
	);
};

export default GraphStatePanel;
