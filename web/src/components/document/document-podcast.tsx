import AudioPlayer from '../ui/audio-player';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateDocumentPodcast, getDocumentDetail } from '@/service/document';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { DocumentPodcastStatus } from '@/enums/document';
import { useUserContext } from '@/provider/user-provider';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';
import AudioStatusCard from '../ui/audio-status-card';
import { Button } from '../ui/button';
import { AudioLines, Loader2 } from 'lucide-react';
import TaskStateCard from '../ui/task-state-card';

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
	const { podcastEngine } = useDefaultResourceAccess();

	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id: document_id }),
	});

	const mutateGeneratePodcast = useMutation({
		mutationFn: () =>
			generateDocumentPodcast({
				document_id: document_id,
			}),
		onSuccess(data, variables, onMutateResult, context) {
			toast.success(t('document_podcast_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getDocumentDetail', document_id],
			});
		},
		onError(error, variables, onMutateResult, context) {
			toast.error(t('document_podcast_generate_task_submitted_failed'));
			console.error(error);
		},
	});

	const canGeneratePodcast =
		podcastEngine.configured &&
		!podcastEngine.loading &&
		!podcastEngine.subscriptionLocked;

	return (
		<>
			{!document?.podcast_task && (
				<AudioStatusCard
					badge={t('document_podcast_status_todo')}
					title={t('document_podcast_unset')}
					description={t('document_podcast_placeholder_description')}
					actionLabel={t('document_podcast_generate')}
					onAction={() => mutateGeneratePodcast.mutate()}
					actionDisabled={!canGeneratePodcast}
					actionLoading={mutateGeneratePodcast.isPending}
					tone={canGeneratePodcast ? 'warning' : 'danger'}
					className={className}
					hint={
						!canGeneratePodcast
							? podcastEngine.subscriptionLocked
								? t('default_resource_subscription_locked')
								: t('document_create_auto_podcast_engine_unset')
							: undefined
					}
				/>
			)}

			{document?.podcast_task && (
				<>
					{document?.podcast_task?.status ===
						DocumentPodcastStatus.WAIT_TO && (
							<AudioStatusCard
								badge={t('document_podcast_status_todo')}
								title={t('document_podcast_wait_to')}
								description={t('document_podcast_wait_to_description')}
								tone='warning'
								className={className}
							/>
						)}
					{document?.podcast_task?.status ===
						DocumentPodcastStatus.GENERATING && (
							<AudioStatusCard
								badge={t('document_podcast_status_doing')}
								title={t('document_podcast_processing')}
								description={t('document_podcast_processing_description')}
								icon={Loader2}
								tone='default'
								actionLoading
								className={className}
								spinning
							/>
					)}
					{document?.podcast_task?.status === DocumentPodcastStatus.SUCCESS &&
						document?.podcast_task?.podcast_file_name && (
							<TaskStateCard
								icon={AudioLines}
								badge={t('document_podcast_status_success')}
								title={t('document_podcast_ready')}
								tone='success'
								className={className}
								hint={
									!canGeneratePodcast
										? podcastEngine.subscriptionLocked
											? t('default_resource_subscription_locked')
											: t('document_create_auto_podcast_engine_unset')
										: undefined
								}
								action={
									<Button
										variant='outline'
										className='h-8 rounded-full border-border/70 bg-background/65 px-3 text-xs font-medium shadow-none hover:bg-background'
										onClick={() => mutateGeneratePodcast.mutate()}
										disabled={
											!canGeneratePodcast ||
											mutateGeneratePodcast.isPending
										}>
										{mutateGeneratePodcast.isPending ? (
											<Loader2 className='size-4 animate-spin' />
										) : null}
										{t('document_podcast_regenerate')}
									</Button>
								}>
								<div className='rounded-[20px] border border-border/60 bg-background/40 p-3 sm:p-4'>
									<AudioPlayer
										src={document?.podcast_task?.podcast_file_name}
										cover={
											document.cover ??
											'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
										}
										title={document.title ?? 'Unkown Title'}
										artist={'AI Generated'}
									/>
								</div>
							</TaskStateCard>
						)}
					{document?.podcast_task?.status === DocumentPodcastStatus.FAILED && (
						<AudioStatusCard
							badge={t('document_podcast_status_failed')}
							title={t('document_podcast_failed')}
							description={t('document_podcast_failed_description')}
							actionLabel={t('document_podcast_regenerate')}
							onAction={() => mutateGeneratePodcast.mutate()}
							actionDisabled={!canGeneratePodcast}
							actionLoading={mutateGeneratePodcast.isPending}
							tone='danger'
							className={className}
							hint={
								!canGeneratePodcast
									? podcastEngine.subscriptionLocked
										? t('default_resource_subscription_locked')
										: t('document_create_auto_podcast_engine_unset')
									: undefined
							}
						/>
					)}
				</>
			)}
		</>
	);
};

export default DocumentPodcast;
