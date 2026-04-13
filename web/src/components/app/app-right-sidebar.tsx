'use client';

import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

import { PanelRightIcon } from 'lucide-react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useRightSidebar } from '@/provider/right-sidebar-provider';

import { Button } from '../ui/button';

const RIGHT_SIDEBAR_WIDTH = '25rem';

export const RightSidebarTrigger = ({
	className,
}: {
	className?: string;
}) => {
	const isCompactViewport = useIsMobile(1280);
	const { hasContent, open, toggleSidebar } = useRightSidebar();

	if (isCompactViewport || !hasContent) {
		return null;
	}

	return (
		<Button
			variant='outline'
			size='icon-sm'
			type='button'
			className={cn('rounded-xl', className)}
			onClick={toggleSidebar}>
			<PanelRightIcon className={cn('transition-transform', open ? '' : 'scale-x-[-1]')} />
			<span className='sr-only'>Toggle Right Sidebar</span>
		</Button>
	);
};

export const AppRightSidebar = () => {
	const isCompactViewport = useIsMobile(1280);
	const { content, hasContent, open } = useRightSidebar();
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open || !hasContent) {
			return;
		}

		const container = scrollContainerRef.current;
		if (!container) {
			return;
		}

		container.scrollTop = 0;
	}, [content, hasContent, open]);

	if (isCompactViewport || !hasContent) {
		return null;
	}

	return (
		<>
			<div
				aria-hidden='true'
				className={cn(
					'h-full shrink-0 transition-[width] duration-200 ease-linear',
					open ? 'w-[var(--right-sidebar-width)]' : 'w-0',
				)}
				style={
					{
						'--right-sidebar-width': RIGHT_SIDEBAR_WIDTH,
					} as CSSProperties
				}
			/>
			<aside
				className={cn(
					'fixed inset-y-0 right-0 z-10 hidden w-[var(--right-sidebar-width)] shrink-0 border-l border-border transition-transform duration-200 ease-linear xl:flex',
					open ? 'translate-x-0' : 'translate-x-[calc(100%+0.5rem)]',
				)}
				style={
					{
						'--right-sidebar-width': RIGHT_SIDEBAR_WIDTH,
					} as CSSProperties
				}>
				<div className='flex h-full w-full flex-col overflow-hidden text-sidebar-foreground backdrop-blur-xl'>
					<div
						ref={scrollContainerRef}
						className='min-h-0 flex-1 overflow-y-auto overscroll-contain'>
						{content}
					</div>
				</div>
			</aside>
		</>
	);
};
