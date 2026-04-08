'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';

const DocumentCreateAdvancedSection = ({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) => {
	const t = useTranslations();
	const [open, setOpen] = useState(true);

	return (
		<Collapsible open={open} onOpenChange={setOpen} className={className}>
			<CollapsibleTrigger asChild>
				<button
					type='button'
					className='flex w-full items-center gap-3 py-1 text-sm text-muted-foreground transition hover:text-foreground'>
					<div className='h-px flex-1 bg-border/70' />
					<span className='shrink-0'>
						{open ? t('document_create_less_config') : t('document_create_more_config')}
					</span>
					<ChevronDown
						className={cn('size-4 shrink-0 transition-transform', !open && '-rotate-90')}
					/>
					<div className='h-px flex-1 bg-border/70' />
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent className='pt-4'>
				<div className='space-y-5'>{children}</div>
			</CollapsibleContent>
		</Collapsible>
	);
};

export default DocumentCreateAdvancedSection;
