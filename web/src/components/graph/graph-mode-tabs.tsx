'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { GraphMode } from '@/service/graph';
import { useTranslations } from 'next-intl';

type GraphModeTabsProps = {
	value: GraphMode;
	onValueChange: (mode: GraphMode) => void;
	className?: string;
};

const GraphModeTabs = ({ value, onValueChange, className }: GraphModeTabsProps) => {
	const t = useTranslations();
	return (
		<Tabs
			value={value}
			onValueChange={(next) => onValueChange(next as GraphMode)}
			className={className}>
			<TabsList className='shadow-none [&_[data-state=active]]:shadow-none!'>
				<TabsTrigger value='knowledge'>{t('graph_mode_knowledge')}</TabsTrigger>
				<TabsTrigger value='document'>{t('graph_mode_document')}</TabsTrigger>
			</TabsList>
		</Tabs>
	);
};

export default GraphModeTabs;
