'use client';

import { Card } from '../ui/card';
import SectionGraph from './section-graph';
import SectionInfo from './section-info';
import SectionMarkdown from './section-markdown';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { Expand, Loader2, OctagonAlert } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateSectionPodcast, getSectionDetail } from '@/service/section';
import { Alert, AlertDescription } from '../ui/alert';
import AudioPlayer from '../ui/audio-player';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { SectionPodcastStatus, SectionProcessStatus } from '@/enums/section';
import { useEffect, useState } from 'react';
import { useInterval } from 'ahooks';
import { useUserContext } from '@/provider/user-provider';
import { Separator } from '../ui/separator';
import SectionOperate from './section-operate';
import { Spinner } from '../ui/spinner';

const SectionContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	const { mainUserInfo } = useUserContext();

	const mutateGeneratePodcast = useMutation({
		mutationFn: () =>
			generateSectionPodcast({
				section_id: id,
			}),
		onSuccess(data, variables, onMutateResult, context) {
			toast.success(t('section_podcast_generate_task_submitted'));
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', id],
			});
		},
		onError(error, variables, onMutateResult, context) {
			toast.error(t('section_podcast_generate_task_submitted_failed'));
			console.error(error);
		},
	});

	const [delay, setDelay] = useState<number | undefined>();
	useInterval(() => {
		queryClient.invalidateQueries({
			queryKey: ['getSectionDetail', id],
		});
	}, delay);

	useEffect(() => {
		if (
			section &&
			section.process_task &&
			section.process_task?.status < SectionProcessStatus.SUCCESS
		) {
			setDelay(1000);
		} else {
			setDelay(undefined);
		}
	}, [section?.process_task?.status]);

	return (
		<div className='px-5 pb-5 md:h-full w-full md:grid md:grid-cols-12 md:gap-5 relative'>
			<div className='md:col-span-8 md:h-full relative min-h-0 flex flex-col'>
				<div className='flex-1 overflow-auto'>
					<SectionMarkdown id={id} />
				</div>
				<Separator className='mb-5' />
				<SectionOperate id={id} className='mb-5 md:mb-0 overflow-auto' />
			</div>

			<div className='md:col-span-4 py-0 md:h-full flex flex-col gap-5 min-h-0 relative'>
				<Card className='py-0 md:flex-1 overflow-auto relative pb-5'>
					<div>
						<SectionInfo id={id} />
					</div>
				</Card>
				<Card className='py-0 md:flex-1 relative'>
					<Dialog>
						<DialogTrigger asChild>
							<Button
								className='absolute top-2 left-2 z-10'
								size={'icon'}
								variant={'outline'}>
								<Expand size={4} className='text-muted-foreground' />
							</Button>
						</DialogTrigger>
						<DialogContent className='max-w-[80vw]! h-[80vh] flex flex-col'>
							<DialogHeader>
								<DialogTitle>{t('section_graph')}</DialogTitle>
								<DialogDescription>
									{t('section_graph_description')}
								</DialogDescription>
							</DialogHeader>
							<div className='flex-1'>
								<SectionGraph section_id={id} />
							</div>
						</DialogContent>
					</Dialog>

					<SectionGraph section_id={id} />
				</Card>

				{section?.creator.id !== mainUserInfo?.id && !section?.podcast_task && (
					<Alert className='bg-destructive/10 dark:bg-destructive/20'>
						<OctagonAlert className='h-4 w-4 text-destructive!' />
						<AlertDescription>
							{t('section_podcast_user_unable')}
						</AlertDescription>
					</Alert>
				)}

				{section?.creator.id === mainUserInfo?.id && !section?.podcast_task && (
					<Alert className='bg-destructive/10 dark:bg-destructive/20'>
						<AlertDescription>
							<span className='inline-flex'>{t('section_podcast_unset')}</span>
							<Button
								variant={'link'}
								size='sm'
								className='inline-flex text-muted-foreground underline underline-offset-3 p-0 m-0 ml-auto'
								onClick={() => mutateGeneratePodcast.mutate()}
								disabled={
									mutateGeneratePodcast.isPending ||
									!mainUserInfo?.default_podcast_user_engine_id
								}>
								{t('section_podcast_generate')}
								{mutateGeneratePodcast.isPending && (
									<Loader2 className='animate-spin' />
								)}
							</Button>
						</AlertDescription>
					</Alert>
				)}

				{!mainUserInfo?.default_podcast_user_engine_id && (
					<Alert className='bg-destructive/10 dark:bg-destructive/20'>
						<OctagonAlert className='h-4 w-4 text-destructive!' />
						<AlertDescription>
							{t('section_form_auto_podcast_engine_unset')}
						</AlertDescription>
					</Alert>
				)}

				<>
					{section?.podcast_task?.status ===
						SectionPodcastStatus.GENERATING && (
						<Card className='p-5 relative'>
							<div className='text-muted-foreground text-xs flex flex-row justify-center items-center gap-2'>
								{t('section_podcast_processing')}
								<Spinner />
							</div>
						</Card>
					)}

					{section?.podcast_task?.status === SectionPodcastStatus.SUCCESS &&
						section?.podcast_task?.podcast_file_name && (
							<Card className='p-5 relative flex flex-col gap-5'>
								<AudioPlayer
									src={section?.podcast_task?.podcast_file_name}
									cover={
										section.cover ??
										'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
									}
									title={section.title ?? 'Unkown Title'}
									artist={'AI Generated'}
								/>
							</Card>
						)}

					{section?.podcast_task?.status === SectionPodcastStatus.FAILED && (
						<Alert className='bg-destructive/10 dark:bg-destructive/20'>
							<AlertDescription>
								<span>{t('section_podcast_failed')}</span>
								<Button
									variant={'link'}
									size='sm'
									className='inline-flex text-muted-foreground underline underline-offset-3 p-0 m-0 ml-auto'
									onClick={() => mutateGeneratePodcast.mutate()}
									disabled={
										mutateGeneratePodcast.isPending ||
										!mainUserInfo?.default_podcast_user_engine_id
									}>
									{t('section_podcast_generate')}
									{mutateGeneratePodcast.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
							</AlertDescription>
						</Alert>
					)}
				</>
			</div>
		</div>
	);
};

export default SectionContainer;
