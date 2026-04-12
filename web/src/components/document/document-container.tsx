'use client';

import WebsiteDocumentDetail from '@/components/document/website-document-detail';
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
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import AudioDocumentDetail from './audio-document-detail';
import DocumentOperate from './document-operate';
import { filterInfiniteQueryElements } from '@/lib/infinite-query-cache';
import { useSidebar } from '../ui/sidebar';
import { Skeleton } from '../ui/skeleton';
import { replacePath } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { DocumentGraphStatus } from '@/enums/document';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import AIModelSelect from '@/components/ai/model-select';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';
import ImageWithFallback from '../ui/image-with-fallback';
import { useRightSidebar } from '@/provider/right-sidebar-provider';
import DocumentDetailSidebar from './document-detail-sidebar';

const DocumentDetailSkeleton = () => {
	return (
		<div className='mx-auto flex h-full w-full max-w-[980px] flex-col gap-6'>
			<div className='overflow-hidden rounded-[28px] border border-border/60 bg-background/40 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.18)]'>
				<Skeleton className='aspect-[16/6.5] w-full rounded-none sm:aspect-[16/6]' />
			</div>

			<div className='space-y-5'>
				<div className='mx-auto w-full max-w-[880px] space-y-4'>
					<Skeleton className='h-4 w-40 rounded-full' />
					<div className='space-y-3'>
						<Skeleton className='h-8 w-[72%] rounded-2xl sm:h-10' />
						<Skeleton className='h-5 w-[92%] rounded-full' />
						<Skeleton className='h-5 w-[68%] rounded-full' />
					</div>
					<div className='rounded-[24px] border border-border/60 bg-background/45 px-4 py-3'>
						<Skeleton className='mx-auto h-4 w-64 rounded-full sm:w-80' />
					</div>
				</div>

				<div className='mx-auto w-full max-w-[880px] space-y-6 rounded-[28px] border border-border/60 bg-background/30 p-5 sm:p-6'>
					<div className='space-y-3'>
						<Skeleton className='h-5 w-full rounded-full' />
						<Skeleton className='h-5 w-full rounded-full' />
						<Skeleton className='h-5 w-[86%] rounded-full' />
						<Skeleton className='h-5 w-[72%] rounded-full' />
					</div>
					<div className='space-y-3'>
						<Skeleton className='h-5 w-[94%] rounded-full' />
						<Skeleton className='h-5 w-full rounded-full' />
						<Skeleton className='h-5 w-[82%] rounded-full' />
					</div>
					<div className='space-y-3'>
						<Skeleton className='h-5 w-full rounded-full' />
						<Skeleton className='h-5 w-[90%] rounded-full' />
						<Skeleton className='h-5 w-[78%] rounded-full' />
					</div>
					<div className='rounded-[24px] border border-border/60 bg-background/45 px-4 py-3'>
						<Skeleton className='mx-auto h-4 w-56 rounded-full sm:w-72' />
					</div>
				</div>
			</div>

			<div className='grid w-full grid-cols-8 gap-2 rounded-[28px] border border-border/60 bg-background/75 p-2.5 backdrop-blur-xl'>
				{Array.from({ length: 8 }).map((_, index) => (
					<Skeleton key={index} className='h-11 w-full rounded-[20px]' />
				))}
			</div>
		</div>
	);
};

const DocumentContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo } = useUserContext();
	const { state: sidebarState } = useSidebar();
	const { open: rightSidebarOpen, setContent, clearContent } = useRightSidebar();
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
	const surfaceCardClassName =
		'rounded-[30px] border border-border/60 bg-card/85 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur shadow-none';
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
		setContent(
			<DocumentDetailSidebar
				id={id}
				isPending={isPending && !isError}
				hasDocument={Boolean(document)}
				hasRenderableGraph={hasRenderableGraph}
				graphBadge={graphCardState.badge}
				graphTone={graphCardState.tone}
				graphStale={freshnessState.graphStale}
				graphActionLabel={graphActionLabel}
				graphGenerating={mutateGenerateDocumentGraph.isPending}
				documentCategory={document?.category}
				graphStatus={document?.graph_task?.status}
				surfaceCardClassName={surfaceCardClassName}
				onGraphGenerate={() => setIsGraphGenerateDialogOpen(true)}
			/>,
		);
	}, [
		document,
		freshnessState.graphStale,
		graphActionLabel,
		graphCardState.badge,
		graphCardState.tone,
		hasRenderableGraph,
		id,
		isError,
		isPending,
		mutateGenerateDocumentGraph.isPending,
		setContent,
		surfaceCardClassName,
	]);

	useEffect(() => {
		return () => {
			clearContent();
		};
	}, [clearContent, id]);

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
	}, [document?.id, isCompactViewport, rightSidebarOpen, sidebarState]);

	return (
		<>
		<div className='relative'>
			<div className='mx-auto flex w-full max-w-[1600px] flex-col pt-0'>
				<div ref={mainColumnRef} className='relative min-w-0 px-5'>
					<div className='hidden'>
						<DocumentGraph
							document_id={id}
							hideStatePanels
							onHasRenderableGraphChange={setHasRenderableGraph}
						/>
					</div>
					{isPending && !document && !isError && <DocumentDetailSkeleton />}
					{isError && (
						<div className='flex min-h-[60vh] w-full items-center justify-center px-6 text-center text-sm text-muted-foreground'>
							{error.message}
						</div>
					)}
					{documentCoverSrc ? (
						<div className='mx-auto mb-6 w-full max-w-[980px] overflow-hidden rounded-[28px] border border-border/60 bg-background/45 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.18)]'>
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
						<WebsiteDocumentDetail onFinishRead={handleFinishRead} id={id} />
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

			{document && isCompactViewport ? (
				<div className='pointer-events-none fixed bottom-4 right-4 z-40'>
					<div className='pointer-events-auto'>
						<DocumentOperate id={id} />
					</div>
				</div>
			) : null}

			{document && !isCompactViewport && dockBounds.width > 0 ? (
				<div
					className='pointer-events-none sticky bottom-0 z-40'
					style={{
						left: `${dockBounds.left}px`,
						width: `${dockBounds.width}px`,
					}}>
					<div className='pointer-events-auto w-full'>
						<DocumentOperate id={id} />
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
