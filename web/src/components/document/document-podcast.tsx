import AudioPlayer from '../ui/audio-player';
import { replacePath } from '@/lib/utils';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	cancelDocumentPodcast,
	generateDocumentPodcast,
	getDocumentDetail,
} from '@/service/document';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { getDocumentFreshnessState } from '@/lib/result-freshness';
import { DocumentPodcastStatus } from '@/enums/document';
import { useUserContext } from '@/provider/user-provider';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { AudioLines, Hourglass, Loader2 } from 'lucide-react';
import EngineSelect from '@/components/ai/engine-select';
import { EngineCategory } from '@/enums/engine';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';
import SidebarTaskNode from '../ui/sidebar-task-node';

const DocumentPodcast = ({
	document_id,
	className,
}: {
	document_id: number;
	className?: string;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const { mainUserInfo } = useUserContext();
	const [selectedEngineId, setSelectedEngineId] = useState<number | null>(
		mainUserInfo?.default_podcast_user_engine_id ?? null,
	);
	const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

	useEffect(() => {
		setSelectedEngineId(mainUserInfo?.default_podcast_user_engine_id ?? null);
	}, [mainUserInfo?.default_podcast_user_engine_id]);

	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id: document_id }),
	});

	const mutateGeneratePodcast = useMutation({
		mutationFn: () =>
			generateDocumentPodcast({
				document_id: document_id,
				engine_id: selectedEngineId ?? undefined,
			}),
		onSuccess(data, variables, onMutateResult, context) {
			setIsGenerateDialogOpen(false);
			toast.success(t('document_podcast_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', document_id],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserInfo'],
			});
			queryClient.invalidateQueries({
				queryKey: ['paySystemUserComputeLedger'],
			});
		},
		onError(error, variables, onMutateResult, context) {
			toast.error(t('document_podcast_generate_task_submitted_failed'));
			console.error(error);
		},
	});

	const mutateCancelPodcast = useMutation({
		mutationFn: () => cancelDocumentPodcast({ document_id }),
		onSuccess() {
			toast.success(t('cancel'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', document_id],
			});
		},
		onError(error) {
			toast.error(error.message || t('something_wrong'));
		},
	});

	const canGeneratePodcast = Boolean(selectedEngineId);
	const freshnessState = getDocumentFreshnessState(document);
	const podcastHintMessages = [
		freshnessState.podcastStale ? t('document_podcast_stale_hint') : null,
		!canGeneratePodcast ? t('document_create_auto_podcast_engine_unset') : null,
	].filter((message): message is string => Boolean(message));
	const podcastHint =
		podcastHintMessages.length > 0 ? (
			<div className='space-y-3'>
				{podcastHintMessages.map((message) => (
					<p key={message}>{message}</p>
				))}
			</div>
		) : undefined;
	const renderPodcastAction = ({
		label,
		onClick,
		loading = false,
		disabled = false,
	}: {
		label: string;
		onClick: () => void;
		loading?: boolean;
		disabled?: boolean;
	}) => (
		<Button
			variant='outline'
			className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
			onClick={onClick}
			disabled={disabled || loading}>
			{loading ? <Loader2 className='size-4 animate-spin' /> : null}
			{label}
		</Button>
	);

	return (
		<>
			{!document?.podcast_task && (
				<SidebarTaskNode
					icon={AudioLines}
					status={t('document_podcast_status_todo')}
					title={t('document_podcast_unset')}
					description={t('document_podcast_placeholder_description')}
					tone={canGeneratePodcast ? 'warning' : 'danger'}
					className={className}
					hint={podcastHint}
					action={renderPodcastAction({
						label: t('document_podcast_generate'),
						onClick: () => setIsGenerateDialogOpen(true),
						loading: mutateGeneratePodcast.isPending,
					})}
				/>
			)}

			{document?.podcast_task && (
				<>
					{document?.podcast_task?.status ===
						DocumentPodcastStatus.WAIT_TO && (
							<SidebarTaskNode
								status={t('document_podcast_status_todo')}
								title={t('document_podcast_wait_to')}
								description={t('document_podcast_wait_to_description')}
								icon={Hourglass}
								tone='warning'
								className={className}
								action={renderPodcastAction({
									label: t('cancel'),
									onClick: () => mutateCancelPodcast.mutate(),
									loading: mutateCancelPodcast.isPending,
								})}
							/>
						)}
					{document?.podcast_task?.status ===
						DocumentPodcastStatus.GENERATING && (
							<SidebarTaskNode
								status={t('document_podcast_status_doing')}
								title={t('document_podcast_processing')}
								description={t('document_podcast_processing_description')}
								icon={Loader2}
								tone='default'
								className={className}
								iconClassName='animate-spin'
								action={renderPodcastAction({
									label: t('cancel'),
									onClick: () => mutateCancelPodcast.mutate(),
									loading: mutateCancelPodcast.isPending,
								})}
							/>
						)}
					{document?.podcast_task?.status === DocumentPodcastStatus.SUCCESS &&
						document?.podcast_task?.podcast_file_name && (
							<SidebarTaskNode
								icon={AudioLines}
								status={
									freshnessState.podcastStale
										? t('document_status_stale')
										: t('document_podcast_status_success')
								}
								title={t('document_podcast_ready')}
								description={t('document_podcast_placeholder_description')}
								tone={freshnessState.podcastStale ? 'warning' : 'success'}
								hint={podcastHint}
								action={renderPodcastAction({
									label: t('document_podcast_regenerate'),
									onClick: () => setIsGenerateDialogOpen(true),
								})}
								result={
									<AudioPlayer
										src={document?.podcast_task?.podcast_file_name}
										scriptUrl={
											document?.podcast_task?.podcast_script_file_name ?? undefined
										}
										cover={
											document.cover
												? replacePath(document.cover, document.creator.id)
												: undefined
										}
										title={document.title ?? 'Unkown Title'}
										artist={'AI Generated'}
									/>
								}
								className={className}
							/>
						)}
					{document?.podcast_task?.status === DocumentPodcastStatus.FAILED && (
						<SidebarTaskNode
							icon={AudioLines}
							status={t('document_podcast_status_failed')}
							title={t('document_podcast_failed')}
							description={t('document_podcast_failed_description')}
							tone='danger'
							className={className}
							hint={podcastHint}
							action={renderPodcastAction({
								label: t('document_podcast_regenerate'),
								onClick: () => setIsGenerateDialogOpen(true),
								loading: mutateGeneratePodcast.isPending,
							})}
						/>
					)}
					{document?.podcast_task?.status === DocumentPodcastStatus.CANCELLED && (
						<SidebarTaskNode
							icon={AudioLines}
							status={t('cancel')}
							title={t('document_podcast_unset')}
							description={t('document_podcast_placeholder_description')}
							tone='warning'
							className={className}
							hint={podcastHint}
							action={renderPodcastAction({
								label: t('document_podcast_generate'),
								onClick: () => setIsGenerateDialogOpen(true),
								loading: mutateGeneratePodcast.isPending,
							})}
						/>
					)}
				</>
			)}
			<ResourceConfirmDialog
				open={isGenerateDialogOpen}
				onOpenChange={setIsGenerateDialogOpen}
				title={t('document_podcast_generate')}
				description={t('resource_dialog_podcast_description')}
				confirmLabel={t('document_podcast_generate')}
				confirmDisabled={!selectedEngineId}
				confirmLoading={mutateGeneratePodcast.isPending}
				onConfirm={() => {
					mutateGeneratePodcast.mutate();
				}}>
				<div className='space-y-2'>
					<p className='text-sm font-medium text-foreground'>{t('use_engine')}</p>
					<EngineSelect
						category={EngineCategory.TTS}
						value={selectedEngineId}
						onChange={setSelectedEngineId}
						className='w-full'
						placeholder={t('setting_default_engine_choose')}
					/>
				</div>
			</ResourceConfirmDialog>
		</>
	);
};

export default DocumentPodcast;
