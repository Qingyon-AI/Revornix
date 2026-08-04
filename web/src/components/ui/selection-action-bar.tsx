'use client';

import type { ReactNode } from 'react';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 列表页选中若干项之后浮出的批量操作条。选中数为 0 时不渲染，所以调用方不必自己
 * 判空。操作按钮由调用方以 children 传入 —— 每个列表能做的事不一样。
 */
const SelectionActionBar = ({
	count,
	onClear,
	children,
	className,
}: {
	count: number;
	onClear: () => void;
	children?: ReactNode;
	className?: string;
}) => {
	const t = useTranslations();

	if (count <= 0) {
		return null;
	}

	return (
		<div
			className={cn(
				// 贴底浮动，并让开移动端的安全区；z 值压过列表但不挡弹窗。
				'pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4',
				className,
			)}>
			<div className='pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border/60 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm'>
				<span className='px-1 text-sm text-muted-foreground'>
					{t('selection_selected_count', { count })}
				</span>
				{children}
				<Button
					variant='ghost'
					size='sm'
					className='h-8 rounded-full px-2'
					onClick={onClear}
					title={t('selection_clear')}>
					<X className='size-4' />
					<span className='sr-only'>{t('selection_clear')}</span>
				</Button>
			</div>
		</div>
	);
};

export default SelectionActionBar;
