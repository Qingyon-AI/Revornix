'use client';

import type { ReactNode } from 'react';

import { GitBranch } from 'lucide-react';

import TaskStateCard, { type TaskStateTone } from '@/components/ui/task-state-card';

type GraphTaskCardProps = {
	title: string;
	description?: string;
	badge?: string;
	tone?: TaskStateTone;
	action?: ReactNode;
	children: ReactNode;
	className?: string;
	bodyClassName?: string;
};

const GraphTaskCard = ({
	title,
	description,
	badge,
	tone = 'default',
	action,
	children,
	className,
	bodyClassName,
}: GraphTaskCardProps) => {
	return (
		<TaskStateCard
			icon={GitBranch}
			badge={badge}
			title={title}
			description={description}
			tone={tone}
			action={action}
			className={className}
			bodyClassName={bodyClassName}>
			{children}
		</TaskStateCard>
	);
};

export default GraphTaskCard;
