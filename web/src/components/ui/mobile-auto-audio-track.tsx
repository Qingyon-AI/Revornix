'use client';

import { useEffect } from 'react';

import type { AudioTrackInfo } from '@/lib/audio';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAudioPlayer } from '@/provider/audio-player-provider';

const MobileAutoAudioTrack = ({
	src,
	title,
	artist,
	cover,
}: AudioTrackInfo) => {
	const isMobile = useIsMobile();
	const { registerTrack } = useAudioPlayer();

	useEffect(() => {
		if (!isMobile || !src) {
			return;
		}

		registerTrack({
			src,
			title,
			artist,
			cover,
		});
	}, [artist, cover, isMobile, registerTrack, src, title]);

	return null;
};

export default MobileAutoAudioTrack;
