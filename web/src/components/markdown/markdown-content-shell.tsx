'use client';

import type { ReactNode } from 'react';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

type TocHeading = {
	id: string;
	text: string;
	level: number;
	top: number;
};

const getAnchorElement = (contentElement: HTMLElement) =>
	contentElement.closest('[data-markdown-shell-anchor]') as HTMLElement | null;

const slugifyHeading = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[\s\W-]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'section';

const getStickyHeaderOffset = () => {
	const header = document.querySelector('header.sticky.top-0.z-20');
	if (!(header instanceof HTMLElement)) {
		return 80;
	}

	return header.getBoundingClientRect().height + 16;
};

const collectHeadings = (container: HTMLElement): TocHeading[] => {
	const headingElements = Array.from(
		container.querySelectorAll<HTMLElement>(
			'.ProseMirror h1, .ProseMirror h2, .ProseMirror h3',
		),
	);

	const slugCount = new Map<string, number>();

	return headingElements
		.map((element) => {
			const text = element.textContent?.trim() ?? '';
			if (!text) {
				return null;
			}

			const baseSlug = slugifyHeading(text);
			const seenCount = slugCount.get(baseSlug) ?? 0;
			slugCount.set(baseSlug, seenCount + 1);

			const id = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`;
			element.id = id;

			return {
				id,
				text,
				level: Number(element.tagName.replace('H', '')),
				top: element.getBoundingClientRect().top + window.scrollY,
			};
		})
		.filter((item): item is TocHeading => item != null);
};

const getActiveHeadingId = (headings: TocHeading[], scrollTop: number) => {
	if (headings.length === 0) {
		return null;
	}

	const offset = scrollTop + getStickyHeaderOffset() + 24;
	let activeId = headings[0].id;

	for (const heading of headings) {
		if (heading.top <= offset) {
			activeId = heading.id;
		} else {
			break;
		}
	}

	return activeId;
};

const scrollToHeading = (headingId: string) => {
	const element = document.getElementById(headingId);
	if (!(element instanceof HTMLElement)) {
		return;
	}

	const top =
		element.getBoundingClientRect().top +
		window.scrollY -
		getStickyHeaderOffset();

	window.scrollTo({
		top: Math.max(0, top),
		behavior: 'smooth',
	});
};

const MarkdownContentShell = ({
	children,
	enableFloatingToc = false,
	className,
	contentClassName,
}: {
	children: ReactNode;
	enableFloatingToc?: boolean;
	className?: string;
	contentClassName?: string;
}) => {
	const t = useTranslations();
	const [contentElement, setContentElement] = useState<HTMLDivElement | null>(
		null,
	);
	const [headings, setHeadings] = useState<TocHeading[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [tocPinnedByKeyboard, setTocPinnedByKeyboard] = useState(false);
	const [canShowFloatingToc, setCanShowFloatingToc] = useState(false);

	useEffect(() => {
		if (!enableFloatingToc) {
			setCanShowFloatingToc(false);
			return;
		}

		const mediaQuery = window.matchMedia('(min-width: 1024px)');
		const syncCanShowFloatingToc = () => {
			setCanShowFloatingToc(mediaQuery.matches);
		};

		syncCanShowFloatingToc();
		mediaQuery.addEventListener('change', syncCanShowFloatingToc);

		return () => {
			mediaQuery.removeEventListener('change', syncCanShowFloatingToc);
		};
	}, [enableFloatingToc]);

	useEffect(() => {
		if (!enableFloatingToc || !canShowFloatingToc || !contentElement) {
			setHeadings([]);
			setActiveId(null);
			setTocPinnedByKeyboard(false);
			return;
		}

		const anchorElement = getAnchorElement(contentElement) ?? contentElement;

		const syncHeadings = () => {
			const nextHeadings = collectHeadings(contentElement);
			setHeadings(nextHeadings);
			setActiveId(getActiveHeadingId(nextHeadings, window.scrollY));
		};

		syncHeadings();

		const mutationObserver = new MutationObserver(() => {
			window.requestAnimationFrame(syncHeadings);
		});

		mutationObserver.observe(contentElement, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		const resizeObserver = new ResizeObserver(() => {
			window.requestAnimationFrame(syncHeadings);
		});

		resizeObserver.observe(anchorElement);

		if (anchorElement.parentElement) {
			resizeObserver.observe(anchorElement.parentElement);
		}

		resizeObserver.observe(document.body);

		let frameId: number | null = null;

		const handleScroll = () => {
			if (frameId != null) {
				return;
			}

			frameId = window.requestAnimationFrame(() => {
				frameId = null;

				const nextHeadings = collectHeadings(contentElement);
				setHeadings(nextHeadings);
				setActiveId(getActiveHeadingId(nextHeadings, window.scrollY));
			});
		};

		const handleResize = () => {
			syncHeadings();
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		window.addEventListener('resize', handleResize);

		return () => {
			mutationObserver.disconnect();
			resizeObserver.disconnect();
			window.removeEventListener('scroll', handleScroll);
			window.removeEventListener('resize', handleResize);

			if (frameId != null) {
				window.cancelAnimationFrame(frameId);
			}
		};
	}, [canShowFloatingToc, contentElement, enableFloatingToc]);

	const tocItems = useMemo(
		() =>
			headings.map((heading) => ({
				...heading,
				indentClassName:
					heading.level === 1 ? '' : heading.level === 2 ? 'pl-3' : 'pl-6',
			})),
		[headings],
	);

	return (
		<div className={cn('relative w-full', className)}>
			{enableFloatingToc && canShowFloatingToc && tocItems.length > 0 ? (
				<div className="pointer-events-none sticky top-16 z-10 hidden h-0 w-full lg:block">
					<nav
						aria-label={t('markdown_toc_label')}
						className='group pointer-events-auto absolute top-0 right-0 w-fit'
						onBlur={(event) => {
							if (
								!event.currentTarget.contains(event.relatedTarget as Node | null)
							) {
								setTocPinnedByKeyboard(false);
							}
						}}>
						<div
							className={cn(
								'w-14 origin-right overflow-hidden rounded-lg bg-transparent px-3 py-3 opacity-100 backdrop-blur-3xl transition-[width,border-color,opacity] duration-300 ease-out',
								'pointer-events-auto group-hover:w-64 group-hover:border-border/60 max-h-130',
								tocPinnedByKeyboard && 'w-64 border-border/60',
							)}>
							<div className='flex max-h-full flex-col space-y-1 overflow-y-auto overflow-x-hidden'>
								{tocItems.map((heading) => {
									const isActive = heading.id === activeId;

									return (
										<button
											key={heading.id}
											type='button'
											onClick={() => {
												scrollToHeading(heading.id);

												if (document.activeElement instanceof HTMLElement) {
													document.activeElement.blur();
												}

												setTocPinnedByKeyboard(false);
											}}
											onFocus={() => setTocPinnedByKeyboard(true)}
											className={cn(
												'flex w-full items-center gap-3 rounded-full py-1.5 pr-2 text-left transition-colors',
												heading.indentClassName,
												isActive
													? 'text-foreground'
													: 'text-muted-foreground hover:text-foreground',
											)}>
											<span
												className={cn(
													'block h-[2px] shrink-0 rounded-full transition-all duration-200 ease-out',
													isActive
														? 'w-6 bg-foreground/90'
														: 'w-4 bg-foreground/35',
												)}
											/>

											<span
												className={cn(
													'line-clamp-1 min-w-0 flex-1 text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100',
													tocPinnedByKeyboard && 'opacity-100',
												)}>
												{heading.text}
											</span>

											<span className='sr-only'>
												{t('markdown_toc_jump_to_heading', {
													heading: heading.text,
												})}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</nav>
				</div>
			) : null}
			<div
				ref={setContentElement}
				className={cn('mx-auto min-w-0 max-w-[920px]', contentClassName)}>
				{children}
			</div>
		</div>
	);
};

export default MarkdownContentShell;
