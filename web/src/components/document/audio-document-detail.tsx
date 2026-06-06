import { cn, replacePath } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { MarkdownContentSkeleton } from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import {
	cancelDocumentTranscribe,
	getDocumentDetail,
	getDocumentMarkdownContent,
	renameAudioSpeakers,
	transcribeDocument,
} from '@/service/document';
import 'katex/dist/katex.min.css';
import {
	Check,
	Hourglass,
	ListFilter,
	Loader2,
	TriangleAlert,
	Users,
} from 'lucide-react';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useInterval } from 'ahooks';
import { useTranslations } from 'next-intl';
import { useInView } from 'react-intersection-observer';
import { useUserContext } from '@/provider/user-provider';
import { DocumentTranscribeStatus } from '@/enums/document';
import { shouldPollDocumentDetail } from '@/lib/document-task';
import TipTapMarkdownViewer from '../markdown/tiptap-markdown-viewer';
import EngineSelect from '@/components/ai/engine-select';
import { EngineCategory } from '@/enums/engine';
import ResourceConfirmDialog from '@/components/ai/resource-confirm-dialog';
import { NotFoundView } from '../not-found/not-found-view';
import { Button } from '../ui/button';
import { useAudioPlayer } from '@/provider/audio-player-provider';
import { Input } from '../ui/input';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../ui/dialog';
import {
	buildMeetingSpeakers,
	normalizeSpeakerMap,
	parseMeetingTranscript,
	type MeetingSpeakerOption,
} from '@/lib/meeting-transcript';
import type { AudioTranscriptPayload } from '@/lib/audio';

type AudioDocumentInfoWithMeetingMeta = {
	audio_file_name: string;
	meeting_mode?: boolean | null;
	speaker_map?: unknown;
};

const AudioDocumentDetail = ({
	id,
	className,
	onFinishRead,
}: {
	id: number;
	className?: string;
	onFinishRead?: () => void;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const { playTrackAt } = useAudioPlayer();
	const [selectedEngineId, setSelectedEngineId] = useState<number | null>(
		mainUserInfo?.default_audio_transcribe_engine_id ?? null,
	);
	const [isTranscribeDialogOpen, setIsTranscribeDialogOpen] = useState(false);
	const queryClient = getQueryClient();
	const statusContainerClassName = cn(
		'mx-auto w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px] px-4 sm:px-6',
	);
	const statusViewClassName =
		'min-h-[calc(100dvh-14rem)] px-4 py-12 sm:min-h-[calc(100dvh-14.25rem)]';
	const [markdownRendered, setMarkdownRendered] = useState(false);
	const {
		data: document,
		isError,
		error,
	} = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: id }),
	});

	const [delay, setDelay] = useState<number>();
	useInterval(() => {
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
	}, delay);

	useEffect(() => {
		setSelectedEngineId(
			mainUserInfo?.default_audio_transcribe_engine_id ?? null,
		);
	}, [mainUserInfo?.default_audio_transcribe_engine_id]);

	useEffect(() => {
		if (shouldPollDocumentDetail(document)) {
			setDelay(1000);
		} else {
			setDelay(undefined);
		}
	}, [document]);

	const [markdownTransforming, setMarkdowningTransform] = useState(false);
	const [transcribeCancelling, setTranscribeCancelling] = useState(false);
	const [speakerSaving, setSpeakerSaving] = useState(false);
	const [speakerDialogOpen, setSpeakerDialogOpen] = useState(false);
	const [speakerDrafts, setSpeakerDrafts] = useState<Record<string, string>>(
		{},
	);
	const [speakerMapOverride, setSpeakerMapOverride] =
		useState<Record<string, string>>();
	const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all');
	const [markdown, setMarkdown] = useState<string>();
	const [markdownGetError, setMarkdownGetError] = useState<string>();
	const markdownFileName = document?.transcribe_task?.md_file_name;
	const transcriptScriptUrl =
		document?.transcribe_task?.segments_file_name ?? undefined;
	const audioInfo = document?.audio_info as
		| AudioDocumentInfoWithMeetingMeta
		| undefined;
	const serverSpeakerMap = useMemo(
		() => normalizeSpeakerMap(audioInfo?.speaker_map),
		[audioInfo?.speaker_map],
	);
	const activeSpeakerMap = speakerMapOverride ?? serverSpeakerMap;
	const { data: transcriptPayload } = useQuery({
		queryKey: ['getAudioTranscriptPayload', transcriptScriptUrl],
		queryFn: async () => {
			if (!transcriptScriptUrl) return null;
			const response = await fetch(transcriptScriptUrl);
			if (!response.ok) {
				throw new Error(`Failed to load transcript: ${response.status}`);
			}
			return (await response.json()) as AudioTranscriptPayload;
		},
		enabled: Boolean(transcriptScriptUrl),
		retry: false,
	});
	const meetingTranscriptEntries = useMemo(
		() => {
			const entries = markdown
				? parseMeetingTranscript(markdown, activeSpeakerMap)
				: [];
			const segments = transcriptPayload?.segments ?? [];
			if (entries.length === 0 || segments.length === 0) {
				return entries;
			}
			return entries.map((entry, index) => {
				const preciseStart = segments[index]?.start;
				return typeof preciseStart === 'number' &&
					Number.isFinite(preciseStart)
					? { ...entry, startSeconds: preciseStart }
					: entry;
			});
		},
		[activeSpeakerMap, markdown, transcriptPayload?.segments],
	);
	const meetingSpeakers = useMemo(
		() => buildMeetingSpeakers(meetingTranscriptEntries),
		[meetingTranscriptEntries],
	);
	const filteredMeetingEntries = useMemo(
		() =>
			selectedSpeaker === 'all'
				? meetingTranscriptEntries
				: meetingTranscriptEntries.filter(
						(entry) => entry.rawSpeaker === selectedSpeaker,
					),
		[meetingTranscriptEntries, selectedSpeaker],
	);
	const speakerRenameDirty = useMemo(
		() =>
			meetingSpeakers.some((speaker) => {
				const nextDisplaySpeaker = (
					speakerDrafts[speaker.rawSpeaker] ?? speaker.displaySpeaker
				).trim();
				return (
					(nextDisplaySpeaker || speaker.rawSpeaker) !==
					speaker.displaySpeaker
				);
			}),
		[meetingSpeakers, speakerDrafts],
	);
	const audioTrack = useMemo(() => {
		if (!document || !audioInfo?.audio_file_name) return null;
		return {
			src: audioInfo.audio_file_name,
			scriptUrl: transcriptScriptUrl,
			speakerMap: activeSpeakerMap,
			cover: document.cover
				? replacePath(document.cover, document.creator.id)
				: undefined,
			title: document.title ?? 'Unknown Title',
			artist: document.creator.nickname ?? 'Unknown Author',
		};
	}, [
		activeSpeakerMap,
		audioInfo?.audio_file_name,
		document?.cover,
		document?.creator.id,
		document?.creator.nickname,
		transcriptScriptUrl,
		document?.title,
	]);

	useEffect(() => {
		setSpeakerMapOverride(undefined);
	}, [audioInfo?.speaker_map, id]);

	useEffect(() => {
		setSpeakerDrafts((current) => {
			let changed = false;
			const next = { ...current };
			const speakerIds = new Set(
				meetingSpeakers.map((speaker) => speaker.rawSpeaker),
			);
			for (const speaker of meetingSpeakers) {
				if (next[speaker.rawSpeaker] === undefined) {
					next[speaker.rawSpeaker] = speaker.displaySpeaker;
					changed = true;
				}
			}
			for (const speakerId of Object.keys(next)) {
				if (!speakerIds.has(speakerId)) {
					delete next[speakerId];
					changed = true;
				}
			}
			return changed ? next : current;
		});

		if (
			selectedSpeaker !== 'all' &&
			!meetingSpeakers.some(
				(speaker) => speaker.rawSpeaker === selectedSpeaker,
			)
		) {
			setSelectedSpeaker('all');
		}
	}, [meetingSpeakers, selectedSpeaker]);

	const handleMeetingTimestampClick = (seconds: number) => {
		if (!audioTrack) return;
		void playTrackAt(audioTrack, seconds);
	};

	const handleSaveSpeakerRenames = async () => {
		const nextSpeakerMap = { ...activeSpeakerMap };
		const nextSpeakerDrafts = { ...speakerDrafts };
		for (const speaker of meetingSpeakers) {
			const nextDisplaySpeaker = (
				speakerDrafts[speaker.rawSpeaker] ?? speaker.displaySpeaker
			).trim();
			const normalizedSpeaker = nextDisplaySpeaker || speaker.rawSpeaker;
			nextSpeakerMap[speaker.rawSpeaker] = normalizedSpeaker;
			nextSpeakerDrafts[speaker.rawSpeaker] = normalizedSpeaker;
		}
		if (!speakerRenameDirty) {
			setSpeakerDialogOpen(false);
			return;
		}
		setSpeakerSaving(true);
		const [, err] = await utils.to(
			renameAudioSpeakers({
				document_id: id,
				speaker_map: nextSpeakerMap,
			}),
		);
		setSpeakerSaving(false);
		if (err) {
			toast.error(err.message);
			return;
		}
		setSpeakerMapOverride(nextSpeakerMap);
		setSpeakerDrafts(nextSpeakerDrafts);
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', id],
		});
		setSpeakerDialogOpen(false);
		toast.success('说话人已更新');
	};

	const handleReTranscribeDocument = async () => {
		setMarkdowningTransform(true);
		const [res, err] = await utils.to(
			transcribeDocument({
				document_id: id,
				engine_id: selectedEngineId ?? undefined,
			}),
		);
		if (err) {
			toast.error(err.message);
			setMarkdowningTransform(false);
			return;
		}
		setMarkdowningTransform(false);
		setMarkdown(undefined);
		setMarkdownGetError(undefined);
		toast.success(t('document_transform_again'));
		setDelay(1000);
		setIsTranscribeDialogOpen(false);
	};

	const onGetMarkdown = async () => {
		if (
			!document ||
			document.transcribe_task?.status !== DocumentTranscribeStatus.SUCCESS ||
			!document.transcribe_task.md_file_name ||
			!mainUserInfo
		)
			return;

		const [content, err] = await utils.to(
			getDocumentMarkdownContent({
				document_id: id,
			}),
		);
		if (err) {
			setMarkdownGetError(err.message);
			return;
		}
		if (content === null) {
			setMarkdownGetError(t('document_markdown_empty'));
			return;
		}
		setMarkdown(content);
		setMarkdownGetError(undefined);
		setMarkdownRendered(true);
	};

	const handleCancelTranscribe = async () => {
		setTranscribeCancelling(true);
		const [, err] = await utils.to(
			cancelDocumentTranscribe({
				document_id: id,
			}),
		);
		setTranscribeCancelling(false);
		if (err) {
			toast.error(err.message);
			return;
		}
		toast.success(t('cancel'));
		setDelay(1000);
	};

	useEffect(() => {
		if (
			!document ||
			document.transcribe_task?.status !== DocumentTranscribeStatus.SUCCESS ||
			!mainUserInfo
		)
			return;
		onGetMarkdown();
	}, [document?.transcribe_task?.status, markdownFileName, mainUserInfo?.id]);

	const { ref: bottomRef, inView } = useInView();

	useEffect(() => {
		if (!markdownRendered || !inView) return;
		onFinishRead && onFinishRead();
	}, [inView, markdownRendered, onFinishRead]);

	return (
		<div className={cn('w-full relative pt-4', className)}>
			{((isError && error) || markdownGetError) && (
				<div className={statusContainerClassName}>
					<NotFoundView
						code={null}
						icon={TriangleAlert}
						title={t('document_markdown_load_failed')}
						description={error?.message ?? markdownGetError}
						className={statusViewClassName}
					/>
				</div>
			)}
			{document &&
				!isError &&
				!markdownGetError &&
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.TRANSCRIBING && (
					<div className={statusContainerClassName}>
						<NotFoundView
							code={null}
							icon={Loader2}
							iconClassName='animate-spin'
							eyebrow={t('document_transcribe_status_doing')}
							title={t('document_transcribe_doing_title')}
							description={t('document_transcribe_doing')}
							className={statusViewClassName}
							footer={
								<Button
									variant='outline'
									className='rounded-full'
									disabled={transcribeCancelling}
									onClick={() => void handleCancelTranscribe()}>
									{transcribeCancelling ? (
										<Loader2 className='size-4 animate-spin' />
									) : null}
									{t('cancel')}
								</Button>
							}
						/>
					</div>
				)}
			{document &&
				!isError &&
				!markdownGetError &&
				(document.transcribe_task?.status ===
					DocumentTranscribeStatus.WAIT_TO ||
					document.transcribe_task?.status ===
						DocumentTranscribeStatus.CANCELLED ||
					!document.transcribe_task) && (
					<div className={statusContainerClassName}>
						<NotFoundView
							code={null}
							icon={Hourglass}
							eyebrow={t('document_transcribe_status_todo')}
							title={t('document_transcribe_todo')}
							description={t('document_transcribe_todo_tips')}
							className={statusViewClassName}
							footer={
								<Button
									className='rounded-full'
									disabled={markdownTransforming}
									onClick={() => setIsTranscribeDialogOpen(true)}>
									{markdownTransforming ? (
										<Loader2 className='size-4 animate-spin' />
									) : null}
									{t('retry')}
								</Button>
							}
						/>
					</div>
				)}
			{document &&
				!isError &&
				!markdownGetError &&
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.FAILED && (
					<div className={statusContainerClassName}>
						<NotFoundView
							code={null}
							icon={TriangleAlert}
							eyebrow={t('document_transcribe_status_failed')}
							title={t('document_transcribe_failed')}
							description={t('document_transcribe_failed_description')}
							className={statusViewClassName}
							footer={
								<Button
									className='rounded-full'
									disabled={markdownTransforming}
									onClick={() => setIsTranscribeDialogOpen(true)}>
									{markdownTransforming ? (
										<Loader2 className='size-4 animate-spin' />
									) : null}
									{t('retry')}
								</Button>
							}
						/>
					</div>
				)}
			{document &&
				!markdown &&
				!isError &&
				!markdownGetError &&
				document.transcribe_task?.status ===
					DocumentTranscribeStatus.SUCCESS && (
					<MarkdownContentSkeleton className='min-h-[calc(100dvh-14rem)]' />
				)}
			{markdown && !isError && (
				<div className='mx-auto w-full max-w-full md:max-w-[640px] lg:max-w-[800px] xl:max-w-[720px] 2xl:max-w-[960px] overflow-x-hidden px-4 sm:px-6'>
					{meetingTranscriptEntries.length > 0 ? (
						<div className='space-y-5 text-[0.95rem] leading-7'>
							<div className='flex flex-col gap-2 rounded-md border border-border/50 bg-background/55 p-2.5 sm:flex-row sm:items-center sm:justify-between'>
								<div className='flex min-w-0 flex-wrap items-center gap-1.5'>
									<ListFilter className='mx-1 size-4 shrink-0 text-muted-foreground' />
									<Button
										type='button'
										size='sm'
										variant={
											selectedSpeaker === 'all'
												? 'secondary'
												: 'ghost'
										}
										className='h-7 rounded-md px-2.5 text-xs'
										onClick={() => setSelectedSpeaker('all')}>
										全部
										<span className='font-mono text-[11px] opacity-70'>
											{meetingTranscriptEntries.length}
										</span>
									</Button>
									{meetingSpeakers.map((speaker) => (
										<Button
											key={speaker.rawSpeaker}
											type='button'
											size='sm'
											variant={
												selectedSpeaker === speaker.rawSpeaker
													? 'secondary'
													: 'ghost'
											}
											className='h-7 max-w-[10rem] rounded-md px-2.5 text-xs'
											onClick={() =>
												setSelectedSpeaker(speaker.rawSpeaker)
											}>
											<span className='truncate'>
												{speaker.displaySpeaker}
											</span>
											<span className='font-mono text-[11px] opacity-70'>
												{speaker.count}
											</span>
										</Button>
									))}
								</div>

								{meetingSpeakers.length > 0 && (
									<Button
										type='button'
										size='sm'
										variant='ghost'
										className='h-7 shrink-0 rounded-md px-2.5 text-xs'
										onClick={() => setSpeakerDialogOpen(true)}>
										<Users className='size-3.5' />
										说话人
									</Button>
								)}
							</div>

							<div className='space-y-5'>
								{filteredMeetingEntries.map((entry, index) => (
									<div
										key={`${entry.rawSpeaker}-${entry.timestamp}-${index}`}
										className='space-y-2'>
										<div className='flex flex-wrap items-center gap-2'>
											<span className='text-sm font-semibold text-foreground'>
												{entry.displaySpeaker}
											</span>
											{entry.displaySpeaker !==
												entry.rawSpeaker && (
												<span className='text-xs text-muted-foreground'>
													{entry.rawSpeaker}
												</span>
											)}
											<Button
												type='button'
												variant='secondary'
												size='sm'
												className='h-7 rounded-md px-2 font-mono text-sm tabular-nums'
												disabled={!audioTrack}
												onClick={() =>
													handleMeetingTimestampClick(
														entry.startSeconds,
													)
												}>
												{entry.timestamp}
											</Button>
										</div>
										<p className='whitespace-pre-wrap text-foreground'>
											{entry.text}
										</p>
									</div>
								))}
							</div>
						</div>
					) : (
						<TipTapMarkdownViewer content={markdown} />
					)}
					<div className='my-4 w-full rounded-[24px] border border-border/60 bg-background/45 px-4 py-3 text-center text-sm text-muted-foreground sm:mt-6'>
						{t('document_ai_tips')}
					</div>
					<div
						ref={bottomRef}
						className='pointer-events-none absolute inset-x-0 bottom-0 h-px'
					/>
				</div>
			)}
			<Dialog
				open={speakerDialogOpen}
				onOpenChange={setSpeakerDialogOpen}>
				<DialogContent className='flex max-h-[70vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-md'>
					<DialogHeader className='border-b border-border/50 px-5 py-4'>
						<DialogTitle className='flex items-center gap-2 text-base'>
							<Users className='size-4 text-muted-foreground' />
							说话人
						</DialogTitle>
					</DialogHeader>
					<div className='min-h-0 overflow-y-auto px-5 py-3'>
						<div className='space-y-1.5'>
							{meetingSpeakers.map((speaker) => (
								<div
									key={speaker.rawSpeaker}
									className='grid gap-2 rounded-md border border-border/45 bg-muted/10 px-3 py-2 sm:grid-cols-[4.5rem_1fr] sm:items-center'>
									<div className='flex items-baseline gap-1.5 text-sm'>
										<span className='font-semibold text-foreground'>
											{speaker.rawSpeaker}
										</span>
										<span className='font-mono text-[11px] text-muted-foreground'>
											{speaker.count} 段
										</span>
									</div>
									<Input
										value={
											speakerDrafts[speaker.rawSpeaker] ??
											speaker.displaySpeaker
										}
										onChange={(event) =>
											setSpeakerDrafts((current) => ({
												...current,
												[speaker.rawSpeaker]:
													event.target.value,
											}))
										}
										className='h-8 rounded-md bg-background px-2 text-sm'
									/>
								</div>
							))}
						</div>
					</div>
					<DialogFooter className='border-t border-border/50 px-5 py-3'>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='h-8 rounded-md'
							onClick={() => setSpeakerDialogOpen(false)}>
							取消
						</Button>
						<Button
							type='button'
							size='sm'
							className='h-8 rounded-md'
							disabled={speakerSaving || !speakerRenameDirty}
							onClick={() => void handleSaveSpeakerRenames()}>
							{speakerSaving ? (
								<Loader2 className='size-4 animate-spin' />
							) : (
								<Check className='size-4' />
							)}
							保存
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<ResourceConfirmDialog
				open={isTranscribeDialogOpen}
				onOpenChange={setIsTranscribeDialogOpen}
				title={t('retry')}
				description={t('resource_dialog_transcribe_description')}
				confirmLabel={t('retry')}
				confirmDisabled={!selectedEngineId}
				confirmLoading={markdownTransforming}
				onConfirm={() => {
					void handleReTranscribeDocument();
				}}>
				<div className='space-y-2'>
					<p className='text-sm font-medium text-foreground'>
						{t('use_engine')}
					</p>
					<EngineSelect
						category={EngineCategory.STT}
						value={selectedEngineId}
						onChange={setSelectedEngineId}
						className='w-full'
						placeholder={t('setting_default_engine_choose')}
					/>
				</div>
			</ResourceConfirmDialog>
		</div>
	);
};

export default AudioDocumentDetail;
