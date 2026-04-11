'use client';

import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SectionVisibilityHint = ({
	isPublished,
	className,
}: {
	isPublished: boolean;
	className?: string;
}) => {
	const t = useTranslations();

	return (
		<Badge
			variant={isPublished ? 'secondary' : 'outline'}
			className={cn(
				'rounded-full px-2 py-0.5 text-[11px] font-medium shadow-none',
				isPublished
					? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
					: 'border-border/60 text-muted-foreground',
				className,
			)}>
			<span className='inline-flex items-center gap-1.5'>
				<span
					className={cn(
						'size-1.5 rounded-full',
						isPublished ? 'bg-emerald-500' : 'bg-muted-foreground/70',
					)}
				/>
				{isPublished
					? t('section_publish_status_on')
					: t('admin_sections_publish_private')}
			</span>
		</Badge>
	);
};

export default SectionVisibilityHint;
