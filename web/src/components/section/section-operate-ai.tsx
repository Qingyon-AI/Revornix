'use client';

import { Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import BoundAgentChat from '@/components/revornixai/bound-agent-chat';
import { Button } from '../ui/button';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';

const SectionOperateAI = ({
	section_id,
	section_title,
	disabled,
	className,
	onTriggerClick,
	iconOnly = false,
	open,
	onOpenChange,
}: {
	section_id: number;
	section_title?: string;
	disabled?: boolean;
	className?: string;
	onTriggerClick?: () => void;
	iconOnly?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) => {
	const t = useTranslations();

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetTrigger asChild>
				<Button
					title={t('section_ai_ask')}
					data-seo-ai-button
					variant={'ghost'}
					className={cn('flex-1 text-xs w-full', className)}
					disabled={disabled}
					onClick={onTriggerClick}>
					<Bot />
					{iconOnly ? (
						<span
							data-seo-ai-label
							aria-hidden='true'
							className='ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[margin,max-width,opacity] duration-300'>
							{t('section_ai_ask')}
						</span>
					) : (
						t('section_ai_ask')
					)}
				</Button>
			</SheetTrigger>
			<SheetContent className='flex h-full flex-col gap-0 overflow-hidden bg-card/95 pt-0 sm:max-w-2xl'>
				<SheetHeader className='border-b border-border/60 px-5 pt-6 pb-3'>
					<SheetTitle className='text-xl'>{t('section_ai_ask')}</SheetTitle>
					<SheetDescription className='max-w-2xl text-sm leading-5'>
						{t('section_ai_description', {
							title: section_title || t('sidebar_section'),
						})}
					</SheetDescription>
				</SheetHeader>
				<BoundAgentChat
					binding={{ section_id }}
					emptyHint={t('section_ai_tip')}
				/>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateAI;
