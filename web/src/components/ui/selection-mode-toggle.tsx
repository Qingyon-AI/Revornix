'use client';

import { ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

/**
 * 列表工具栏上的「选择」开关。多选是显式模式 —— 不点它，列表里不会出现任何勾选框。
 */
const SelectionModeToggle = ({
	active,
	onToggle,
}: {
	active: boolean;
	onToggle: () => void;
}) => {
	const t = useTranslations();
	const label = active ? t('selection_mode_exit') : t('selection_mode_enter');

	return (
		<Button
			size='icon'
			variant={active ? 'default' : 'outline'}
			aria-pressed={active}
			title={label}
			onClick={onToggle}>
			<ListChecks />
			<span className='sr-only'>{label}</span>
		</Button>
	);
};

export default SelectionModeToggle;
