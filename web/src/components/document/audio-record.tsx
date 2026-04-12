'use client';

import { useEffect, useRef, useState } from 'react';
import { Info, Mic, Pause, Play, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	AUDIO_DOCUMENT_MAX_DURATION_MS,
	formatLiveMediaDuration,
	formatMediaDuration,
} from '@/lib/document-media';

export type AudioRecordResult = {
	blob: Blob;
	url: string;
	durationMs: number;
	mimeType: string;
};

type AudioRecordProps = {
	className?: string;
	onDelete?: () => void;
	onRecordReady?: (result: AudioRecordResult) => void;
	maxDurationMs?: number;
};

type RecordingState = 'idle' | 'recording' | 'paused';
const VISUALIZER_BAR_COUNT = 40;

const createAmbientBars = (tick = 0) =>
	Array.from({ length: VISUALIZER_BAR_COUNT }, (_, index) => {
		const base = 0.14 + ((Math.sin(index * 0.52) + 1) / 2) * 0.12;
		const drift = ((Math.sin(tick / 520 + index * 0.38) + 1) / 2) * 0.08;
		return Math.min(0.42, base + drift);
	});

const buildVisualizerBars = (
	data: Uint8Array<ArrayBuffer>,
	previousBars: number[],
) => {
	const binsPerBar = Math.max(1, Math.floor(data.length / VISUALIZER_BAR_COUNT));
	return Array.from({ length: VISUALIZER_BAR_COUNT }, (_, index) => {
		const start = index * binsPerBar;
		const end = Math.min(data.length, start + binsPerBar);
		let total = 0;
		for (let i = start; i < end; i += 1) {
			total += data[i] ?? 0;
		}
		const average = end > start ? total / (end - start) : 0;
		const emphasis = 1 - (index / VISUALIZER_BAR_COUNT) * 0.22;
		const normalized = Math.pow((average / 255) * emphasis, 0.86);
		const previous = previousBars[index] ?? 0;
		return Math.max(0.06, Math.min(1, previous * 0.58 + normalized * 0.72));
	});
};

const AudioRecord = ({
	className,
	onDelete,
	onRecordReady,
	maxDurationMs = AUDIO_DOCUMENT_MAX_DURATION_MS,
}: AudioRecordProps) => {
	const t = useTranslations();
	const { resolvedTheme } = useTheme();
	const [recordingState, setRecordingState] = useState<RecordingState>('idle');
	const [elapsedMs, setElapsedMs] = useState(0);
	const [hasAudio, setHasAudio] = useState(false);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [previewDurationMs, setPreviewDurationMs] = useState<number | null>(
		null,
	);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
	const visualizerFrameRef = useRef<number | null>(null);
	const timerRef = useRef<number | null>(null);
	const startTimestampRef = useRef<number | null>(null);
	const elapsedRef = useRef(0);
	const segmentsRef = useRef<Blob[]>([]);
	const mimeTypeRef = useRef('audio/wav');
	const previewRequestRef = useRef(0);
	const isClearingRef = useRef(false);
	const visualizerBarsRef = useRef<number[]>(createAmbientBars());
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const durationLimitTriggeredRef = useRef(false);

	const durationLimitLabel = formatMediaDuration(maxDurationMs);
	const hasReachedDurationLimit = elapsedMs >= maxDurationMs;
	const isDarkMode = resolvedTheme === 'dark';

	const revokeAudioUrl = () => {
		setAudioUrl((current) => {
			if (current) {
				URL.revokeObjectURL(current);
			}
			return null;
		});
		setPreviewDurationMs(null);
	};

	const encodeWav = (audioBuffer: AudioBuffer) => {
		const numChannels = audioBuffer.numberOfChannels;
		const sampleRate = audioBuffer.sampleRate;
		const bytesPerSample = 2;
		const blockAlign = numChannels * bytesPerSample;
		const dataLength = audioBuffer.length * blockAlign;
		const buffer = new ArrayBuffer(44 + dataLength);
		const view = new DataView(buffer);

		const writeString = (offset: number, value: string) => {
			for (let i = 0; i < value.length; i += 1) {
				view.setUint8(offset + i, value.charCodeAt(i));
			}
		};

		writeString(0, 'RIFF');
		view.setUint32(4, 36 + dataLength, true);
		writeString(8, 'WAVE');
		writeString(12, 'fmt ');
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, numChannels, true);
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, sampleRate * blockAlign, true);
		view.setUint16(32, blockAlign, true);
		view.setUint16(34, bytesPerSample * 8, true);
		writeString(36, 'data');
		view.setUint32(40, dataLength, true);

		let offset = 44;
		for (let i = 0; i < audioBuffer.length; i += 1) {
			for (let channel = 0; channel < numChannels; channel += 1) {
				const channelData = audioBuffer.getChannelData(channel);
				let sample = channelData[i] || 0;
				sample = Math.max(-1, Math.min(1, sample));
				view.setInt16(
					offset,
					sample < 0 ? sample * 0x8000 : sample * 0x7fff,
					true,
				);
				offset += 2;
			}
		}

		return buffer;
	};

	const mergeSegmentsToWav = async (segments: Blob[]) => {
		const audioContext = new AudioContext();
		try {
			const buffers: AudioBuffer[] = [];
			for (const segment of segments) {
				const arrayBuffer = await segment.arrayBuffer();
				const decoded = await audioContext.decodeAudioData(arrayBuffer);
				buffers.push(decoded);
			}
			const totalLength = buffers.reduce(
				(sum, buffer) => sum + buffer.length,
				0,
			);
			const channelCount = Math.max(
				1,
				...buffers.map((buffer) => buffer.numberOfChannels),
			);
			const combinedBuffer = audioContext.createBuffer(
				channelCount,
				totalLength,
				audioContext.sampleRate,
			);
			for (let channel = 0; channel < channelCount; channel += 1) {
				const combinedData = combinedBuffer.getChannelData(channel);
				let offset = 0;
				for (const buffer of buffers) {
					const segmentData =
						channel < buffer.numberOfChannels
							? buffer.getChannelData(channel)
							: new Float32Array(buffer.length);
					combinedData.set(segmentData, offset);
					offset += buffer.length;
				}
			}
			return {
				blob: new Blob([encodeWav(combinedBuffer)], { type: 'audio/wav' }),
				buffer: combinedBuffer,
			};
		} finally {
			await audioContext.close();
		}
	};

	const updatePreviewFromSegments = async (durationMs: number) => {
		if (!segmentsRef.current.length) {
			return;
		}
		const requestId = previewRequestRef.current + 1;
		previewRequestRef.current = requestId;

		const segments = [...segmentsRef.current];
		const multipleSegments = segments.length > 1;
		let blob: Blob;
		let buffer: AudioBuffer;
		let mimeType: string;
		if (multipleSegments) {
			const merged = await mergeSegmentsToWav(segments);
			blob = merged.blob;
			buffer = merged.buffer;
			mimeType = 'audio/wav';
		} else {
			const audioContext = new AudioContext();
			try {
				const arrayBuffer = await segments[0].arrayBuffer();
				buffer = await audioContext.decodeAudioData(arrayBuffer);
			} finally {
				await audioContext.close();
			}
			blob = new Blob([encodeWav(buffer)], { type: 'audio/wav' });
			mimeType = 'audio/wav';
		}

		if (previewRequestRef.current !== requestId) {
			return;
		}

		const nextUrl = URL.createObjectURL(blob);
		setAudioUrl((current) => {
			if (current) {
				URL.revokeObjectURL(current);
			}
			return nextUrl;
		});
		const nextDurationMs = Math.round(buffer.duration * 1000);
		const resolvedDurationMs =
			durationMs > 0
				? Math.min(nextDurationMs || durationMs, durationMs)
				: nextDurationMs;
		drawVisualizerBars(visualizerBarsRef.current, 'paused');
		setPreviewDurationMs(resolvedDurationMs);
		onRecordReady?.({
			blob,
			url: nextUrl,
			durationMs: resolvedDurationMs,
			mimeType,
		});
	};

	const stopTimer = () => {
		if (startTimestampRef.current !== null) {
			elapsedRef.current += performance.now() - startTimestampRef.current;
			startTimestampRef.current = null;
		}
		if (timerRef.current !== null) {
			window.clearInterval(timerRef.current);
			timerRef.current = null;
		}
		setElapsedMs(elapsedRef.current);
	};

	const drawVisualizerBars = (
		bars: number[],
		mode: 'idle' | 'recording' | 'paused' = 'idle',
	) => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}

		const ratio = window.devicePixelRatio || 1;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (width && height) {
			const nextWidth = Math.floor(width * ratio);
			const nextHeight = Math.floor(height * ratio);
			if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
				canvas.width = nextWidth;
				canvas.height = nextHeight;
			}
			ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
		}

		ctx.clearRect(0, 0, width, height);
		if (!bars.length || width <= 0 || height <= 0) {
			return;
		}

		if (isDarkMode) {
			const background = ctx.createLinearGradient(0, 0, width, height);
			background.addColorStop(0, 'rgba(15, 23, 42, 0.16)');
			background.addColorStop(1, 'rgba(15, 23, 42, 0.04)');
			ctx.fillStyle = background;
			ctx.fillRect(0, 0, width, height);
		}

		const mid = height / 2;
		ctx.strokeStyle =
			mode === 'recording'
				? isDarkMode
					? 'rgba(148, 163, 184, 0.20)'
					: 'rgba(148, 163, 184, 0.12)'
				: isDarkMode
					? 'rgba(148, 163, 184, 0.12)'
					: 'rgba(148, 163, 184, 0.08)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, mid);
		ctx.lineTo(width, mid);
		ctx.stroke();

		const gap = 3;
		const barWidth = Math.max(
			4,
			(width - gap * (bars.length - 1)) / bars.length,
		);
		const maxBarHeight = height * (mode === 'recording' ? 0.82 : 0.66);
		const minBarHeight = mode === 'recording' ? 12 : 8;
		const gradient = ctx.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, 'rgba(52, 211, 153, 0.95)');
		gradient.addColorStop(0.55, 'rgba(34, 211, 238, 0.92)');
		gradient.addColorStop(1, 'rgba(14, 165, 233, 0.92)');

		ctx.fillStyle = gradient;
		ctx.shadowColor =
			mode === 'recording'
				? 'rgba(34, 211, 238, 0.34)'
				: isDarkMode
					? 'rgba(34, 211, 238, 0.18)'
					: 'rgba(34, 211, 238, 0.12)';
		ctx.shadowBlur = mode === 'recording' ? 20 : 10;

		bars.forEach((bar, index) => {
			const amplitude =
				mode === 'recording' ? Math.min(1, bar * 1.1) : Math.min(0.72, bar);
			const barHeight = minBarHeight + amplitude * maxBarHeight;
			const x = index * (barWidth + gap);
			const y = (height - barHeight) / 2;
			ctx.beginPath();
			ctx.roundRect(x, y, barWidth, barHeight, Math.min(barWidth / 2, 999));
			ctx.fill();
		});
		ctx.shadowBlur = 0;
	};

	const clearWaveform = () => {
		visualizerBarsRef.current = createAmbientBars();
		drawVisualizerBars(visualizerBarsRef.current, 'idle');
	};

	const startVisualizer = (stream: MediaStream) => {
		const audioContext = new AudioContext();
		const analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		analyser.smoothingTimeConstant = 0.78;
		const source = audioContext.createMediaStreamSource(stream);
		source.connect(analyser);
		audioContextRef.current = audioContext;
		analyserRef.current = analyser;
		dataArrayRef.current = new Uint8Array(
			new ArrayBuffer(analyser.frequencyBinCount),
		);

		if (visualizerFrameRef.current !== null) {
			window.cancelAnimationFrame(visualizerFrameRef.current);
		}

		const render = () => {
			if (!analyserRef.current || !dataArrayRef.current) {
				return;
			}
			analyserRef.current.getByteFrequencyData(dataArrayRef.current);
			visualizerBarsRef.current = buildVisualizerBars(
				dataArrayRef.current,
				visualizerBarsRef.current,
			);
			drawVisualizerBars(visualizerBarsRef.current, 'recording');
			visualizerFrameRef.current = window.requestAnimationFrame(render);
		};
		render();
	};

	const stopVisualizer = async () => {
		if (visualizerFrameRef.current !== null) {
			window.cancelAnimationFrame(visualizerFrameRef.current);
			visualizerFrameRef.current = null;
		}
		if (audioContextRef.current) {
			await audioContextRef.current.close();
			audioContextRef.current = null;
		}
		analyserRef.current = null;
		dataArrayRef.current = null;
	};

	const cleanupStream = async () => {
		stopTimer();
		await stopVisualizer();
		if (mediaRecorderRef.current) {
			if (mediaRecorderRef.current.state !== 'inactive') {
				try {
					mediaRecorderRef.current.stop();
				} catch {
					// Ignore stop errors during cleanup.
				}
			}
			mediaRecorderRef.current = null;
		}
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
	};

	const startTimer = () => {
		startTimestampRef.current = performance.now();
		if (timerRef.current !== null) {
			window.clearInterval(timerRef.current);
		}
		timerRef.current = window.setInterval(() => {
			const start = startTimestampRef.current ?? performance.now();
			const nextElapsedMs = elapsedRef.current + (performance.now() - start);
			if (nextElapsedMs >= maxDurationMs) {
				elapsedRef.current = maxDurationMs;
				startTimestampRef.current = null;
				setElapsedMs(maxDurationMs);
				if (!durationLimitTriggeredRef.current) {
					durationLimitTriggeredRef.current = true;
					void pauseRecording(true);
				}
				return;
			}
			setElapsedMs(nextElapsedMs);
		}, 200);
	};

	const startRecording = async (resume = false) => {
		if (elapsedRef.current >= maxDurationMs) {
			toast.error(
				t('document_audio_record_limit_reached', {
					duration: durationLimitLabel,
				}),
			);
			return;
		}
		if (!resume) {
			segmentsRef.current = [];
			revokeAudioUrl();
			setHasAudio(false);
			elapsedRef.current = 0;
			setElapsedMs(0);
			previewRequestRef.current += 1;
			durationLimitTriggeredRef.current = false;
			visualizerBarsRef.current = createAmbientBars();
			clearWaveform();
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			isClearingRef.current = false;

			const sessionChunks: Blob[] = [];
			const recorder = new MediaRecorder(stream);
			mimeTypeRef.current = recorder.mimeType || 'audio/wav';
			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					sessionChunks.push(event.data);
					setHasAudio(true);
				}
			};
			recorder.onstop = () => {
				if (isClearingRef.current) {
					return;
				}
				if (!sessionChunks.length) {
					return;
				}
				const sessionBlob = new Blob(sessionChunks, {
					type: mimeTypeRef.current,
				});
				segmentsRef.current.push(sessionBlob);
				setHasAudio(true);
				void updatePreviewFromSegments(elapsedRef.current);
			};
			recorder.start(1000);
			mediaRecorderRef.current = recorder;

			startVisualizer(stream);
			startTimer();
			setRecordingState('recording');
		} catch (error) {
			toast.error(t('document_audio_record_permission_denied'));
			console.error(error);
		}
	};

	const pauseRecording = async (reachedLimit = false) => {
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state !== 'inactive') {
			await cleanupStream();
			setRecordingState('paused');
			drawVisualizerBars(visualizerBarsRef.current, 'paused');
			if (reachedLimit) {
				toast.error(
					t('document_audio_record_limit_reached', {
						duration: durationLimitLabel,
					}),
				);
			}
		}
	};

	const handleDelete = async () => {
		isClearingRef.current = true;
		await cleanupStream();
		segmentsRef.current = [];
		elapsedRef.current = 0;
		setElapsedMs(0);
		setHasAudio(false);
		setRecordingState('idle');
		revokeAudioUrl();
		previewRequestRef.current += 1;
		durationLimitTriggeredRef.current = false;
		visualizerBarsRef.current = createAmbientBars();
		clearWaveform();
		onDelete?.();
	};

	useEffect(() => {
		clearWaveform();
	}, []);

	useEffect(() => {
		const handleResize = () => {
			const mode =
				recordingState === 'recording'
					? 'recording'
					: hasAudio
						? 'paused'
						: 'idle';
			drawVisualizerBars(visualizerBarsRef.current, mode);
		};
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, [hasAudio, isDarkMode, recordingState]);

	useEffect(() => {
		const mode =
			recordingState === 'recording'
				? 'recording'
				: hasAudio
					? 'paused'
					: 'idle';
		drawVisualizerBars(visualizerBarsRef.current, mode);
	}, [hasAudio, isDarkMode, recordingState]);

	useEffect(() => {
		return () => {
			isClearingRef.current = true;
			void cleanupStream().finally(() => revokeAudioUrl());
		};
	}, []);

	const primaryActionLabel =
		hasReachedDurationLimit && recordingState !== 'recording'
			? t('document_audio_record_limit_tag', {
					duration: durationLimitLabel,
				})
			: recordingState === 'recording'
			? t('document_audio_record_pause')
			: recordingState === 'paused'
				? t('document_audio_record_resume')
				: t('document_audio_record_start');
	const canDelete = recordingState !== 'idle' || hasAudio;

	return (
		<div
			className={cn(
				'flex flex-col gap-4 rounded-xl border border-input bg-background p-4 h-full',
				className,
			)}>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-2 text-sm text-muted-foreground'>
					<Mic className='h-4 w-4' />
					<span>{t('document_audio_record_duration')}</span>
				</div>
				<div className='flex items-center gap-3'>
					<span className='text-xs text-muted-foreground'>
						{t('document_audio_record_limit_tag', {
							duration: durationLimitLabel,
						})}
					</span>
					<span className='font-mono text-sm'>
						{formatLiveMediaDuration(elapsedMs)}
					</span>
				</div>
			</div>
			<div className='flex items-start gap-2 rounded-xl border border-border/60 bg-muted/35 px-3 py-2 text-xs leading-5 text-muted-foreground'>
				<Info className='mt-0.5 size-3.5 shrink-0' />
				<span>
					{t('document_audio_record_limit_hint', {
						duration: durationLimitLabel,
					})}
				</span>
			</div>
			<div className='relative h-40 w-full overflow-hidden rounded-xl border border-emerald-500/15 bg-transparent dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(26,189,178,0.16),transparent_30%),linear-gradient(180deg,rgba(20,23,42,0.02),rgba(18,23,32,0.12))]'>
				<div className='pointer-events-none absolute inset-0 hidden dark:block'>
					<div className='absolute left-6 top-6 h-16 w-16 rounded-full bg-emerald-400/10 blur-2xl animate-pulse' />
					<div className='absolute right-8 bottom-8 h-20 w-20 rounded-full bg-sky-400/10 blur-3xl animate-pulse [animation-delay:-1.2s]' />
				</div>
				<canvas
					ref={canvasRef}
					className='relative h-full w-full text-primary'
					aria-label={t('document_audio_record_waveform')}
				/>
			</div>
			{hasReachedDurationLimit && (
				<div className='rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200'>
					{t('document_audio_record_limit_reached', {
						duration: durationLimitLabel,
					})}
				</div>
			)}
			{audioUrl && (
				<div className='flex flex-col gap-2'>
					<div className='flex items-center justify-between text-xs text-muted-foreground'>
						<span>{t('document_audio_record_preview')}</span>
						{previewDurationMs !== null && (
							<span>
								{t('document_audio_record_total_duration')}:{' '}
								{formatMediaDuration(previewDurationMs)}
							</span>
						)}
					</div>
					<audio
						ref={audioRef}
						controls
						preload='metadata'
						src={audioUrl}
						className='w-full'
					/>
				</div>
			)}
			<div className='flex items-center gap-2'>
				<Button
					type='button'
					disabled={hasReachedDurationLimit && recordingState !== 'recording'}
					onClick={
						recordingState === 'recording'
							? () => pauseRecording()
							: () => startRecording(recordingState === 'paused')
					}>
					{recordingState === 'recording' ? (
						<Pause className='h-4 w-4' />
					) : recordingState === 'paused' ? (
						<Play className='h-4 w-4' />
					) : (
						<Mic className='h-4 w-4' />
					)}
					<span className='ml-2'>{primaryActionLabel}</span>
				</Button>
				<Button
					type='button'
					variant='secondary'
					onClick={handleDelete}
					disabled={!canDelete}>
					<Trash2 className='h-4 w-4' />
					<span className='ml-2'>{t('document_audio_record_delete')}</span>
				</Button>
			</div>
		</div>
	);
};

export default AudioRecord;
