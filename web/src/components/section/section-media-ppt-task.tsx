'use client';

import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Presentation } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { SectionDetailWithPpt } from '@/service/section';

import { Button } from '../ui/button';
import ImagePreview from '../ui/image-preview';
import SidebarTaskNode from '../ui/sidebar-task-node';

type SectionMediaPptTaskProps = {
	section: SectionDetailWithPpt;
	isOwner: boolean;
	ownershipResolved: boolean;
	canGeneratePpt: boolean;
	pptHint?: ReactNode;
	pptStale: boolean;
	onOpenDialog: () => void;
};

const SectionMediaPptTask = ({
	section,
	isOwner,
	ownershipResolved,
	canGeneratePpt,
	pptHint,
	pptStale,
	onOpenDialog,
}: SectionMediaPptTaskProps) => {
	const t = useTranslations();
	const [pptSlideIndex, setPptSlideIndex] = useState(0);
	const pptPreview = section.ppt_preview;
	const pptSlides = pptPreview?.slides ?? [];
	const readyPptSlides = pptSlides.filter((slide) => Boolean(slide.image_url));
	const displayPptSlides = readyPptSlides.length > 0 ? readyPptSlides : pptSlides;
	const currentPptSlide =
		displayPptSlides.length > 0
			? displayPptSlides[Math.min(pptSlideIndex, displayPptSlides.length - 1)]
			: null;

	useEffect(() => {
		if (displayPptSlides.length === 0) {
			if (pptSlideIndex !== 0) {
				setPptSlideIndex(0);
			}
			return;
		}
		if (pptSlideIndex > displayPptSlides.length - 1) {
			setPptSlideIndex(displayPptSlides.length - 1);
		}
	}, [displayPptSlides.length, pptSlideIndex]);

	if (ownershipResolved && !isOwner && !pptPreview) {
		return (
			<SidebarTaskNode
				icon={Presentation}
				status={t('section_ppt_status_idle')}
				title={t('section_ppt_user_unable')}
				description={t('section_ppt_placeholder_description')}
				tone='default'
			/>
		);
	}

	if (isOwner && !pptPreview) {
		return (
			<SidebarTaskNode
				icon={Presentation}
				status={t('section_ppt_status_idle')}
				title={t('section_ppt_ready_to_generate')}
				description={t('section_ppt_placeholder_description')}
				tone={canGeneratePpt ? 'warning' : 'danger'}
				hint={pptHint}
				action={
					<Button
						variant='outline'
						className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
						onClick={onOpenDialog}
						disabled={false}>
						{t('section_ppt_generate')}
					</Button>
				}
			/>
		);
	}

	if (pptPreview?.status === 'processing' || pptPreview?.status === 'wait_to') {
		return (
			<SidebarTaskNode
				icon={Loader2}
				iconClassName='animate-spin'
				status={
					pptPreview.status === 'wait_to'
						? t('section_ppt_status_idle')
						: t('section_ppt_status_processing')
				}
				title={
					pptPreview.status === 'wait_to'
						? t('section_ppt_waiting')
						: t('section_ppt_processing')
				}
				description={
					pptPreview.status === 'wait_to'
						? t('section_ppt_waiting_description')
						: t('section_ppt_processing_description')
				}
				tone='default'
				hint={pptHint}
				result={
					currentPptSlide ? (
						<div className='space-y-3'>
							<div className='overflow-hidden rounded-[20px] border border-border/35 bg-background/20'>
								{currentPptSlide.image_url ? (
									<ImagePreview
										src={currentPptSlide.image_url}
										alt={currentPptSlide.title}
										imageClassName='aspect-video w-full object-cover'
									/>
								) : (
									<div className='flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.05),rgba(15,23,42,0.12))] px-6 text-center text-sm leading-7 text-muted-foreground'>
										{t('section_ppt_slide_generating')}
									</div>
								)}
							</div>
							<div className='flex items-center justify-between gap-3'>
								<div className='min-w-0'>
									<p className='truncate text-sm font-semibold text-foreground'>
										{currentPptSlide.title}
									</p>
									<p className='truncate text-xs text-muted-foreground'>
										{t('section_ppt_slide_count', {
											current: Math.min(
												pptSlideIndex + 1,
												displayPptSlides.length,
											),
											total: displayPptSlides.length,
										})}
									</p>
								</div>
							</div>
						</div>
					) : null
				}
			/>
		);
	}

	if (pptPreview?.status === 'success') {
		return (
			<SidebarTaskNode
				icon={Presentation}
				status={pptStale ? t('document_status_stale') : t('section_ppt_status_success')}
				title={pptPreview.title || t('section_ppt_preview_title')}
				description={pptPreview.subtitle || t('section_ppt_preview_description')}
				tone={pptStale ? 'warning' : 'success'}
				hint={pptHint}
				action={
					<>
						{pptPreview.pptx_url ? (
							<Button
								asChild
								variant='outline'
								className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'>
								<a href={pptPreview.pptx_url} target='_blank' rel='noreferrer'>
									{t('section_ppt_download')}
								</a>
							</Button>
						) : null}
						{isOwner ? (
							<Button
								variant='outline'
								className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
								onClick={onOpenDialog}
								disabled={false}>
								{t('section_ppt_regenerate')}
							</Button>
						) : null}
					</>
				}
				result={
					currentPptSlide ? (
						<div className='space-y-3'>
							<div className='overflow-hidden rounded-[20px] border border-border/35 bg-background/20'>
								{currentPptSlide.image_url ? (
									<ImagePreview
										src={currentPptSlide.image_url}
										alt={currentPptSlide.title}
										imageClassName='aspect-video w-full object-cover'
									/>
								) : null}
							</div>
							<div className='flex items-center gap-2'>
								<Button
									type='button'
									size='icon'
									variant='outline'
									className='size-8 rounded-full'
									onClick={() =>
										setPptSlideIndex((current) => Math.max(0, current - 1))
									}
									disabled={pptSlideIndex <= 0}>
									<ChevronLeft className='size-4' />
								</Button>
								<div className='min-w-0 flex-1'>
									<p className='truncate text-sm font-semibold text-foreground'>
										{currentPptSlide.title}
									</p>
									<p className='line-clamp-2 text-xs leading-5 text-muted-foreground'>
										{currentPptSlide.summary}
									</p>
								</div>
								<p className='shrink-0 text-xs text-muted-foreground'>
									{t('section_ppt_slide_count', {
										current: pptSlideIndex + 1,
										total: displayPptSlides.length,
									})}
								</p>
								<Button
									type='button'
									size='icon'
									variant='outline'
									className='size-8 rounded-full'
									onClick={() =>
										setPptSlideIndex((current) =>
											Math.min(displayPptSlides.length - 1, current + 1),
										)
									}
									disabled={pptSlideIndex >= displayPptSlides.length - 1}>
									<ChevronRight className='size-4' />
								</Button>
							</div>
							{displayPptSlides.length > 1 ? (
								<div className='flex flex-wrap gap-2'>
									{displayPptSlides.map((slide, index) => (
										<button
											key={slide.id}
											type='button'
											onClick={() => setPptSlideIndex(index)}
											className={`min-w-0 rounded-full border px-3 py-1 text-xs transition-colors ${
												index === pptSlideIndex
													? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
													: 'border-border/60 bg-background/55 text-muted-foreground hover:bg-background'
											}`}>
											<span className='truncate'>
												{index + 1}. {slide.title}
											</span>
										</button>
									))}
								</div>
							) : null}
						</div>
					) : null
				}
			/>
		);
	}

	if (pptPreview?.status === 'failed') {
		return (
			<SidebarTaskNode
				icon={Presentation}
				status={t('section_ppt_status_failed')}
				title={t('section_ppt_failed')}
				description={pptPreview.error_message || t('section_ppt_failed_description')}
				tone='danger'
				hint={pptHint}
				action={
					isOwner ? (
						<Button
							variant='outline'
							className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
							onClick={onOpenDialog}
							disabled={false}>
							{t('section_ppt_regenerate')}
						</Button>
					) : undefined
				}
			/>
		);
	}

	return null;
};

export default SectionMediaPptTask;
