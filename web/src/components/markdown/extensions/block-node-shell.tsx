'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type BlockNodeShellProps = {
	selected: boolean;
	children: ReactNode;
	className?: string;
	contentClassName?: string;
};

const BlockNodeShell = ({
	selected,
	children,
	className,
	contentClassName,
}: BlockNodeShellProps) => {
	return (
		<div className={cn('pb-2.5', className)}>
			<div
				className={cn(
					'rounded-2xl border border-border/60 bg-muted/20',
					selected && 'ring-1 ring-ring/50',
					contentClassName,
				)}>
				{children}
			</div>
		</div>
	);
};

export default BlockNodeShell;
