'use client';

import type { ComponentType, ReactNode } from 'react';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
	AlertCircle,
	AudioLines,
	BookOpenText,
	BookText,
	CalendarClock,
	CalendarDays,
	ChevronRight,
	Expand,
	GitBranch,
	Pause,
	Play,
	Sparkles,
	Users,
	type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import NoticeBox from '@/components/ui/notice-box';
import { Separator } from '@/components/ui/separator';
import SidebarTaskNode from '@/components/ui/sidebar-task-node';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import AudioPlayer from '@/components/ui/audio-player';
import SectionGraphSEO from '@/components/section/section-graph-seo';
import SectionDocumentsList from '@/components/section/section-documents-list';
import SeoSectionSubscribeButton from '@/components/seo/seo-section-subscribe-button';
import { SectionPodcastStatus } from '@/enums/section';
import type {
	GraphResponse,
	InifiniteScrollPagnitionSectionDocumentInfo,
	SectionInfo,
} from '@/generated';
import { formatAudioTime } from '@/lib/audio';
import { cn } from '@/lib/utils';
import { useRightSidebar } from '@/provider/right-sidebar-provider';
import { useRef, useState } from 'react';

const MetaBadge = ({ children }: { children: ReactNode }) => {
	return (
		<Badge
			variant='outline'
			className='rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-none'>
			{children}
		</Badge>
	);
};

const MetaItem = ({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon | ComponentType<{ className?: string }>;
	label: string;
	value: ReactNode;
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
				</div>
			</div>
		</div>
	);
};

const SidebarSection = ({
	title,
	description,
	children,
	action,
	className,
	separated = true,
}: {
	title?: string;
	description?: string;
	children: ReactNode;
	action?: ReactNode;
	className?: string;
	separated?: boolean;
}) => {
	return (
		<section className={cn('space-y-4', className)}>
			{separated ? <Separator className='bg-border/50' /> : null}
			{title ? (
				<div className='flex min-w-0 items-start justify-between gap-3'>
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
					{action ? <div className='shrink-0'>{action}</div> : null}
				</div>
			) : null}
			{children}
		</section>
	);
};

const PodcastPanel = ({
	status,
	podcastFileName,
	podcastScriptFileName,
	title,
	cover,
}: {
	status?: SectionPodcastStatus | number | null;
	podcastFileName?: string | null;
	podcastScriptFileName?: string | null;
	title?: string | null;
	cover?: string | null;
}) => {
	const t = useTranslations();

	if (status === SectionPodcastStatus.SUCCESS && podcastFileName) {
		return (
			<SidebarTaskNode
				icon={AudioLines}
				status={t('document_podcast_status_success')}
				title={t('section_podcast_ready')}
				description={t('section_podcast_placeholder_description')}
				tone='success'
				result={
					<div className='overflow-hidden rounded-[24px] border border-border/35 bg-background/22 p-4'>
						<AudioPlayer
							src={podcastFileName}
							scriptUrl={podcastScriptFileName ?? undefined}
							cover={
								cover ??
								'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
							}
							title={title ?? 'Unknown Title'}
							artist='AI Generated'
						/>
					</div>
				}
			/>
		);
	}

	if (status === SectionPodcastStatus.GENERATING) {
		return (
			<SidebarTaskNode
				icon={AudioLines}
				status={t('document_podcast_status_doing')}
				title={t('section_podcast_processing')}
				description={t('section_podcast_processing_description')}
				tone='default'
			/>
		);
	}

	if (status === SectionPodcastStatus.WAIT_TO) {
		return (
			<SidebarTaskNode
				icon={AudioLines}
				status={t('document_podcast_status_todo')}
				title={t('section_podcast_wait_to')}
				description={t('section_podcast_wait_to_description')}
				tone='warning'
			/>
		);
	}

	if (status === SectionPodcastStatus.FAILED) {
		return (
			<SidebarTaskNode
				icon={AudioLines}
				status={t('document_podcast_status_failed')}
				title={t('section_podcast_failed')}
				description={t('section_podcast_failed_description')}
				tone='danger'
			/>
		);
	}

	return (
		<SidebarTaskNode
			icon={AudioLines}
			status={t('document_podcast_status_todo')}
			title={t('section_podcast_unset')}
			description={t('section_podcast_placeholder_description')}
		/>
	);
};

type SeoSectionMetaSidebarProps = {
	section: SectionInfo;
	sectionTitle: string;
	sectionDescription: string;
	updatedAt: string;
	createdAt: string;
	creatorAvatar?: string;
	sectionCover?: string | null;
	initialDocuments?: InifiniteScrollPagnitionSectionDocumentInfo;
	initialGraph?: GraphResponse;
	hasRenderableGraph: boolean;
	graphBadge: string;
	graphTone: 'default' | 'success' | 'warning' | 'danger';
	graphStale: boolean;
};

export const SeoSectionMetaSidebar = ({
	section,
	sectionTitle,
	sectionDescription,
	updatedAt,
	createdAt,
	creatorAvatar,
	sectionCover,
	initialDocuments,
	initialGraph,
	hasRenderableGraph,
	graphBadge,
	graphTone,
	graphStale,
}: SeoSectionMetaSidebarProps) => {
	const t = useTranslations();

	return (
		<div className='space-y-4 p-4 pb-8'>
			<div className='space-y-4 px-1'>
				<div className='space-y-2'>
					<h2 className='break-words text-2xl font-semibold leading-9 tracking-tight [overflow-wrap:anywhere]'>
						{sectionTitle}
					</h2>
					<p className='break-words text-sm leading-7 text-muted-foreground [overflow-wrap:anywhere]'>
						{sectionDescription}
					</p>
				</div>

				{section.creator ? (
					<Link
						href={`/user/${section.creator.id}`}
						className='group flex items-center gap-3 rounded-[24px] border border-border/40 bg-background/40 px-3 py-3 transition-colors hover:bg-background/65'>
						<Avatar className='size-10'>
							<AvatarImage
								src={creatorAvatar}
								alt={section.creator.nickname}
								className='object-cover'
							/>
							<AvatarFallback className='font-semibold'>
								{section.creator.nickname.slice(0, 1)}
							</AvatarFallback>
						</Avatar>
						<div className='min-w-0 flex-1'>
							<p className='truncate text-sm font-medium transition-colors group-hover:text-foreground'>
								{section.creator.nickname}
							</p>
							<p className='truncate text-xs text-muted-foreground'>
								{t('section_creator')}
							</p>
						</div>
						<ChevronRight className='size-4 text-muted-foreground' />
					</Link>
				) : null}

				<div className='grid grid-cols-2 gap-3'>
					<MetaItem
						icon={BookOpenText}
						label={t('section_documents')}
						value={section.documents_count ?? 0}
					/>
					<MetaItem
						icon={Users}
						label={t('section_subscribers')}
						value={section.subscribers_count ?? 0}
					/>
					<MetaItem
						icon={CalendarClock}
						label={t('section_updated_at')}
						value={updatedAt}
					/>
					<MetaItem
						icon={CalendarDays}
						label={t('section_info_created_at')}
						value={createdAt}
					/>
				</div>

				<div className='space-y-3'>
					<NoticeBox tone='success' className='flex items-start gap-2 leading-6'>
						<Sparkles className='mt-0.5 size-4 shrink-0 text-emerald-500' />
						<span>{t('section_ai_tips')}</span>
					</NoticeBox>
					<div className='flex flex-wrap items-center gap-2'>
					{section.labels?.map((label) => (
						<Badge
							key={label.id}
							variant='secondary'
							className='rounded-full bg-secondary/70 px-3 py-1 text-xs'>
							{label.name}
						</Badge>
					))}
					</div>
				</div>

				{section.id ? (
					<SeoSectionSubscribeButton
						sectionId={section.id}
						creatorId={section.creator?.id}
						initialIsSubscribed={section.is_subscribed}
						className='w-full'
					/>
				) : null}
			</div>

			<SidebarSection>
				<PodcastPanel
					status={section.podcast_task?.status}
					podcastFileName={section.podcast_task?.podcast_file_name}
					podcastScriptFileName={
						section.podcast_task?.podcast_script_file_name
					}
					title={section.title}
					cover={sectionCover}
				/>
			</SidebarSection>

			<SidebarSection>
				<SidebarTaskNode
					icon={GitBranch}
					status={graphBadge}
					title={t('section_graph')}
					description={t('section_graph_description')}
					tone={graphTone}
					hint={graphStale ? t('section_graph_stale_hint') : undefined}
					result={
						hasRenderableGraph ? (
						<div className='relative aspect-square overflow-hidden rounded-[22px] border border-border/35 bg-background/22'>
							<SectionGraphSEO
								section_id={section.id}
								showStaleHint={false}
								initialSection={section}
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
										<DialogTitle>{t('section_graph')}</DialogTitle>
										<DialogDescription>
											{t('section_graph_description')}
										</DialogDescription>
										{graphStale ? (
											<div className='flex items-start gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm leading-6 text-amber-800 dark:text-amber-200'>
												<AlertCircle className='mt-0.5 size-4 shrink-0' />
												<span>{t('section_graph_stale_hint')}</span>
											</div>
										) : null}
									</DialogHeader>
									<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
										<div className='h-full min-h-[320px] overflow-hidden rounded-2xl border border-border/40 bg-background/45 sm:min-h-[420px]'>
											<SectionGraphSEO
												section_id={section.id}
												showSearch
												showStaleHint={false}
												initialSection={section}
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
			</SidebarSection>

			<SidebarSection
				title={t('section_documents')}
				description={t('section_documents_description')}>
				<div className='flex flex-col gap-3 xl:max-h-[300] xl:overflow-auto'>
					<SectionDocumentsList
						section_id={section.id}
						publicMode
						initialData={initialDocuments}
					/>
				</div>
			</SidebarSection>

			<SidebarSection
				title={t('seo_community_title')}
				description={t('seo_community_description')}>
				<div className='flex flex-col gap-3'>
					<Link href='/community'>
						<Button
							variant='outline'
							className='flex w-full items-center justify-between rounded-full border-border/40 bg-background/50'>
							{t('seo_user_back_to_community')}
							<BookText />
						</Button>
					</Link>
					{section.creator ? (
						<Link href={`/user/${section.creator.id}`}>
							<Button
								variant='outline'
								className='flex w-full items-center justify-between rounded-full border-border/40 bg-background/50'>
								{t('seo_document_related_creator')}
								<Users />
							</Button>
						</Link>
					) : null}
				</div>
			</SidebarSection>
		</div>
	);
};

export const SeoSectionSidebarBridge = (props: SeoSectionMetaSidebarProps) => {
	const { setContent, clearContent } = useRightSidebar();

	useEffect(() => {
		setContent(<SeoSectionMetaSidebar {...props} />);
		return () => clearContent();
	}, [
		clearContent,
		props.createdAt,
		props.creatorAvatar,
		props.hasRenderableGraph,
		props.graphBadge,
		props.graphStale,
		props.graphTone,
		props.initialDocuments,
		props.initialGraph,
		props.section,
		props.sectionCover,
		props.sectionDescription,
		props.sectionTitle,
		props.updatedAt,
		setContent,
	]);

	return null;
};
