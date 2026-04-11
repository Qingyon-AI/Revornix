'use client';

import WebsiteDocumentDetail from '@/components/document/website-document-detail';
import DocumentInfo from './document-info';
import { Card } from '@/components/ui/card';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	generateDocumentGraph,
	getDocumentDetail,
	readDocument,
} from '@/service/document';
import FileDocumentDetail from './file-document-detail';
import QuickDocumentDetail from './quick-note-document-detail';
import { useUserContext } from '@/provider/user-provider';
import { getQueryClient } from '@/lib/get-query-client';
import {
	DocumentDetailResponse,
	DocumentInfo as DocumentListItem,
	InifiniteScrollPagnitionDocumentInfo,
} from '@/generated';
import { useEffect, useRef, useState } from 'react';
import { DocumentCategory } from '@/enums/document';
import DocumentGraph from './document-graph';
import { Button } from '../ui/button';
import { Expand, Loader2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import AudioDocumentDetail from './audio-document-detail';
import DocumentPodcast from './document-podcast';
import DocumentAudio from './document-audio';
import DocumentOperate from './document-operate';
import { filterInfiniteQueryElements } from '@/lib/infinite-query-cache';
import { useSidebar } from '../ui/sidebar';
import { Skeleton } from '../ui/skeleton';
import { cn, replacePath } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { DocumentGraphStatus } from '@/enums/document';
import GraphTaskCard from '@/components/graph/graph-task-card';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import AIModelSelect from '@/components/ai/model-select';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';
import ImageWithFallback from '../ui/image-with-fallback';

const DocumentDetailSkeleton = () => {
	return (
		<div className='mx-auto flex h-full w-full max-w-[880px] flex-col gap-6'>
			<div className='flex flex-wrap gap-2'>
				<Skeleton className='h-7 w-20 rounded-full' />
				<Skeleton className='h-7 w-24 rounded-full' />
				<Skeleton className='h-7 w-16 rounded-full' />
			</div>
			<div className='space-y-3'>
				<Skeleton className='h-12 w-[72%] rounded-2xl sm:h-14' />
				<Skeleton className='h-5 w-[48%] rounded-full sm:w-[38%]' />
			</div>
			<Skeleton className='aspect-[16/7] w-full rounded-[28px]' />
			<div className='space-y-5 rounded-[28px] border border-border/60 bg-background/35 p-5 sm:p-6'>
				<div className='space-y-3'>
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-[90%] rounded-full' />
					<Skeleton className='h-5 w-[78%] rounded-full' />
				</div>
				<div className='space-y-3 pt-2'>
					<Skeleton className='h-8 w-40 rounded-2xl' />
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-[84%] rounded-full' />
				</div>
				<div className='space-y-3 pt-2'>
					<Skeleton className='h-8 w-32 rounded-2xl' />
					<Skeleton className='h-5 w-full rounded-full' />
					<Skeleton className='h-5 w-[92%] rounded-full' />
					<Skeleton className='h-5 w-[76%] rounded-full' />
				</div>
				<div className='rounded-[24px] border border-border/60 bg-background/45 px-4 py-3'>
					<Skeleton className='mx-auto h-4 w-56 rounded-full sm:w-72' />
				</div>
			</div>
		</div>
	);
};

const DocumentSidebarSkeleton = ({
	surfaceCardClassName,
}: {
	surfaceCardClassName: string;
}) => {
	return (
		<div className='space-y-5'>
			<Card
				className={`relative overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
				<div className='space-y-4 px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5'>
					<div className='space-y-3'>
						<Skeleton className='h-8 w-[72%] rounded-2xl' />
						<Skeleton className='h-4 w-full rounded-full' />
						<Skeleton className='h-4 w-5/6 rounded-full' />
					</div>
					<div className='flex flex-wrap gap-2'>
						<Skeleton className='h-7 w-20 rounded-full' />
						<Skeleton className='h-7 w-24 rounded-full' />
						<Skeleton className='h-7 w-16 rounded-full' />
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<Skeleton className='h-28 w-full rounded-[20px]' />
						<Skeleton className='h-28 w-full rounded-[20px]' />
						<Skeleton className='h-28 w-full rounded-[20px]' />
						<Skeleton className='h-28 w-full rounded-[20px]' />
					</div>
				</div>
			</Card>

			<Card className={`overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
				<div className='flex items-start justify-between gap-4 border-b border-border/60 px-4 pb-4 pt-4 sm:px-5 sm:pt-5'>
					<div className='space-y-2'>
						<Skeleton className='h-6 w-32 rounded-xl' />
						<Skeleton className='h-4 w-48 rounded-full' />
					</div>
					<Skeleton className='size-10 rounded-2xl' />
				</div>

				<div className='px-4 pb-4 pt-4 sm:px-5 sm:pb-5'>
					<Skeleton className='h-[300px] w-full rounded-[24px]' />
				</div>
			</Card>

			<Card
				className={`overflow-hidden gap-0 rounded-[26px] border border-border/60 py-0 ${surfaceCardClassName}`}>
				<div className='space-y-4 p-4'>
					<div className='flex items-center gap-3'>
						<Skeleton className='size-12 rounded-2xl' />
						<div className='min-w-0 flex-1 space-y-2'>
							<Skeleton className='h-5 w-32 rounded-full' />
							<Skeleton className='h-4 w-24 rounded-full' />
						</div>
					</div>
					<Skeleton className='h-24 w-full rounded-[22px]' />
					<div className='flex gap-2'>
						<Skeleton className='h-9 flex-1 rounded-full' />
						<Skeleton className='h-9 w-24 rounded-full' />
					</div>
				</div>
			</Card>
		</div>
	);
};

const DocumentContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const { state: sidebarState } = useSidebar();
	const isCompactViewport = useIsMobile(1280);
	const mainColumnRef = useRef<HTMLDivElement | null>(null);
	const [dockBounds, setDockBounds] = useState({
		left: 0,
		width: 0,
	});
	const [selectedGraphModelId, setSelectedGraphModelId] = useState<number | null>(
		mainUserInfo?.default_document_reader_model_id ?? null,
	);
	const [isGraphGenerateDialogOpen, setIsGraphGenerateDialogOpen] = useState(false);
	const [hasRenderableGraph, setHasRenderableGraph] = useState(false);
	const mainCardMinHeightClassName =
		'min-h-[calc(100dvh-7rem)] sm:min-h-[calc(100dvh-7.25rem)]';
	const surfaceCardClassName =
		'rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur';
	const mainSurfaceClassName = cn(
		`bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_26%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_24%)] ${surfaceCardClassName}`,
	);
	const mainContentClassName = cn(mainCardMinHeightClassName, 'p-4 sm:p-5 lg:p-6');
	const userUnreadDocumentQueryKey = [
		'searchUserUnreadDocument',
		mainUserInfo?.id,
	] as const;
	const userRecentReadDocumentQueryKey = [
		'searchUserRecentReadDocument',
		mainUserInfo?.id,
	] as const;

	const {
		data: document,
		isPending,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});
	const documentCoverSrc =
		document?.cover && document.creator
			? replacePath(document.cover, document.creator.id)
			: null;
	const freshnessState = getDocumentFreshnessState(document);
	const graphCardState =
		freshnessState.graphStale &&
		document?.graph_task?.status === DocumentGraphStatus.SUCCESS
			? {
					badge: t('document_status_stale'),
					tone: 'warning' as const,
				}
			: document?.graph_task?.status === DocumentGraphStatus.SUCCESS
			? {
					badge: t('document_graph_status_success'),
					tone: 'success' as const,
				}
			: document?.graph_task?.status === DocumentGraphStatus.FAILED
				? {
						badge: t('document_graph_status_failed'),
						tone: 'danger' as const,
					}
				: document?.graph_task?.status === DocumentGraphStatus.BUILDING
					? {
							badge: t('document_graph_status_doing'),
							tone: 'default' as const,
						}
					: {
							badge: t('document_graph_status_todo'),
							tone: 'warning' as const,
						};
	const graphActionLabel = document?.graph_task
		? t('document_graph_regenerate')
		: t('document_graph_generate');

	useEffect(() => {
		setSelectedGraphModelId(
			mainUserInfo?.default_document_reader_model_id ?? null,
		);
	}, [mainUserInfo?.default_document_reader_model_id]);

	const resolveGraphGenerateErrorMessage = (message: string | undefined) => {
		if (!message) {
			return t('document_graph_generate_failed_default');
		}
		if (
			message.includes('Paid subscription or available compute points required.')
		) {
			return t('document_graph_generate_failed_access');
		}
		if (message.includes('Official LLM quota exceeded')) {
			return t('document_graph_generate_failed_quota');
		}
		return message;
	};

	const mutateGenerateDocumentGraph = useMutation({
		mutationFn: () =>
			generateDocumentGraph({
				document_id: id,
				model_id: selectedGraphModelId ?? undefined,
			}),
		onSuccess() {
			setIsGraphGenerateDialogOpen(false);
			toast.success(t('document_graph_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', id],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserInfo'],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserComputeLedger'],
			});
		},
		onError(mutationError) {
			toast.error(resolveGraphGenerateErrorMessage(mutationError.message));
			console.error(mutationError);
		},
	});

	const mutateRead = useMutation({
		mutationFn: () =>
			readDocument({
				document_id: id,
				status: true,
			}),
		onMutate: async () => {
			await queryClient.cancelQueries({
				queryKey: ['getDocumentDetail', id],
			});
			const previousDocument = queryClient.getQueryData<DocumentDetailResponse>(
				['getDocumentDetail', id],
			);
			queryClient.setQueryData(
				['getDocumentDetail', id],
				(old: DocumentDetailResponse) => ({
					...old,
					is_read: true,
				}),
			);
			return { previousDocument };
		},
		onError: (error, variables, context) => {
			context &&
				queryClient.setQueryData(
					['getDocumentDetail', id],
					context.previousDocument,
				);
		},
		onSuccess: () => {
			filterInfiniteQueryElements<
				InifiniteScrollPagnitionDocumentInfo,
				DocumentListItem
			>(queryClient, userUnreadDocumentQueryKey, (item) => item.id !== id);
			queryClient.invalidateQueries({
				queryKey: userUnreadDocumentQueryKey,
				exact: true,
			});
			queryClient.invalidateQueries({
				queryKey: userRecentReadDocumentQueryKey,
				exact: true,
			});
		},
	});

	useEffect(() => {
		if (!document || document.is_read || !mainUserInfo) return;
		if (mainUserInfo?.default_read_mark_reason === 0) {
			mutateRead.mutate();
		}
	}, [document?.id, mainUserInfo]); // 注意此处依赖必须是document?.id，而不是document本身，因为有其他部分代码会修改document的状态，导致useEffect再次执行

	const handleFinishRead = () => {
		if (!document || document.is_read) return;
		if (mainUserInfo?.default_read_mark_reason === 1) {
			mutateRead.mutate();
		}
	};

	useEffect(() => {
		let animationFrameId: number | null = null;
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const updateDockBounds = () => {
			if (!mainColumnRef.current) {
				return;
			}

			const rect = mainColumnRef.current.getBoundingClientRect();
			setDockBounds((currentBounds) => {
				if (
					Math.abs(currentBounds.left - rect.left) < 0.5 &&
					Math.abs(currentBounds.width - rect.width) < 0.5
				) {
					return currentBounds;
				}

				return {
					left: rect.left,
					width: rect.width,
				};
			});
		};

		const syncDockBoundsDuringTransition = (duration = 260) => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}

			const startedAt = performance.now();

			const tick = () => {
				updateDockBounds();

				if (performance.now() - startedAt < duration) {
					animationFrameId = requestAnimationFrame(tick);
					return;
				}

				animationFrameId = null;
			};

			animationFrameId = requestAnimationFrame(tick);
			timeoutId = setTimeout(() => {
				updateDockBounds();
			}, duration);
		};

		updateDockBounds();
		syncDockBoundsDuringTransition();

		const resizeObserver = new ResizeObserver(() => {
			updateDockBounds();
		});

		if (mainColumnRef.current) {
			resizeObserver.observe(mainColumnRef.current);
		}

		window.addEventListener('resize', updateDockBounds);

		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
			}
			if (timeoutId !== null) {
				clearTimeout(timeoutId);
			}
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateDockBounds);
		};
	}, [isCompactViewport, sidebarState, document?.id]);

	return (
		<>
		<div className='relative'>
			<div className='mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pb-6 pt-0 sm:px-5 lg:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,392px)] xl:items-start'>
				<div ref={mainColumnRef} className='relative min-w-0'>
					<div className={mainSurfaceClassName}>
						<div className={mainContentClassName}>
							{isPending && !document && !isError && <DocumentDetailSkeleton />}
							{isError && (
								<div className='flex min-h-[60vh] w-full items-center justify-center px-6 text-center text-sm text-muted-foreground'>
									{error.message}
								</div>
							)}
							{documentCoverSrc ? (
								<div className='mx-auto mb-6 w-full max-w-[880px] overflow-hidden rounded-[28px] border border-border/60 bg-background/45 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.48)]'>
									<div className='relative'>
										<ImageWithFallback
											src={documentCoverSrc}
											alt={document?.title || t('document_no_title')}
											className='max-h-[320px] w-full object-cover sm:max-h-[380px]'
											fallbackClassName='max-h-[320px] w-full sm:max-h-[380px]'
											fallbackSvgClassName='max-w-[240px] p-6'
										/>
										<div className='absolute inset-0 bg-gradient-to-t from-background/28 via-transparent to-transparent' />
									</div>
								</div>
							) : null}
							{document?.category === DocumentCategory.WEBSITE && (
								<WebsiteDocumentDetail
									onFinishRead={handleFinishRead}
									id={id}
								/>
							)}
							{document?.category === DocumentCategory.FILE && (
								<FileDocumentDetail onFinishRead={handleFinishRead} id={id} />
							)}
							{document?.category === DocumentCategory.QUICK_NOTE && (
								<QuickDocumentDetail onFinishRead={handleFinishRead} id={id} />
							)}
							{document?.category === DocumentCategory.AUDIO && (
								<AudioDocumentDetail onFinishRead={handleFinishRead} id={id} />
							)}
						</div>
					</div>
				</div>

				{!isCompactViewport ? (
					<div className='relative min-w-0 space-y-5 xl:sticky xl:top-0'>
						{isPending && !document && !isError ? (
							<DocumentSidebarSkeleton
								surfaceCardClassName={surfaceCardClassName}
							/>
						) : (
							<>
								<Card
									className={`relative overflow-hidden gap-0 py-0 ${surfaceCardClassName}`}>
									<DocumentInfo id={id} />
								</Card>
								<div className='hidden'>
									<DocumentGraph
										document_id={id}
										hideStatePanels
										onHasRenderableGraphChange={setHasRenderableGraph}
									/>
								</div>

								<GraphTaskCard
									title={t('document_graph')}
									description={t('document_graph_description')}
									badge={graphCardState.badge}
									hint={
										freshnessState.graphStale
											? t('document_graph_stale_hint')
											: undefined
									}
									tone={graphCardState.tone}
									action={
										<Button
											variant='outline'
											className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
											onClick={() => setIsGraphGenerateDialogOpen(true)}
											disabled={
												document?.graph_task?.status ===
													DocumentGraphStatus.BUILDING ||
												mutateGenerateDocumentGraph.isPending
											}>
											{document?.graph_task?.status ===
												DocumentGraphStatus.BUILDING ||
											mutateGenerateDocumentGraph.isPending ? (
												<Loader2 className='size-4 animate-spin' />
											) : null}
											{graphActionLabel}
										</Button>
									}>
									{hasRenderableGraph ? (
										<div className='relative h-[300px] overflow-hidden rounded-[20px] border border-border/60 bg-background/35'>
											<DocumentGraph document_id={id} hideStatePanels />
											<Dialog>
												<DialogTrigger asChild>
													<Button
														className='pointer-events-auto absolute right-3 top-3 z-20 size-8 shrink-0 rounded-2xl border-border/70 bg-background/80 shadow-none hover:bg-background'
														size='icon'
														variant='outline'>
														<Expand
															size={4}
															className='text-muted-foreground'
														/>
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
														<div className='min-h-[360px] h-full overflow-hidden rounded-2xl border border-border/60 bg-background/45'>
															<DocumentGraph document_id={id} showSearch />
														</div>
													</div>
												</DialogContent>
											</Dialog>
										</div>
									) : null}
								</GraphTaskCard>

								{document && document?.category !== DocumentCategory.AUDIO && (
									<DocumentPodcast
										document_id={id}
										className={surfaceCardClassName}
									/>
								)}
								{document && document?.category === DocumentCategory.AUDIO && (
									<DocumentAudio
										document_id={id}
										className={surfaceCardClassName}
									/>
								)}
							</>
						)}
					</div>
				) : null}
			</div>

			{document && isCompactViewport ? (
				<div className='pointer-events-none fixed bottom-4 right-4 z-40'>
					<div className='pointer-events-auto'>
						<DocumentOperate id={id} />
					</div>
				</div>
			) : null}

			{document && !isCompactViewport && dockBounds.width > 0 ? (
				<div
					className='pointer-events-none fixed bottom-4 z-40 sm:bottom-8'
					style={{
						left: `${dockBounds.left}px`,
						width: `${dockBounds.width}px`,
					}}>
					<div className='px-4 sm:px-5 lg:px-6'>
						<div className='pointer-events-auto mx-auto w-full'>
							<DocumentOperate id={id} />
						</div>
					</div>
				</div>
			) : null}
		</div>
		<ResourceConfirmDialog
			open={isGraphGenerateDialogOpen}
			onOpenChange={setIsGraphGenerateDialogOpen}
			title={graphActionLabel}
			description={t('resource_dialog_graph_description')}
			confirmLabel={graphActionLabel}
			confirmDisabled={!selectedGraphModelId}
			confirmLoading={mutateGenerateDocumentGraph.isPending}
			onConfirm={() => {
				mutateGenerateDocumentGraph.mutate();
			}}>
			<div className='space-y-2'>
				<p className='text-sm font-medium text-foreground'>{t('use_model')}</p>
				<AIModelSelect
					value={selectedGraphModelId}
					onChange={setSelectedGraphModelId}
					className='w-full'
					placeholder={t('setting_default_model_choose')}
				/>
			</div>
		</ResourceConfirmDialog>
		</>
	);
};

export default DocumentContainer;
