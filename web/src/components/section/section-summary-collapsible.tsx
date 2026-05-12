'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getSectionMarkdownContent } from '@/service/section';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';

const toMarkdownPreviewText = (content: string) => {
	return content
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]*)`/g, '$1')
		.replace(/!\[.*?\]\(.*?\)/g, ' ')
		.replace(/\[(.*?)\]\(.*?\)/g, '$1')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s?/gm, '')
		.replace(/[*_~|]/g, ' ')
		.replace(/\n+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
};

const SectionSummaryCollapsible = ({
	sectionId,
	hasMarkdown,
	previewSource,
	summaryAction,
	children,
}: {
	sectionId: number;
	hasMarkdown: boolean;
	previewSource?: string | null;
	summaryAction?: ReactNode;
	children: ReactNode;
}) => {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const { data } = useQuery({
		queryKey: ['getSectionMarkdownPreview', sectionId],
		queryFn: () => getSectionMarkdownContent({ section_id: sectionId }),
		enabled: hasMarkdown && !previewSource,
	});
	const previewText = useMemo(() => {
		const source = previewSource ?? data;
		return source ? toMarkdownPreviewText(source) : '';
	}, [data, previewSource]);

	return (
		<Collapsible open={open} onOpenChange={setOpen}>
			<div className='mx-auto flex w-full max-w-[920px] items-center gap-3 py-3'>
				<CollapsibleTrigger asChild>
					<button className='flex min-w-0 flex-1 items-center justify-between gap-4 text-left'>
						<div className='min-w-0 flex-1 space-y-2'>
							{open ? (
								<p className='text-sm leading-6 text-muted-foreground'>
									{hasMarkdown
										? t('section_summary_description')
										: t('section_summary_empty_description')}
								</p>
							) : !hasMarkdown ? (
								<p className='text-sm leading-6 text-muted-foreground'>
									{t('section_summary_empty_description')}
								</p>
							) : previewText ? (
								<p
									className={cn(
										'overflow-hidden text-sm leading-6 text-muted-foreground',
										'[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]',
									)}>
									{previewText}
								</p>
							) : (
								<span className='inline-flex text-sm font-medium text-foreground/85 underline-offset-4 transition-colors hover:text-foreground hover:underline'>
									{t('section_summary_view_more')}
								</span>
							)}
						</div>
						<ChevronDown
							className={cn(
								'size-4 shrink-0 transition-transform duration-200',
								open && 'rotate-180',
							)}
						/>
					</button>
				</CollapsibleTrigger>
				{!open && summaryAction ? (
					<div className='shrink-0'>{summaryAction}</div>
				) : null}
			</div>
			<CollapsibleContent className='pb-3'>
				{open && hasMarkdown ? children : null}
			</CollapsibleContent>
		</Collapsible>
	);
};

export default SectionSummaryCollapsible;
