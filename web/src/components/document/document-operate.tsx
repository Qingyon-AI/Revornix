import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
	AudioLines,
	FolderCheck,
	FolderOutput,
	GitBranch,
	Info,
	LinkIcon,
	Loader2,
	Menu,
	NotebookPen,
	ShareIcon,
	Star,
	StarOff,
	Trash,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '../ui/button';
import {
	getDocumentDetail,
	deleteDocument,
	readDocument,
	starDocument,
} from '@/service/document';
import { getQueryClient } from '@/lib/get-query-client';
import {
	DocumentDetailResponse,
	DocumentInfo as DocumentListItem,
	InifiniteScrollPagnitionDocumentInfo,
	InifiniteScrollPagnitionSectionDocumentInfo,
	SectionDocumentInfo,
} from '@/generated';
import { toast } from 'sonner';
import { useState } from 'react';
import { InfiniteData, useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer';
import DocumentNotes from './document-notes';
import DocumentOperateComment from './document-operate-comment';
import { DocumentCategory } from '@/enums/document';
import DocumentConfiguration from './document-configuration';
import { useUserContext } from '@/provider/user-provider';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
	filterInfiniteDataElements,
	filterInfiniteQueryElements,
} from '@/lib/infinite-query-cache';
import DocumentInfo from './document-info';
import DocumentGraph from './document-graph';
import DocumentPodcast from './document-podcast';
import DocumentAudio from './document-audio';
import DocumentOperateAI from './document-operate-ai';
import DocumentOperateShare from './document-operate-share';
import {
	DocumentMdConvertStatus,
	DocumentTranscribeStatus,
} from '@/enums/document';

const DocumentOperate = ({
	id,
	className,
}: {
	id: number;
	className?: string;
}) => {
	type MobilePanel = 'info' | 'graph' | 'media' | null;
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();
	const isCompactViewport = useIsMobile(1280);
	const [showDeleteDocumentDialog, setShowDeleteDocumentDialog] =
		useState(false);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
	const [showMobileShare, setShowMobileShare] = useState(false);

	const { mainUserInfo } = useUserContext();
	const userUnreadDocumentQueryKey = [
		'searchUserUnreadDocument',
		mainUserInfo?.id,
	] as const;
	const userRecentReadDocumentQueryKey = [
		'searchUserRecentReadDocument',
		mainUserInfo?.id,
	] as const;
	const userMyStarDocumentQueryKey = [
		'searchMyStarDocument',
		mainUserInfo?.id,
	] as const;
	const userMyDocumentQueryKey = ['searchMyDocument', mainUserInfo?.id] as const;

	const mapDocumentDetailToListItem = (
		documentDetail: DocumentDetailResponse,
	): DocumentListItem => {
		return {
			id: documentDetail.id,
			creator_id: documentDetail.creator.id,
			category: documentDetail.category,
			title: documentDetail.title,
			from_plat: documentDetail.from_plat,
			create_time: documentDetail.create_time,
			update_time: documentDetail.update_time,
			cover: documentDetail.cover,
			description: documentDetail.description,
			labels: documentDetail.labels,
			sections: documentDetail.sections,
			users: documentDetail.users,
			convert_task: documentDetail.convert_task,
			embedding_task: documentDetail.embedding_task,
			graph_task: documentDetail.graph_task,
			podcast_task: documentDetail.podcast_task,
			summarize_task: documentDetail.summarize_task,
			transcribe_task: documentDetail.transcribe_task,
			process_task: documentDetail.process_task,
		};
	};

	const isDocumentInfiniteData = (
		value: unknown,
	): value is InfiniteData<InifiniteScrollPagnitionDocumentInfo> => {
		if (!value || typeof value !== 'object') return false;
		return Array.isArray(
			(value as InfiniteData<InifiniteScrollPagnitionDocumentInfo>).pages,
		);
	};

	const invalidateDocumentSummaryQueries = () => {
		queryClient.invalidateQueries({
			queryKey: userUnreadDocumentQueryKey,
			exact: true,
		});
		queryClient.invalidateQueries({
			queryKey: userRecentReadDocumentQueryKey,
			exact: true,
		});
		queryClient.invalidateQueries({
			queryKey: userMyStarDocumentQueryKey,
			exact: true,
		});
	};

	const matchDocumentInfiniteQueryFilter = (
		queryKey: readonly unknown[],
		documentItem: DocumentListItem,
	) => {
		const keyword =
			typeof queryKey[2] === 'string' ? queryKey[2].trim().toLowerCase() : '';
		const labelIds = Array.isArray(queryKey[4])
			? queryKey[4].filter((value): value is number => typeof value === 'number')
			: undefined;

		if (keyword) {
			const content =
				`${documentItem.title} ${documentItem.description ?? ''}`.toLowerCase();
			if (!content.includes(keyword)) {
				return false;
			}
		}

		if (labelIds && labelIds.length > 0) {
			const documentLabelIds = (documentItem.labels ?? []).map((label) => label.id);
			if (!labelIds.some((labelId) => documentLabelIds.includes(labelId))) {
				return false;
			}
		}

		return true;
	};

	const upsertDocumentInInfiniteCache = (
		baseQueryKey: 'searchUserRecentReadDocument' | 'searchUserUnreadDocument',
		documentItem: DocumentListItem,
	) => {
		const queryCaches = queryClient.getQueriesData<
			InfiniteData<InifiniteScrollPagnitionDocumentInfo>
		>({
			queryKey: [baseQueryKey, mainUserInfo?.id],
		});

		queryCaches.forEach(([queryKey, oldData]) => {
			if (!isDocumentInfiniteData(oldData)) return;

			const normalizedQueryKey = queryKey as readonly unknown[];
			const removedData = filterInfiniteDataElements<
				InifiniteScrollPagnitionDocumentInfo,
				DocumentListItem
			>(oldData, (item) => item.id !== documentItem.id);
			const dataWithoutTarget = removedData ?? oldData;

			const isMatched = matchDocumentInfiniteQueryFilter(
				normalizedQueryKey,
				documentItem,
			);
			if (!isMatched) {
				if (dataWithoutTarget !== oldData) {
					queryClient.setQueryData(queryKey, dataWithoutTarget);
				}
				return;
			}

			const pages = [...dataWithoutTarget.pages];
			if (pages.length === 0) return;

			const sortDesc = normalizedQueryKey[3] !== false;
			if (sortDesc) {
				pages[0] = {
					...pages[0],
					elements: [documentItem, ...pages[0].elements],
				};
			} else {
				const lastPageIndex = pages.length - 1;
				pages[lastPageIndex] = {
					...pages[lastPageIndex],
					elements: [...pages[lastPageIndex].elements, documentItem],
				};
			}

			queryClient.setQueryData(queryKey, {
				...dataWithoutTarget,
				pages,
			});
		});
	};

	const removeDocumentFromCache = () => {
		const queryKeys = [
			userMyDocumentQueryKey,
			userMyStarDocumentQueryKey,
			userUnreadDocumentQueryKey,
			userRecentReadDocumentQueryKey,
		] as const;

		queryKeys.forEach((queryKey) => {
			filterInfiniteQueryElements<
				InifiniteScrollPagnitionDocumentInfo,
				DocumentListItem
			>(queryClient, queryKey, (item) => item.id !== id);
		});

		filterInfiniteQueryElements<
			InifiniteScrollPagnitionSectionDocumentInfo,
			SectionDocumentInfo
		>(queryClient, ['searchSectionDocument'], (item) => item.id !== id);
	};

	const invalidateRelatedSectionQueries = (
		documentDetail?: DocumentDetailResponse,
	) => {
		documentDetail?.sections?.forEach((section) => {
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section.id],
			});
		});

		queryClient.invalidateQueries({
			queryKey: ['searchSectionDocument'],
		});
	};

	const { data } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const mutateRead = useMutation({
		mutationFn: (nextReadStatus: boolean) =>
			readDocument({
				document_id: id,
				status: nextReadStatus,
			}),
		onMutate: async (nextReadStatus) => {
			const previousDocument = queryClient.getQueryData<DocumentDetailResponse>(
				['getDocumentDetail', id]
			);
			queryClient.setQueryData(
				['getDocumentDetail', id],
				(old: DocumentDetailResponse | undefined) =>
					old
						? {
								...old,
								is_read: nextReadStatus,
							}
						: old
			);
			return { previousDocument };
		},
		onError: (error, variables, context) => {
			context &&
				queryClient.setQueryData(
					['getDocumentDetail', id],
					context.previousDocument
				);
		},
		onSuccess: (_, nextReadStatus) => {
			const currentDocument = queryClient.getQueryData<DocumentDetailResponse>([
				'getDocumentDetail',
				id,
			]);
			if (!currentDocument) return;

			const documentListItem = mapDocumentDetailToListItem(currentDocument);

			if (nextReadStatus) {
				filterInfiniteQueryElements<
					InifiniteScrollPagnitionDocumentInfo,
					DocumentListItem
				>(queryClient, userUnreadDocumentQueryKey, (item) => item.id !== id);
				upsertDocumentInInfiniteCache(
					'searchUserRecentReadDocument',
					documentListItem,
				);
				invalidateDocumentSummaryQueries();
				return;
			}

			filterInfiniteQueryElements<
				InifiniteScrollPagnitionDocumentInfo,
				DocumentListItem
			>(queryClient, userRecentReadDocumentQueryKey, (item) => item.id !== id);
			upsertDocumentInInfiniteCache(
				'searchUserUnreadDocument',
				documentListItem,
			);
			invalidateDocumentSummaryQueries();
		},
	});

	const mutateStar = useMutation({
		mutationFn: () =>
			starDocument({ document_id: id, status: !data?.is_star! }),
		onMutate: async () => {
			await queryClient.cancelQueries({
				queryKey: ['getDocumentDetail', id],
			});
			const previousDocument = queryClient.getQueryData<DocumentDetailResponse>(
				['getDocumentDetail', id]
			);
			queryClient.setQueryData(
				['getDocumentDetail', id],
				(old: DocumentDetailResponse) => ({
					...old,
					is_star: !old.is_star,
				})
			);
			return { previousDocument };
		},
		onError: (error, variables, context) => {
			context &&
				queryClient.setQueryData(
					['getDocumentDetail', id],
					context.previousDocument
				);
		},
		onSuccess: () => {
			const currentDocument = queryClient.getQueryData<DocumentDetailResponse>([
				'getDocumentDetail',
				id,
			]);
			if (!currentDocument?.is_star) {
				filterInfiniteQueryElements<
					InifiniteScrollPagnitionDocumentInfo,
					DocumentListItem
				>(queryClient, userMyStarDocumentQueryKey, (item) => item.id !== id);
			}
			queryClient.invalidateQueries({
				queryKey: userMyStarDocumentQueryKey,
			});
			invalidateDocumentSummaryQueries();
		},
	});

	const mutateDelete = useMutation({
		mutationKey: ['deleteDocument', id],
		mutationFn: () => deleteDocument({ document_ids: [id] }),
		onSuccess: () => {
			const currentDocument = queryClient.getQueryData<DocumentDetailResponse>([
				'getDocumentDetail',
				id,
			]);
			toast.success(t('document_delete_success'));
			removeDocumentFromCache();
			invalidateDocumentSummaryQueries();
			invalidateRelatedSectionQueries(currentDocument);
			setShowDeleteDocumentDialog(false);
			router.back();
		},
		onError(error, variables, context) {
			toast.error(t('document_delete_failed'));
		},
	});

	const actionButtonClassName =
		'h-11 w-full justify-center rounded-[20px] border border-border/50 bg-background/40 px-3.5 text-center text-xs font-medium text-foreground shadow-none transition-colors hover:bg-background/80 sm:text-sm';
	const desktopIconButtonClassName =
		'h-11 w-full justify-center rounded-[20px] border border-border/50 bg-background/40 px-0 text-center text-xs font-medium text-foreground shadow-none transition-colors hover:bg-background/80 [&_svg]:size-4.5';
	const mobileActionButtonClassName =
		'h-14 w-full justify-start gap-3 rounded-[20px] border border-border/70 bg-background/70 px-4 text-left text-sm font-medium text-foreground shadow-[0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:bg-background/90 dark:bg-background/45 dark:hover:bg-background/60 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground';
	const desktopDockClassName =
		'border-t border-border/60 grid w-full gap-2 bg-background/75 p-2.5 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.75)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/65';
	const closeMobileMenu = () => {
		setShowMobileMenu(false);
	};
	const openMobilePanel = (panel: Exclude<MobilePanel, null>) => {
		setShowMobileMenu(false);
		window.setTimeout(() => {
			setMobilePanel(panel);
		}, 180);
	};
	const openMobileShareDialog = () => {
		setShowMobileMenu(false);
		window.setTimeout(() => {
			setShowMobileShare(true);
		}, 180);
	};
	const closeMobilePanel = () => {
		setMobilePanel(null);
	};

	const mobilePanelMeta =
		mobilePanel === 'info'
			? {
					title: t('document_mobile_info_title'),
					description: t('document_mobile_info_description'),
			  }
			: mobilePanel === 'graph'
				? {
						title: t('document_graph'),
						description: t('document_graph_description'),
				  }
				: {
						title: t('document_mobile_media_title'),
						description: t('document_mobile_media_description'),
				  };
	const isDocumentAiDisabled =
		!data ||
		((data.category === DocumentCategory.WEBSITE ||
			data.category === DocumentCategory.FILE) &&
			data.convert_task?.status !== DocumentMdConvertStatus.SUCCESS) ||
		(data.category === DocumentCategory.AUDIO &&
			data.transcribe_task?.status !== DocumentTranscribeStatus.SUCCESS) ||
		(data.category === DocumentCategory.QUICK_NOTE &&
			!data.quick_note_info?.content?.trim());

	const renderOriginAction = (
		buttonClassName: string,
		onClick?: () => void,
		iconOnly = false,
	) => {
		if (data?.category === DocumentCategory.WEBSITE && data.website_info) {
			return (
				<Button asChild variant='ghost' className={buttonClassName}>
					<Link
						title={t('website_document_go_to_origin')}
						href={data.website_info?.url ? data.website_info.url : ''}
						target='_blank'
						onClick={onClick}>
						<LinkIcon />
						{iconOnly ? <span className='sr-only'>{t('website_document_go_to_origin')}</span> : <span className='truncate'>{t('website_document_go_to_origin')}</span>}
					</Link>
				</Button>
			);
		}

		if (data?.category === DocumentCategory.FILE && data.file_info) {
			return (
				<Button asChild variant='ghost' className={buttonClassName}>
					<Link
						title={t('file_document_go_to_origin')}
						target='_blank'
						href={data.file_info?.file_name ?? '#'}
						onClick={onClick}>
						<LinkIcon />
						{iconOnly ? <span className='sr-only'>{t('file_document_go_to_origin')}</span> : <span className='truncate'>{t('file_document_go_to_origin')}</span>}
					</Link>
				</Button>
			);
		}

		return null;
	};

	const renderStarAction = (
		buttonClassName: string,
		onClick?: () => void,
		iconOnly = false,
	) => {
		if (data?.is_star) {
			return (
				<Button
					title={t('document_star_cancel')}
					variant='ghost'
					onClick={() => {
						mutateStar.mutate();
						onClick?.();
					}}
					className={buttonClassName}>
					<StarOff />
					{iconOnly ? <span className='sr-only'>{t('document_star_cancel')}</span> : <span className='truncate'>{t('document_star_cancel')}</span>}
				</Button>
			);
		}

		return (
			<Button
				variant='ghost'
				title={t('document_star')}
				onClick={() => {
					mutateStar.mutate();
					onClick?.();
				}}
				className={buttonClassName}>
				<Star />
				{iconOnly ? <span className='sr-only'>{t('document_star')}</span> : <span className='truncate'>{t('document_star')}</span>}
			</Button>
		);
	};

	const renderReadAction = (
		buttonClassName: string,
		onClick?: () => void,
		iconOnly = false,
	) => {
		if (data?.is_read) {
			return (
				<Button
					variant='ghost'
					title={t('document_unread')}
					onClick={() => {
						mutateRead.mutate(!Boolean(data.is_read));
						onClick?.();
					}}
					className={buttonClassName}>
					<FolderOutput />
					{iconOnly ? <span className='sr-only'>{t('document_unread')}</span> : <span className='truncate'>{t('document_unread')}</span>}
				</Button>
			);
		}

		return (
			<Button
				variant='ghost'
				title={t('document_read')}
				onClick={() => {
					mutateRead.mutate(!Boolean(data?.is_read));
					onClick?.();
				}}
				className={buttonClassName}>
				<FolderCheck />
				{iconOnly ? <span className='sr-only'>{t('document_read')}</span> : <span className='truncate'>{t('document_read')}</span>}
			</Button>
		);
	};

	const renderNotesAction = (
		buttonClassName: string,
		onTriggerClick?: () => void,
		iconOnly = false,
	) => {
		return (
			<Sheet>
				<SheetTrigger asChild>
					<Button
						title={t('document_notes_title')}
						variant='ghost'
						className={buttonClassName}
						onClick={onTriggerClick}>
						<NotebookPen />
						{iconOnly ? <span className='sr-only'>{t('document_notes_title')}</span> : <span className='truncate'>{t('document_notes_title')}</span>}
					</Button>
				</SheetTrigger>
				<SheetContent className='flex h-full flex-col gap-0 overflow-hidden bg-card/95 pt-0 sm:max-w-2xl'>
					<SheetHeader className='border-b border-border/60 px-5 pt-6 pb-3 pr-12 text-left'>
						<SheetTitle className='text-xl'>
							{t('document_notes_title')}
						</SheetTitle>
						<SheetDescription>{t('document_notes_description')}</SheetDescription>
					</SheetHeader>
					<div className='min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.06),transparent_28%),radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_24%)] px-4 py-4 sm:px-5 sm:py-5'>
						<DocumentNotes id={id} />
					</div>
				</SheetContent>
			</Sheet>
		);
	};

	const renderAiAction = (
		buttonClassName: string,
		onTriggerClick?: () => void,
		iconOnly = false,
	) => {
		return (
			<DocumentOperateAI
				document_id={id}
				document_title={data?.title}
				disabled={isDocumentAiDisabled}
				className={buttonClassName}
				onTriggerClick={onTriggerClick}
				iconOnly={iconOnly}
			/>
		);
	};

	const renderShareAction = (
		buttonClassName: string,
		onTriggerClick?: () => void,
		iconOnly = false,
	) => {
		if (data?.creator.id !== mainUserInfo?.id) {
			return null;
		}

		return (
			<DocumentOperateShare
				document_id={id}
				className={buttonClassName}
				onTriggerClick={onTriggerClick}
				iconOnly={iconOnly}
			/>
		);
	};

	const renderDeleteAction = (
		buttonClassName: string,
		onTriggerClick?: () => void,
		iconOnly = false,
	) => {
		if (data?.creator.id !== mainUserInfo?.id) {
			return null;
		}

		return (
			<AlertDialog
				open={showDeleteDocumentDialog}
				onOpenChange={setShowDeleteDocumentDialog}>
				<AlertDialogTrigger asChild>
					<Button
						title={t('document_delete')}
						variant='ghost'
						className={buttonClassName}
						onClick={onTriggerClick}>
						<Trash />
						{iconOnly ? <span className='sr-only'>{t('document_delete')}</span> : <span className='truncate'>{t('document_delete')}</span>}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent className='rounded-[28px] sm:max-w-md'>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('document_delete')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('document_delete_alert_description')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('document_delete_cancel')}</AlertDialogCancel>
						<AlertDialogAction
							className='bg-destructive text-white hover:bg-destructive/90'
							onClick={() => mutateDelete.mutate()}
							disabled={mutateDelete.isPending}>
							{t('document_delete_confirm')}
							{mutateDelete.isPending ? (
								<Loader2 className='size-4 animate-spin' />
							) : null}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	};

	const renderConfigurationAction = (
		buttonClassName: string,
		onTriggerClick?: () => void,
		iconOnly = false,
	) => {
		if (data?.creator.id !== mainUserInfo?.id) {
			return null;
		}

		return (
			<DocumentConfiguration
				document_id={id}
				className={buttonClassName}
				onTriggerClick={onTriggerClick}
				iconOnly={iconOnly}
			/>
		);
	};

	const renderCommentAction = (
		buttonClassName: string,
		onTriggerClick?: () => void,
		iconOnly = false,
	) => {
		return (
			<DocumentOperateComment
				document_id={id}
				className={buttonClassName}
				onTriggerClick={onTriggerClick}
				iconOnly={iconOnly}
			/>
		);
	};

	const renderMobilePanelAction = ({
		icon: Icon,
		label,
		onClick,
	}: {
		icon: typeof Info;
		label: string;
		onClick: () => void;
	}) => {
		return (
			<Button
				variant='ghost'
				className={mobileActionButtonClassName}
				onClick={onClick}>
				<Icon />
				<span className='truncate'>{label}</span>
			</Button>
		);
	};

	const desktopActions = [
		{
			key: 'origin',
			node: renderOriginAction(desktopIconButtonClassName, undefined, true),
		},
		{
			key: 'share',
			node: renderShareAction(desktopIconButtonClassName, undefined, true),
		},
		{
			key: 'ai',
			node: renderAiAction(desktopIconButtonClassName, undefined, true),
		},
		{
			key: 'star',
			node: renderStarAction(desktopIconButtonClassName, undefined, true),
		},
		{
			key: 'read',
			node: renderReadAction(desktopIconButtonClassName, undefined, true),
		},
		{
			key: 'notes',
			node: renderNotesAction(desktopIconButtonClassName, undefined, true),
		},
		{
			key: 'comment',
			node: renderCommentAction(desktopIconButtonClassName, undefined, true),
		},
		{
			key: 'delete',
			node: renderDeleteAction(desktopIconButtonClassName, undefined, true),
		},
		{
			key: 'configuration',
			node: renderConfigurationAction(
				desktopIconButtonClassName,
				undefined,
				true,
			),
		},
	]
		.filter((action) => Boolean(action.node))
		.map((action) => <div key={action.key}>{action.node}</div>);

	return (
		<>
			{data && (
				<>
					{isCompactViewport ? (
						<>
							<Drawer open={showMobileMenu} onOpenChange={setShowMobileMenu}>
								<DrawerTrigger asChild>
									<Button
										size='icon'
										className={cn(
											'size-14 rounded-full border border-border/70 bg-card/92 text-foreground shadow-[0_24px_50px_-26px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-card/78 dark:bg-background/80 dark:supports-[backdrop-filter]:bg-background/65',
											className,
										)}>
										<Menu className='size-5 text-foreground' />
										<span className='sr-only'>
											{t('document_action_menu_title')}
										</span>
									</Button>
								</DrawerTrigger>
								<DrawerContent className='flex max-h-[86dvh] flex-col overflow-hidden rounded-t-[32px] border-border/70 bg-background/96 shadow-[0_-24px_60px_-32px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/88 dark:bg-background/92'>
									<DrawerHeader className='items-start px-4 pb-3 pt-2 text-left'>
										<DrawerTitle className='text-lg tracking-tight'>
											{t('document_action_menu_title')}
										</DrawerTitle>
										<DrawerDescription className='max-w-[28rem] text-sm leading-6 text-muted-foreground/90'>
											{t('document_action_menu_description')}
										</DrawerDescription>
									</DrawerHeader>

									<div className='min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'>
										<div className='space-y-4'>
											<div className='space-y-2 border-t border-border/60 pt-4'>
												<p className='px-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
													{t('document_mobile_menu_section_browse')}
												</p>
												<div className='grid grid-cols-2 gap-2.5'>
													{renderMobilePanelAction({
														icon: Info,
														label: t('document_mobile_info_title'),
														onClick: () => openMobilePanel('info'),
													})}
													{renderMobilePanelAction({
														icon: GitBranch,
														label: t('document_graph'),
														onClick: () => openMobilePanel('graph'),
													})}
													{renderMobilePanelAction({
														icon: AudioLines,
														label: t('document_mobile_media_title'),
														onClick: () => openMobilePanel('media'),
													})}
												</div>
											</div>

											<div className='space-y-2 border-t border-border/60 pt-4'>
												<p className='px-1 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
													{t('document_mobile_menu_section_actions')}
												</p>
												<div className='grid grid-cols-2 gap-2.5'>
													{renderOriginAction(
														mobileActionButtonClassName,
														closeMobileMenu,
													)}
													{data.creator.id === mainUserInfo?.id
														? renderMobilePanelAction({
																icon: ShareIcon,
																label: t('document_share'),
																onClick: openMobileShareDialog,
															})
														: null}
													{renderAiAction(
														mobileActionButtonClassName,
														closeMobileMenu,
													)}
													{renderStarAction(
														mobileActionButtonClassName,
														closeMobileMenu,
													)}
													{renderReadAction(
														mobileActionButtonClassName,
														closeMobileMenu,
													)}
													{renderNotesAction(
														mobileActionButtonClassName,
													)}
													{renderCommentAction(
														mobileActionButtonClassName,
													)}
													{renderDeleteAction(
														mobileActionButtonClassName,
													)}
													{renderConfigurationAction(
														mobileActionButtonClassName,
													)}
												</div>
											</div>
										</div>
									</div>
								</DrawerContent>
							</Drawer>

							<Sheet
								open={mobilePanel !== null}
								onOpenChange={(open) => {
									if (!open) {
										closeMobilePanel();
									}
								}}>
								<SheetContent
									side='bottom'
									className='flex h-[86dvh] flex-col gap-0 rounded-t-[32px] border-border/70 bg-background/96 pt-0 shadow-[0_-24px_60px_-32px_rgba(15,23,42,0.55)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/88 dark:bg-background/92'>
									<SheetHeader className='border-b border-border/60 px-5 pb-3 pt-6 text-left'>
										<SheetTitle className='text-xl tracking-tight'>
											{mobilePanelMeta.title}
										</SheetTitle>
										<SheetDescription className='max-w-md text-sm leading-6'>
											{mobilePanelMeta.description}
										</SheetDescription>
									</SheetHeader>
									<div className='min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.06),transparent_28%),radial-gradient(circle_at_top_left,rgba(16,185,129,0.06),transparent_24%)] px-4 py-4 sm:px-5 sm:py-5 space-y-4'>
										{mobilePanel === 'info' ? (
											<DocumentInfo id={id} />
										) : mobilePanel === 'graph' ? (
											<div className='h-full min-h-[420px] overflow-hidden rounded-[28px] border border-border/60 bg-background/50'>
												<DocumentGraph document_id={id} />
											</div>
										) : data.category === DocumentCategory.AUDIO ? (
											<DocumentAudio document_id={id} />
										) : (
											<DocumentPodcast document_id={id} />
										)}
									</div>
								</SheetContent>
							</Sheet>
							{data.creator.id === mainUserInfo?.id ? (
								<DocumentOperateShare
									document_id={id}
									open={showMobileShare}
									onOpenChange={setShowMobileShare}
									className='hidden'
									iconOnly
								/>
							) : null}
						</>
					) : (
						<div
							className={cn(desktopDockClassName, className)}
							style={{
								gridTemplateColumns: `repeat(${Math.max(desktopActions.length, 1)}, minmax(0, 1fr))`,
							}}>
							{desktopActions}
						</div>
					)}
				</>
			)}
		</>
	);
};

export default DocumentOperate;
