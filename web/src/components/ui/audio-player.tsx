'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2 } from 'lucide-react';
import Image from 'next/image';

function formatTime(time: number) {
	const m = Math.floor(time / 60);
	const s = Math.floor(time % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}

interface AudioPlayerProps {
	src: string;
	title?: string;
	artist?: string;
	cover?: string;
}

export default function AudioPlayer({
	src,
	title = 'Unknown Title',
	artist = 'Unknown Artist',
	cover = 'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png',
}: AudioPlayerProps) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState(0);
	const [volume, setVolume] = useState(0.8);

	useEffect(() => {
		const audio = audioRef.current!;
		audio.volume = volume;

		const updateProgress = () => setProgress(audio.currentTime);
		const updateDuration = () => setDuration(audio.duration || 0);
		const handleEnded = () => setPlaying(false);

		audio.addEventListener('timeupdate', updateProgress);
		audio.addEventListener('loadedmetadata', updateDuration);
		audio.addEventListener('ended', handleEnded);

		return () => {
			audio.removeEventListener('timeupdate', updateProgress);
			audio.removeEventListener('loadedmetadata', updateDuration);
			audio.removeEventListener('ended', handleEnded);
		};
	}, []);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = volume;
		}
	}, [volume]);

	const togglePlay = () => {
		const audio = audioRef.current!;
		if (playing) {
			audio.pause();
		} else {
			audio.play();
		}
		setPlaying(!playing);
	};

	const handleSeek = (value: number[]) => {
		if (audioRef.current) {
			audioRef.current.currentTime = value[0];
			setProgress(value[0]);
		}
	};

	return (
		<div className='flex items-center gap-4 p-4'>
			{/* 🎵 封面 */}
			<div className='relative flex-shrink-0'>
				<img
					src={cover}
					alt={title}
					width={80}
					height={80}
					className='rounded-md object-cover shadow'
				/>
			</div>

			{/* 🎧 播放器主体 */}
			<div className='flex flex-col flex-1 min-w-0'>
				{/* 标题与作者 */}
				<div className='flex flex-col mb-2'>
					<h3 className='text-sm font-medium truncate'>{title}</h3>
					<p className='text-xs text-muted-foreground truncate'>{artist}</p>
				</div>

				{/* 播放控制区 */}
				<div className='flex items-center'>
					<Button
						variant='outline'
						size='icon'
						onClick={togglePlay}
						className='rounded-full w-9 h-9'>
						{playing ? (
							<Pause className='h-4 w-4' />
						) : (
							<Play className='h-4 w-4' />
						)}
					</Button>

					{/* 进度条 */}
					<div className='flex items-center gap-2 w-full'>
						<span className='text-xs text-muted-foreground w-10 text-right'>
							{formatTime(progress)}
						</span>
						<Slider
							value={[progress]}
							max={duration}
							step={0.1}
							className='flex-1'
							onValueChange={handleSeek}
						/>
						<span className='text-xs text-muted-foreground w-10'>
							{formatTime(duration)}
						</span>
					</div>

					{/* 音量控制 */}
					<div className='hidden md:flex items-center gap-2 w-28'>
						<Volume2 className='h-4 w-4 text-muted-foreground' />
						<Slider
							value={[volume]}
							max={1}
							step={0.01}
							onValueChange={(v) => setVolume(v[0])}
						/>
					</div>
				</div>
			</div>

			<audio ref={audioRef} src={src} preload='metadata' />
		</div>
	);
}
