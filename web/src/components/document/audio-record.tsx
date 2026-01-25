'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
};

type RecordingState = 'idle' | 'recording' | 'paused';
const VISUALIZER_SAMPLE_MS = 20;
const VISUALIZER_PEAKS_PER_SECOND = Math.max(
	1,
	Math.round(1000 / VISUALIZER_SAMPLE_MS),
);

const formatDuration = (ms: number) => {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
		2,
		'0',
	)}`;
};

const AudioRecord = ({
	className,
	onDelete,
	onRecordReady,
}: AudioRecordProps) => {
	const t = useTranslations();
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
	const visualizerTimerRef = useRef<number | null>(null);
	const timerRef = useRef<number | null>(null);
	const startTimestampRef = useRef<number | null>(null);
	const elapsedRef = useRef(0);
	const segmentsRef = useRef<Blob[]>([]);
	const mimeTypeRef = useRef('audio/wav');
	const previewRequestRef = useRef(0);
	const isClearingRef = useRef(false);
	const waveformPeaksRef = useRef<number[]>([]);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
		const peaks = extractPeaksFromBuffer(buffer);
		waveformPeaksRef.current = peaks;
		drawWaveformFromPeaks(peaks);
		setPreviewDurationMs(buffer.duration * 1000);
		onRecordReady?.({
			blob,
			url: nextUrl,
			durationMs,
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

	const extractPeaksFromBuffer = (audioBuffer: AudioBuffer) => {
		const channelCount = audioBuffer.numberOfChannels;
		const samplesPerPeak = Math.max(
			1,
			Math.floor(audioBuffer.sampleRate / VISUALIZER_PEAKS_PER_SECOND),
		);
		const peaks: number[] = [];
		for (let i = 0; i < audioBuffer.length; i += samplesPerPeak) {
			const end = Math.min(i + samplesPerPeak, audioBuffer.length);
			let peak = 0;
			for (let channel = 0; channel < channelCount; channel += 1) {
				const data = audioBuffer.getChannelData(channel);
				for (let j = i; j < end; j += 1) {
					const value = Math.abs(data[j] || 0);
					if (value > peak) {
						peak = value;
					}
				}
			}
			peaks.push(peak);
		}
		return peaks;
	};

	const drawWaveformFromPeaks = (peaks: number[]) => {
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

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 2;
		ctx.strokeStyle = getComputedStyle(canvas).color;
		ctx.beginPath();

		if (!peaks.length || width <= 0 || height <= 0) {
			return;
		}

		const mid = height / 2;
		const peaksLength = peaks.length;
		const step = peaksLength / width;
		for (let x = 0; x < width; x += 1) {
			const start = Math.floor(x * step);
			let end = Math.floor((x + 1) * step);
			if (end <= start) {
				end = Math.min(start + 1, peaksLength);
			}
			let peak = 0;
			for (let i = start; i < end; i += 1) {
				if (peaks[i] > peak) {
					peak = peaks[i];
				}
			}
			const amplitude = peak * mid;
			ctx.moveTo(x, mid - amplitude);
			ctx.lineTo(x, mid + amplitude);
		}

		ctx.stroke();
	};

	const clearWaveform = () => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			return;
		}
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	};

	const startVisualizer = (stream: MediaStream) => {
		const audioContext = new AudioContext();
		const analyser = audioContext.createAnalyser();
		analyser.fftSize = 2048;
		const source = audioContext.createMediaStreamSource(stream);
		source.connect(analyser);
		audioContextRef.current = audioContext;
		analyserRef.current = analyser;
		dataArrayRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));

		if (visualizerTimerRef.current !== null) {
			window.clearInterval(visualizerTimerRef.current);
		}

		visualizerTimerRef.current = window.setInterval(() => {
			if (!analyserRef.current || !dataArrayRef.current) {
				return;
			}
			analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
			let peak = 0;
			for (let i = 0; i < dataArrayRef.current.length; i += 1) {
				const value = Math.abs(dataArrayRef.current[i] - 128) / 128;
				if (value > peak) {
					peak = value;
				}
			}
			waveformPeaksRef.current.push(peak);
			drawWaveformFromPeaks(waveformPeaksRef.current);
		}, VISUALIZER_SAMPLE_MS);
	};

	const stopVisualizer = async () => {
		if (visualizerTimerRef.current !== null) {
			window.clearInterval(visualizerTimerRef.current);
			visualizerTimerRef.current = null;
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
			setElapsedMs(elapsedRef.current + (performance.now() - start));
		}, 200);
	};

	const startRecording = async (resume = false) => {
		if (!resume) {
			segmentsRef.current = [];
			revokeAudioUrl();
			setHasAudio(false);
			elapsedRef.current = 0;
			setElapsedMs(0);
			previewRequestRef.current += 1;
			waveformPeaksRef.current = [];
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

	const pauseRecording = async () => {
		if (mediaRecorderRef.current && recordingState === 'recording') {
			await cleanupStream();
			setRecordingState('paused');
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
		waveformPeaksRef.current = [];
		clearWaveform();
		onDelete?.();
	};

	useEffect(() => {
		return () => {
			isClearingRef.current = true;
			void cleanupStream().finally(() => revokeAudioUrl());
		};
	}, []);

	const primaryActionLabel =
		recordingState === 'recording'
			? t('document_audio_record_pause')
			: recordingState === 'paused'
				? t('document_audio_record_resume')
				: t('document_audio_record_start');
	const canDelete = recordingState !== 'idle' || hasAudio;

	return (
		<div
			className={cn(
				'flex flex-col gap-4 rounded-lg border border-input bg-background p-4 h-full',
				className,
			)}>
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-2 text-sm text-muted-foreground'>
					<Mic className='h-4 w-4' />
					<span>{t('document_audio_record_duration')}</span>
				</div>
				<span className='font-mono text-sm'>{formatDuration(elapsedMs)}</span>
			</div>
			<div className='relative h-40 w-full overflow-hidden rounded-md border border-dashed border-muted-foreground/30 bg-muted/40'>
				<canvas
					ref={canvasRef}
					className='h-full w-full text-primary'
					aria-label={t('document_audio_record_waveform')}
				/>
				{recordingState === 'idle' && (
					<div className='absolute inset-0 flex items-center justify-center text-xs text-muted-foreground'>
						{t('document_audio_record_placeholder')}
					</div>
				)}
			</div>
			{audioUrl && (
				<div className='flex flex-col gap-2'>
					<div className='flex items-center justify-between text-xs text-muted-foreground'>
						<span>{t('document_audio_record_preview')}</span>
						{previewDurationMs !== null && (
							<span>
								{t('document_audio_record_total_duration')}:{' '}
								{formatDuration(previewDurationMs)}
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
					onClick={
						recordingState === 'recording'
							? pauseRecording
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
