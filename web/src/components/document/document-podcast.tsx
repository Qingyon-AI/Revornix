import AudioPlayer from '../ui/audio-player';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { Spinner } from '../ui/spinner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateDocumentPodcast, getDocumentDetail } from '@/service/document';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { Button } from '../ui/button';
import { Loader2, OctagonAlert } from 'lucide-react';
import { Card } from '../ui/card';
import { DocumentPodcastStatus } from '@/enums/document';
import { useUserContext } from '@/provider/user-provider';

const DocumentPodcast = ({ document_id }: { document_id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const { mainUserInfo } = useUserContext();

	const {
		data: document,
		isError,
		error,
	} = useQuery({
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
	return (
		<>
			{!document?.podcast_task && (
				<>
					<Alert className='bg-destructive/10 dark:bg-destructive/20'>
						<AlertDescription>
							<span className='inline-flex'>{t('document_podcast_unset')}</span>
							<Button
								variant={'link'}
								size='sm'
								className='text-muted-foreground underline underline-offset-3 p-0 m-0 ml-auto'
								onClick={() => mutateGeneratePodcast.mutate()}
								disabled={
									mutateGeneratePodcast.isPending ||
									!mainUserInfo?.default_podcast_user_engine_id
								}>
								{t('document_podcast_generate')}
								{mutateGeneratePodcast.isPending && (
									<Loader2 className='animate-spin' />
								)}
							</Button>
						</AlertDescription>
					</Alert>
					{!mainUserInfo?.default_podcast_user_engine_id && (
						<Alert className='bg-destructive/10 dark:bg-destructive/20'>
							<OctagonAlert className='h-4 w-4 text-destructive!' />
							<AlertDescription>
								{t('document_create_auto_podcast_engine_unset')}
							</AlertDescription>
						</Alert>
					)}
				</>
			)}

			{document?.podcast_task && (
				<>
					{document?.podcast_task?.status ===
						DocumentPodcastStatus.GENERATING && (
						<Card className='p-5 relative'>
							<div className='flex flex-row justify-center items-center gap-1 text-muted-foreground text-xs'>
								<span>{t('document_podcast_processing')}</span>
								<Spinner />
							</div>
						</Card>
					)}
					{document?.podcast_task?.status === DocumentPodcastStatus.SUCCESS &&
						document?.podcast_task?.podcast_file_name && (
							<Card className='p-5 relative'>
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
						<Alert className='bg-destructive/10 dark:bg-destructive/20'>
							<AlertDescription>
								<span className='inline-flex'>
									{t('document_podcast_failed')}
								</span>
								<Button
									variant={'link'}
									size='sm'
									className='text-muted-foreground underline underline-offset-3 p-0 m-0 ml-auto'
									onClick={() => mutateGeneratePodcast.mutate()}
									disabled={
										mutateGeneratePodcast.isPending ||
										!mainUserInfo?.default_podcast_user_engine_id
									}>
									{t('document_podcast_regenerate')}
									{mutateGeneratePodcast.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
							</AlertDescription>
						</Alert>
					)}
				</>
			)}
		</>
	);
};

export default DocumentPodcast;
