import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

const toneClassName = {
	default:
		'border-border/60 bg-muted/60 text-muted-foreground',
	sky: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
	amber:
		'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
	rose: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
	emerald:
		'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
	indigo:
		'border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
} as const;

type CardTitleIconTone = keyof typeof toneClassName;

const CardTitleIcon = ({
	icon: Icon,
	tone = 'default',
	className,
}: {
	icon: LucideIcon;
	tone?: CardTitleIconTone;
	className?: string;
}) => {
	return (
		<div
			className={cn(
				'flex size-8 shrink-0 items-center justify-center rounded-xl border',
				toneClassName[tone],
				className,
			)}>
			<Icon className='size-4' />
		</div>
	);
};

export default CardTitleIcon;
