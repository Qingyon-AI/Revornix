'use client';

import Cookies from 'js-cookie';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import DocumentOperateAI from '@/components/document/document-operate-ai';
import SectionOperateAI from '@/components/section/section-operate-ai';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';

type SeoAiAskEntryProps =
	| {
			type: 'document';
			documentId: number;
			title?: string | null;
			loginHref: string;
			className?: string;
	  }
	| {
			type: 'section';
			sectionId: number;
			title?: string | null;
			loginHref: string;
			className?: string;
	  };

const SeoAiAskEntry = (props: SeoAiAskEntryProps) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [mounted, setMounted] = useState(false);
	const hasAccessToken = mounted && Boolean(Cookies.get('access_token'));
	const canAsk = mounted && Boolean(mainUserInfo?.id || hasAccessToken);
	const title = props.title || t(props.type === 'document' ? 'document_no_title' : 'section_title_empty');

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<div className={cn('inline-flex w-full justify-center', props.className)}>
			{canAsk ? (
				props.type === 'document' ? (
					<DocumentOperateAI
						document_id={props.documentId}
						document_title={title}
						iconOnly
						data-seo-action-button
						className='h-10 w-10 flex-none justify-center gap-0 overflow-hidden rounded-full border border-border/60 bg-background/85 px-0 text-foreground shadow-none dark:shadow-sm transition-[width,background-color,color,border-color,gap] duration-300 ease-out hover:bg-accent hover:text-accent-foreground [&_svg]:shrink-0 [&_span]:ml-0 [&_span]:max-w-0 [&_span]:overflow-hidden [&_span]:whitespace-nowrap [&_span]:text-sm [&_span]:font-medium [&_span]:opacity-0 [&_span]:transition-[margin,max-width,opacity] [&_span]:duration-300'
					/>
				) : (
					<SectionOperateAI
						section_id={props.sectionId}
						section_title={title}
						iconOnly
						data-seo-action-button
						className='h-10 w-10 flex-none justify-center gap-0 overflow-hidden rounded-full border border-border/60 bg-background/85 px-0 text-foreground shadow-none dark:shadow-sm transition-[width,background-color,color,border-color,gap] duration-300 ease-out hover:bg-accent hover:text-accent-foreground [&_svg]:shrink-0 [&_span]:ml-0 [&_span]:max-w-0 [&_span]:overflow-hidden [&_span]:whitespace-nowrap [&_span]:text-sm [&_span]:font-medium [&_span]:opacity-0 [&_span]:transition-[margin,max-width,opacity] [&_span]:duration-300'
					/>
				)
			) : (
				<Button
					asChild
					variant='ghost'
					data-seo-ai-button
					data-seo-action-button
					className='h-10 w-10 justify-center gap-0 overflow-hidden rounded-full border border-border/60 bg-background/85 px-0 text-foreground shadow-sm transition-[width,background-color,color,border-color,gap] duration-300 ease-out hover:bg-accent hover:text-accent-foreground'
					title={t('seo_ai_ask_login_action')}>
					<Link href={props.loginHref}>
						<LogIn className='size-4 shrink-0' />
						<span
							data-seo-ai-label
							data-seo-action-label
							className='ml-2 max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-[max-width,opacity] duration-300 peer-hover/toc:max-w-40 peer-hover/toc:opacity-100 peer-focus-within/toc:max-w-40 peer-focus-within/toc:opacity-100'>
							{t('seo_ai_ask_login_action')}
						</span>
					</Link>
				</Button>
			)}
		</div>
	);
};

export default SeoAiAskEntry;
