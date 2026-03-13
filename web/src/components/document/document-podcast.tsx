import AudioPlayer from '../ui/audio-player';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateDocumentPodcast, getDocumentDetail } from '@/service/document';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { Card } from '../ui/card';
import { DocumentPodcastStatus } from '@/enums/document';
import { useUserContext } from '@/provider/user-provider';
import AudioStatusCard from '../ui/audio-status-card';
import { cn } from '@/lib/utils';

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

	const canGeneratePodcast = Boolean(
		mainUserInfo?.default_podcast_user_engine_id,
	);

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
							? t('document_create_auto_podcast_engine_unset')
							: undefined
					}
				/>
			)}

			{document?.podcast_task && (
				<>
					{document?.podcast_task?.status ===
						DocumentPodcastStatus.GENERATING && (
							<AudioStatusCard
								badge={t('document_podcast_status_doing')}
								title={t('document_podcast_processing')}
								description={t('document_podcast_processing_description')}
								tone='default'
								actionLoading
								className={className}
							/>
					)}
					{document?.podcast_task?.status === DocumentPodcastStatus.SUCCESS &&
						document?.podcast_task?.podcast_file_name && (
							<Card
								className={cn(
									'relative gap-0 rounded-[30px] border border-border/60 bg-card/85 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur',
									className,
								)}>
								<AudioPlayer
									src={document?.podcast_task?.podcast_file_name}
									cover={
										document.cover ??
										'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
									}
									title={document.title ?? 'Unkown Title'}
									artist={'AI Generated'}
								/>
							</Card>
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
									? t('document_create_auto_podcast_engine_unset')
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
