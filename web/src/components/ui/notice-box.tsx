'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type NoticeTone = 'default' | 'warning' | 'danger' | 'success';

const toneClassNames: Record<NoticeTone, string> = {
	default: 'border-border/50 bg-background/35 text-muted-foreground',
	warning:
		'border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-200',
	danger:
		'border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200',
	success:
		'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
};

const NoticeBox = ({
	children,
	tone = 'default',
	className,
}: {
	children: ReactNode;
	tone?: NoticeTone;
	className?: string;
}) => {
	return (
		<div
			className={cn(
				'rounded-[20px] border px-4 py-3 text-sm leading-7',
				toneClassNames[tone],
				className,
			)}>
			{children}
		</div>
	);
};

export default NoticeBox;
