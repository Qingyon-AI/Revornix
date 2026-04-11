'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

const ListLoadingIndicator = ({
	className,
	centered = false,
}: {
	className?: string;
	centered?: boolean;
}) => {
	const t = useTranslations();

	return (
		<div
			className={cn(
				'flex items-center gap-2 text-sm text-muted-foreground',
				centered
					? 'justify-center px-4 py-10'
					: 'justify-center py-4',
				className,
			)}>
			<Loader2 className='size-4 animate-spin' />
			<span>{t('loading')}...</span>
		</div>
	);
};

export default ListLoadingIndicator;
