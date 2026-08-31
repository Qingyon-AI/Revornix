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

const DocumentOperateAI = ({
	document_id,
	document_title,
	disabled,
	className,
	onTriggerClick,
	iconOnly = false,
}: {
	document_id: number;
	document_title?: string;
	disabled?: boolean;
	className?: string;
	onTriggerClick?: () => void;
	iconOnly?: boolean;
}) => {
	const t = useTranslations();

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					title={t('document_ai_ask')}
					data-seo-ai-button
					variant='ghost'
					className={cn('w-full flex-1 text-xs', className)}
					disabled={disabled}
					onClick={onTriggerClick}>
					<Bot />
					{iconOnly ? (
						<span
							data-seo-ai-label
							aria-hidden='true'
							className='ml-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[margin,max-width,opacity] duration-300'>
							{t('document_ai_ask')}
						</span>
					) : (
						t('document_ai_ask')
					)}
				</Button>
			</SheetTrigger>
			<SheetContent className='flex h-full flex-col gap-0 overflow-hidden bg-card/95 pt-0 sm:max-w-2xl'>
				<SheetHeader className='border-b border-border/60 px-5 pb-3 pt-6'>
					<SheetTitle className='text-xl'>{t('document_ai_ask')}</SheetTitle>
					<SheetDescription className='max-w-2xl text-sm leading-5'>
						{t('document_ai_description', {
							title: document_title || t('document_no_title'),
						})}
					</SheetDescription>
				</SheetHeader>
				<BoundAgentChat
					binding={{ document_id }}
					emptyHint={t('document_ai_tip')}
				/>
			</SheetContent>
		</Sheet>
	);
};

export default DocumentOperateAI;
