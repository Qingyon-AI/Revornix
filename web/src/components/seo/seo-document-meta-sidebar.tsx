'use client';

import type { ComponentType, ReactNode } from 'react';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
	AlertCircle,
	ArrowRight,
	AudioLines,
	BookText,
	CalendarClock,
	CalendarDays,
	Expand,
	FileDown,
	Globe2,
	GitBranch,
	Tag,
	Users,
} from 'lucide-react';

import AudioPlayer from '@/components/ui/audio-player';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import NoticeBox from '@/components/ui/notice-box';
import { Separator } from '@/components/ui/separator';
import SidebarTaskNode from '@/components/ui/sidebar-task-node';
import DocumentGraphSEO from '@/components/document/document-graph-seo';
import { DocumentCategory } from '@/enums/document';
import type { GraphResponse } from '@/generated';
import {
	formatSeoDate,
	getPublicSectionHref,
	type PublicDocumentDetail,
	type PublicDocumentSectionInfo,
} from '@/lib/seo';
import { cn } from '@/lib/utils';
import { useRightSidebar } from '@/provider/right-sidebar-provider';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';

const SeoSidebarSection = ({
	title,
	description,
	children,
	className,
	separated = true,
}: {
	title?: string;
	description?: string;
	children: ReactNode;
	className?: string;
	separated?: boolean;
}) => {
	return (
		<section className={cn('space-y-4', className)}>
			{separated ? <Separator className='bg-border/50' /> : null}
			{title ? (
				<div className='min-w-0 space-y-1.5'>
					<h3 className='break-words text-[1.35rem] font-semibold tracking-tight [overflow-wrap:anywhere]'>
						{title}
					</h3>
					{description ? (
						<p className='break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]'>
							{description}
						</p>
					) : null}
				</div>
			) : null}
			{children}
		</section>
	);
};

const MetaBadge = ({ children }: { children: ReactNode }) => {
	return (
		<Badge
			variant='outline'
			className='rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-none'>
			{children}
		</Badge>
	);
};

const SeoMetaItem = ({
	icon: Icon,
	label,
	value,
	hint,
}: {
	icon: ComponentType<{ className?: string }>;
	label: string;
	value: ReactNode;
	hint?: string;
}) => {
	return (
		<div className='rounded-[22px] border border-border/40 bg-background/25 px-3 py-2.5'>
			<div className='flex items-start gap-3'>
				<div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-background/65 text-muted-foreground'>
					<Icon className='size-3.5' />
				</div>
				<div className='min-w-0 space-y-0.5'>
					<p className='text-[11px] leading-5 text-muted-foreground'>{label}</p>
					<div className='break-words text-sm font-medium text-foreground'>
						{value}
					</div>
					{hint ? (
						<p className='truncate text-[11px] leading-5 text-muted-foreground/85'>
							{hint}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
};

type SeoDocumentMetaSidebarProps = {
	document: PublicDocumentDetail;
	categoryLabel: string;
	locale: string;
	creatorAvatar: string;
	coverSrc: string | null;
	primaryAudioSrc: string | null;
	publicSections: PublicDocumentSectionInfo[];
	initialGraph?: GraphResponse;
	hasRenderableGraph: boolean;
	graphBadge: string;
	graphTone: 'default' | 'success' | 'warning' | 'danger';
	graphStale: boolean;
	className?: string;
};

export const SeoDocumentMetaSidebar = ({
	document,
	categoryLabel,
	locale,
	creatorAvatar,
	coverSrc,
	primaryAudioSrc,
	publicSections,
	initialGraph,
	hasRenderableGraph,
	graphBadge,
	graphTone,
	graphStale,
	className,
}: SeoDocumentMetaSidebarProps) => {
	const t = useTranslations();

	return (
		<div className={className ?? 'space-y-4 p-4 pb-8'}>
			<div className='space-y-4 px-1'>
				<div className='space-y-2'>
					<h2 className='break-words text-2xl font-semibold leading-9 tracking-tight [overflow-wrap:anywhere]'>
						{document.title || t('document_no_title')}
					</h2>
					<p className='break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]'>
						{document.description || t('document_no_description')}
					</p>
				</div>

				<Link
					href={`/user/${document.creator.id}`}
					className='group flex items-center gap-3 rounded-[24px] border border-border/40 bg-background/40 px-3 py-3 transition-colors hover:bg-background/65'>
					<Avatar className='size-10'>
						<AvatarImage
							src={creatorAvatar}
							alt={document.creator.nickname}
							className='object-cover'
						/>
						<AvatarFallback className='font-semibold'>
							{document.creator.nickname.slice(0, 1)}
						</AvatarFallback>
					</Avatar>
					<div className='min-w-0'>
						<p className='truncate text-sm font-medium transition-colors group-hover:text-foreground'>
							{document.creator.nickname}
						</p>
						<p className='truncate text-xs text-muted-foreground'>
							{t('seo_document_creator')}
						</p>
					</div>
				</Link>

				<div className='grid grid-cols-2 gap-3'>
					<SeoMetaItem
						icon={CalendarClock}
						label={t('seo_document_updated_at')}
						value={formatSeoDate(document.update_time, locale)}
					/>
					<SeoMetaItem
						icon={CalendarDays}
						label={t('seo_document_created_at')}
						value={formatSeoDate(document.create_time, locale)}
					/>
					<SeoMetaItem
						icon={Tag}
						label={t('document_category')}
						value={categoryLabel}
					/>
					<SeoMetaItem
						icon={Globe2}
						label={t('document_from_plat')}
						value={document.from_plat || '-'}
					/>
				</div>

				{document.labels && document.labels.length > 0 ? (
					<div className='flex flex-wrap gap-2'>
						{document.labels.map((label) => (
							<Badge
								key={label.id}
								variant='secondary'
								className='rounded-full bg-secondary/70 px-3 py-1 text-xs'>
								{label.name}
							</Badge>
						))}
					</div>
				) : null}
			</div>

			{primaryAudioSrc ? (
				<SeoSidebarSection>
					<SidebarTaskNode
						icon={AudioLines}
						status={t('document_podcast_status_success')}
						title={t('seo_document_audio')}
						description={document.title || t('document_no_title')}
						tone='success'
						result={
							<AudioPlayer
								src={primaryAudioSrc}
								title={document.title}
								artist={document.creator.nickname}
								cover={coverSrc ?? undefined}
								variant='compact'
								className='rounded-[20px] border border-border/35 bg-background/20'
							/>
						}
					/>
				</SeoSidebarSection>
			) : null}

			<SeoSidebarSection>
				<SidebarTaskNode
					icon={GitBranch}
					status={graphBadge}
					title={t('document_graph')}
					description={t('document_graph_description')}
					tone={graphTone}
					hint={graphStale ? t('document_graph_stale_hint') : undefined}
					result={
						hasRenderableGraph ? (
							<div className='relative aspect-square overflow-hidden rounded-[22px] border border-border/35 bg-background/22'>
								<DocumentGraphSEO
									document_id={document.id}
									hideStatePanels
									initialDocument={document}
									initialGraph={initialGraph}
									publicMode
								/>
								<Dialog>
									<DialogTrigger asChild>
										<Button
											size='icon'
											variant='outline'
											className='pointer-events-auto absolute right-3 top-3 z-20 size-8 shrink-0 rounded-2xl border-border/50 bg-background/80 shadow-none hover:bg-background'>
											<Expand className='size-4 text-muted-foreground' />
										</Button>
									</DialogTrigger>
									<DialogContent className='flex h-[70vh] min-h-[420px] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:h-[min(88vh,720px)] sm:min-h-[560px] sm:max-w-[min(1200px,92vw)]'>
										<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
											<DialogTitle>{t('document_graph')}</DialogTitle>
											<DialogDescription>
												{t('document_graph_description')}
											</DialogDescription>
											{graphStale ? (
												<div className='flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-800 dark:text-amber-200'>
													<AlertCircle className='mt-0.5 size-4 shrink-0' />
													<span>{t('document_graph_stale_hint')}</span>
												</div>
											) : null}
										</DialogHeader>
										<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
											<div className='h-full min-h-[320px] overflow-hidden rounded-2xl border border-border/40 bg-background/45 sm:min-h-[420px]'>
												<DocumentGraphSEO
													document_id={document.id}
													showSearch
													initialDocument={document}
													initialGraph={initialGraph}
													publicMode
												/>
											</div>
										</div>
									</DialogContent>
								</Dialog>
							</div>
						) : null
					}
				/>
			</SeoSidebarSection>

			<SeoSidebarSection title={t('seo_document_source')}>
				<div className='flex flex-col gap-4'>
					{document.from_plat ? (
						<p className='text-sm font-medium text-muted-foreground'>
							{document.from_plat}
						</p>
					) : null}
					{document.website_info?.url ? (
						<Link href={document.website_info.url} target='_blank'>
							<Button className='w-full rounded-full'>
								<Globe2 />
								{t('seo_document_open_source')}
							</Button>
						</Link>
					) : null}
					{document.file_info?.file_name ? (
						<Link href={document.file_info.file_name} target='_blank'>
							<Button variant='outline' className='w-full rounded-full'>
								<FileDown />
								{t('seo_document_download_file')}
							</Button>
						</Link>
					) : null}
					{!document.website_info?.url && !document.file_info?.file_name ? (
						<NoticeBox>
							{document.category === DocumentCategory.QUICK_NOTE
								? t('seo_document_source_quick_note')
								: t('seo_document_source_default')}
						</NoticeBox>
					) : null}
				</div>
			</SeoSidebarSection>

			<SeoSidebarSection title={t('seo_document_related_sections')}>
				<div className='space-y-3'>
					<p className='text-sm leading-7 text-muted-foreground'>
						{t('seo_document_related_sections_description')}
					</p>
					{publicSections.length > 0 ? (
						publicSections.map((section) => (
							<Link
								key={`${section.id}-${section.publish_uuid ?? 'private'}`}
								href={getPublicSectionHref(section)}
								className='flex items-center justify-between rounded-[22px] border border-border/35 bg-background/38 px-4 py-3 transition-colors hover:bg-background/62'>
								<div className='min-w-0'>
									<div className='line-clamp-1 font-medium'>
										{section.title}
									</div>
									<div className='line-clamp-2 text-sm text-muted-foreground'>
										{section.description || t('section_description_empty')}
									</div>
								</div>
								<ArrowRight className='ml-3 size-4 shrink-0 text-muted-foreground' />
							</Link>
						))
					) : (
						<NoticeBox>{t('seo_document_related_sections_empty')}</NoticeBox>
					)}
				</div>
			</SeoSidebarSection>

			<div className='space-y-4'>
				<Separator className='bg-border/50' />
				<div className='flex flex-col gap-3'>
				<Link href={`/user/${document.creator.id}`}>
					<Button
						variant='outline'
						className='flex w-full items-center justify-between rounded-full border-border/40 bg-background/50'>
						{t('seo_document_related_creator')}
						<Users />
					</Button>
				</Link>
				<Link href='/community'>
					<Button
						variant='outline'
						className='flex w-full items-center justify-between rounded-full border-border/40 bg-background/50'>
						{t('seo_document_back_to_community')}
						<BookText />
					</Button>
				</Link>
				</div>
			</div>
		</div>
	);
};

export const SeoDocumentSidebarBridge = (
	props: SeoDocumentMetaSidebarProps,
) => {
	const { setContent, clearContent } = useRightSidebar();

	useEffect(() => {
		setContent(<SeoDocumentMetaSidebar {...props} />);

		return () => {
			clearContent();
		};
	}, [
		clearContent,
		props.categoryLabel,
		props.coverSrc,
		props.creatorAvatar,
		props.document,
		props.graphBadge,
		props.graphStale,
		props.graphTone,
		props.hasRenderableGraph,
		props.initialGraph,
		props.locale,
		props.primaryAudioSrc,
		props.publicSections,
		setContent,
	]);

	return null;
};
