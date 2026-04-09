'use client';

import { Button } from '@/components/ui/button';
import { CardViewMode } from '@/lib/card-view-mode';
import { cn } from '@/lib/utils';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const CardViewToggle = ({
	value,
	onChange,
	className,
}: {
	value: CardViewMode;
	onChange: (value: CardViewMode) => void;
	className?: string;
}) => {
	const t = useTranslations();

	return (
		<div
			className={cn(
				'inline-flex shrink-0 items-center overflow-hidden rounded-md border bg-background shadow-xs dark:bg-input/30 dark:border-input',
				className,
			)}>
			<Button
				type='button'
				size='icon-sm'
				variant='ghost'
				className={cn(
					'rounded-none border-0 shadow-none',
					value === 'grid'
						? 'bg-accent text-accent-foreground hover:bg-accent'
						: undefined,
				)}
				onClick={() => onChange('grid')}
				aria-label={t('card_view_grid')}
				title={t('card_view_grid')}>
				<LayoutGrid className='size-4' />
			</Button>
			<Button
				type='button'
				size='icon-sm'
				variant='ghost'
				className={cn(
					'rounded-none border-0 border-l border-border/60 shadow-none',
					value === 'list'
						? 'bg-accent text-accent-foreground hover:bg-accent'
						: undefined,
				)}
				onClick={() => onChange('list')}
				aria-label={t('card_view_list')}
				title={t('card_view_list')}>
				<Rows3 className='size-4' />
			</Button>
		</div>
	);
};

export default CardViewToggle;
