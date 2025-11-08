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
import { Expand, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { generateSectionPodcast, getSectionDetail } from '@/service/section';
import { Alert, AlertDescription } from '../ui/alert';
import AudioPlayer from '../ui/audio-player';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { SectionPodcastStatus } from '@/enums/section';

const SectionContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const {
		data: section,
		isFetching,
		isFetched,
	} = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

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

	return (
		<div className='px-5 pb-5 h-full w-full grid grid-cols-12 gap-5 relative'>
			<div className='col-span-8 h-full relative min-h-0'>
				<SectionMarkdown id={id} />
			</div>

			<div className='col-span-4 py-0 h-full flex flex-col gap-5 min-h-0 relative'>
				<Card className='py-0 flex-1 overflow-auto relative pb-5'>
					<div>
						<SectionInfo id={id} />
					</div>
				</Card>
				<Card className='py-0 flex-1 relative'>
					<Dialog>
						<DialogTrigger asChild>
							<Button
								className='absolute top-2 left-2 z-10'
								size={'icon'}
								variant={'outline'}>
								<Expand size={4} className='text-muted-foreground' />
							</Button>
						</DialogTrigger>
						<DialogContent className='!max-w-[80vw] h-[80vh] flex flex-col'>
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

				<Card className='p-5 relative'>
					{!section?.podcast_task && (
						<Alert className='bg-destructive/10 dark:bg-destructive/20 flex flex-row items-center'>
							<AlertDescription className='flex flex-row items-center'>
								<span className='inline-flex'>
									{t('section_podcast_unset')}
								</span>
								<Button
									variant={'link'}
									size='sm'
									className='inline-flex text-muted-foreground underline underline-offset-3 p-0 m-0'
									onClick={() => mutateGeneratePodcast.mutate()}
									disabled={mutateGeneratePodcast.isPending}>
									{t('section_podcast_generate')}
									{mutateGeneratePodcast.isPending && (
										<Loader2 className='animate-spin' />
									)}
								</Button>
							</AlertDescription>
						</Alert>
					)}
					{section?.podcast_task && (
						<>
							{section?.podcast_task?.status ===
								SectionPodcastStatus.PROCESSING && (
								<div className='text-center text-muted-foreground text-xs p-3'>
									{t('section_podcast_processing')}
								</div>
							)}
							{section?.podcast_task?.status === SectionPodcastStatus.SUCCESS &&
								section?.podcast_info?.podcast_file_name && (
									<AudioPlayer
										src={section?.podcast_info?.podcast_file_name}
										cover={
											section.cover ??
											'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
										}
										title={section.title ?? 'Unkown Title'}
										artist={'AI Generated'}
									/>
								)}
							{section?.podcast_task?.status ===
								SectionPodcastStatus.FAILED && (
								<div className='text-center text-muted-foreground text-xs p-3'>
									{t('section_podcast_failed')}
								</div>
							)}
						</>
					)}
				</Card>
			</div>
		</div>
	);
};

export default SectionContainer;
