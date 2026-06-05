'use client';

import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { Expand, GitBranch, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { DocumentCategory, DocumentGraphStatus } from '@/enums/document';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import DocumentAudio from './document-audio';
import DocumentGraph from './document-graph';
import DocumentInfo from './document-info';
import DocumentMeetingInsights from './document-meeting-insights';
import DocumentPodcast from './document-podcast';
import SidebarTaskNode from '@/components/ui/sidebar-task-node';
import JoinRequestsCard from '@/components/permission/join-requests-card';
import { AccessRequestTargetType } from '@/service/access-request';

const SidebarSection = ({
	title,
	description,
	children,
	action,
	separated = true,
}: {
	title?: string;
	description?: string;
	children: ReactNode;
	action?: ReactNode;
	separated?: boolean;
}) => {
	return (
		<section className='space-y-4'>
			{separated ? <Separator className='bg-border/50' /> : null}
			{title ? (
				<div className='flex items-start justify-between gap-3'>
					<div className='space-y-1.5'>
						<h3 className='text-[1.35rem] font-semibold tracking-tight'>{title}</h3>
						{description ? (
							<p className='text-sm leading-7 text-muted-foreground'>
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

const DocumentSidebarSkeleton = () => {
	return (
		<div className='space-y-4'>
			<section className='space-y-4'>
				<div className='space-y-4'>
					<div className='space-y-2'>
						<Skeleton className='h-9 w-[78%] rounded-xl' />
						<Skeleton className='h-4 w-full rounded-full' />
						<Skeleton className='h-4 w-[84%] rounded-full' />
					</div>
					<div className='flex items-center gap-3 border-b border-border/40 px-1 pb-4'>
						<Skeleton className='size-10 rounded-full' />
						<div className='min-w-0 flex-1 space-y-2'>
							<Skeleton className='h-4 w-28 rounded-full' />
							<Skeleton className='h-3 w-24 rounded-full' />
						</div>
					</div>
				</div>

				<div className='space-y-3 border-t border-border/50 pt-5'>
					<div className='flex items-center gap-2'>
						<Skeleton className='size-3.5 rounded' />
						<Skeleton className='h-3.5 w-28 rounded-full' />
					</div>
					<div className='flex flex-wrap gap-2'>
						<Skeleton className='h-8 w-28 rounded-full' />
						<Skeleton className='h-8 w-24 rounded-full' />
					</div>
				</div>

				<div className='grid grid-cols-2 gap-x-5 gap-y-1'>
					{Array.from({ length: 4 }).map((_, index) => (
						<div key={index} className='px-1 py-3'>
							<div className='flex items-start gap-2.5'>
								<Skeleton className='size-6 shrink-0 rounded-lg' />
								<div className='min-w-0 flex-1 space-y-1.5'>
									<Skeleton className='h-3 w-16 rounded-full' />
									<Skeleton className='h-4 w-24 rounded-full' />
									<Skeleton className='h-3 w-28 rounded-full' />
								</div>
							</div>
						</div>
					))}
				</div>

				<div className='flex flex-wrap gap-1.5'>
					<Skeleton className='h-7 w-20 rounded-full' />
					<Skeleton className='h-7 w-24 rounded-full' />
					<Skeleton className='h-7 w-16 rounded-full' />
				</div>

				<div className='flex flex-wrap gap-2'>
					<Skeleton className='h-9 w-32 rounded-full' />
					<Skeleton className='h-9 w-36 rounded-full' />
				</div>

				<div className='space-y-4 border-t border-border/50 pt-5'>
					<div className='border-l-0 p-0'>
						<div className='flex items-start gap-3'>
							<Skeleton className='size-10 rounded-xl' />
							<div className='min-w-0 flex-1 space-y-2'>
								<Skeleton className='h-4 w-24 rounded-full' />
								<Skeleton className='h-5 w-40 rounded-full' />
								<Skeleton className='h-4 w-full rounded-full' />
								<Skeleton className='h-4 w-4/5 rounded-full' />
							</div>
							<Skeleton className='h-8 w-20 rounded-full' />
						</div>
					</div>
				</div>
			</section>

			<section className='space-y-4'>
				<Separator className='bg-border/50' />
				<div>
					<div className='flex items-start gap-3'>
						<Skeleton className='size-10 rounded-xl' />
						<div className='min-w-0 flex-1 space-y-2'>
							<Skeleton className='h-4 w-24 rounded-full' />
							<Skeleton className='h-5 w-36 rounded-full' />
							<Skeleton className='h-4 w-4/5 rounded-full' />
						</div>
					</div>
				</div>
			</section>

			<section className='space-y-4'>
				<Separator className='bg-border/50' />
				<div>
					<div className='flex items-start gap-3'>
						<Skeleton className='size-10 rounded-xl' />
						<div className='min-w-0 flex-1 space-y-2'>
							<Skeleton className='h-4 w-24 rounded-full' />
							<Skeleton className='h-5 w-32 rounded-full' />
							<Skeleton className='h-4 w-full rounded-full' />
						</div>
						<Skeleton className='h-8 w-20 rounded-full' />
					</div>
				</div>
			</section>
		</div>
	);
};

type DocumentDetailSidebarProps = {
	id: number;
	isPending: boolean;
	hasDocument: boolean;
	hasRenderableGraph: boolean;
	graphBadge: string;
	graphTone: 'default' | 'success' | 'warning' | 'danger';
	graphStale: boolean;
	graphActionLabel: string;
	graphGenerating: boolean;
	graphCancelling: boolean;
	documentCategory?: DocumentCategory;
	graphStatus?: DocumentGraphStatus;
	canManageAccessRequests?: boolean;
	canWriteDocument?: boolean;
	onGraphGenerate: () => void;
	onGraphCancel: () => void;
};

const DocumentDetailSidebar = ({
	id,
	isPending,
	hasDocument,
	hasRenderableGraph,
	graphBadge,
	graphTone,
	graphStale,
	graphActionLabel,
	graphGenerating,
	graphCancelling,
	documentCategory,
	graphStatus,
	canManageAccessRequests = false,
	canWriteDocument = false,
	onGraphGenerate,
	onGraphCancel,
}: DocumentDetailSidebarProps) => {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const accessRequestIdParam = searchParams.get('access_request_id');
	const accessRequestId = accessRequestIdParam
		? Number(accessRequestIdParam)
		: null;
	const autoOpenRequestId =
		accessRequestId && Number.isFinite(accessRequestId) && accessRequestId > 0
			? accessRequestId
			: null;
	const clearAccessRequestParam = useCallback(() => {
		const nextParams = new URLSearchParams(searchParams.toString());
		nextParams.delete('access_request_id');
		const nextQuery = nextParams.toString();
		router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
			scroll: false,
		});
	}, [pathname, router, searchParams]);

	return (
		<div className='space-y-4 p-3 pb-6'>
			{isPending && !hasDocument ? (
				<DocumentSidebarSkeleton />
			) : (
				<>
					<SidebarSection separated={false}>
						<DocumentInfo
							id={id}
							afterCreator={
								canManageAccessRequests ? (
									<JoinRequestsCard
										targetType={AccessRequestTargetType.DOCUMENT}
										targetId={id}
										canManage
										autoOpenRequestId={autoOpenRequestId}
										onAutoOpenConsumed={clearAccessRequestParam}
									/>
								) : undefined
							}
						/>
					</SidebarSection>

					<SidebarSection>
						{documentCategory === DocumentCategory.AUDIO ? (
							<div className='space-y-4'>
								<DocumentAudio document_id={id} />
								<DocumentMeetingInsights document_id={id} />
							</div>
						) : (
							<DocumentPodcast document_id={id} />
						)}
					</SidebarSection>

					<SidebarSection>
						<SidebarTaskNode
							icon={GitBranch}
							status={graphBadge}
							title={t('document_graph')}
							description={t('document_graph_description')}
							tone={graphTone}
							hint={graphStale ? t('document_graph_stale_hint') : undefined}
							action={
								canWriteDocument ? (
								<div className='flex items-center gap-2'>
									<Button
										variant='outline'
										className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
										onClick={
											graphStatus === DocumentGraphStatus.BUILDING ||
											graphStatus === DocumentGraphStatus.WAIT_TO
												? onGraphCancel
												: onGraphGenerate
										}
										disabled={
											graphStatus === DocumentGraphStatus.BUILDING ||
											graphStatus === DocumentGraphStatus.WAIT_TO
												? graphCancelling
												: graphGenerating
										}>
										{graphStatus === DocumentGraphStatus.BUILDING ||
										graphGenerating ||
										graphCancelling ? (
											<Loader2 className='size-4 animate-spin' />
										) : null}
										{graphStatus === DocumentGraphStatus.BUILDING ||
										graphStatus === DocumentGraphStatus.WAIT_TO
											? t('cancel')
											: graphActionLabel}
									</Button>
								</div>
								) : undefined
							}
							result={
								hasRenderableGraph ? (
									<div className='relative aspect-square overflow-hidden rounded-xl border border-border/35'>
											<DocumentGraph document_id={id} hideStatePanels />
											<Dialog>
												<DialogTrigger asChild>
													<Button
														className='pointer-events-auto absolute right-3 top-3 z-20 size-8 shrink-0 rounded-xl border-border/70 bg-background/80 shadow-none hover:bg-background'
														size='icon'
														variant='outline'>
														<Expand size={4} className='text-muted-foreground' />
													</Button>
												</DialogTrigger>
												<DialogContent className='flex h-[82vh] w-[min(1440px,96vw)] max-w-[min(1440px,96vw)] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-[min(1440px,96vw)]'>
													<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
														<DialogTitle>{t('document_graph')}</DialogTitle>
														<DialogDescription>
															{t('document_graph_description')}
														</DialogDescription>
													</DialogHeader>
													<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
														<div className='h-full min-h-[360px] overflow-hidden rounded-2xl border border-border/60 bg-background/45'>
															<DocumentGraph document_id={id} showSearch />
														</div>
													</div>
												</DialogContent>
											</Dialog>
									</div>
								) : null
							}
						/>
					</SidebarSection>
				</>
			)}
		</div>
	);
};

export default DocumentDetailSidebar;
