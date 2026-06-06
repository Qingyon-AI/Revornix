'use client';

import { AudioLines } from 'lucide-react';

import AudioPlayer from '../ui/audio-player';
import { replacePath } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import SidebarTaskNode from '../ui/sidebar-task-node';

type AudioInfoWithTranscriptMeta = {
	speaker_map?: unknown;
};

const normalizeAudioSpeakerMap = (value: unknown): Record<string, string> => {
	if (!value) return {};
	if (typeof value === 'string') {
		try {
			return normalizeAudioSpeakerMap(JSON.parse(value));
		} catch {
			return {};
		}
	}
	if (typeof value !== 'object') return {};
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.filter(
				(entry): entry is [string, string] =>
					typeof entry[1] === 'string',
			)
			.map(([key, speaker]) => [key, speaker.trim() || key]),
	);
};

const DocumentAudio = ({
	document_id,
}: {
	document_id: number;
}) => {
	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id: document_id }),
	});
	const speakerMap = normalizeAudioSpeakerMap(
		(document?.audio_info as AudioInfoWithTranscriptMeta | undefined)
			?.speaker_map,
	);

	return (
		<>
			{document?.audio_info && document?.audio_info.audio_file_name && (
				<SidebarTaskNode
					icon={AudioLines}
					status='Source Audio'
					title={document.title ?? 'Unknown Title'}
					tone='success'
					result={
						<AudioPlayer
							src={document?.audio_info.audio_file_name}
							scriptUrl={
								document.transcribe_task?.segments_file_name ?? undefined
							}
							speakerMap={speakerMap}
							cover={
								document.cover
									? replacePath(document.cover, document.creator.id)
									: undefined
							}
							title={document.title ?? 'Unkown Title'}
							artist={document.creator.nickname ?? 'Unknown Author'}
							className='rounded-[20px]'
						/>
					}
				/>
			)}
		</>
	);
};

export default DocumentAudio;
