'use client';

import { AudioLines } from 'lucide-react';

import AudioPlayer from '../ui/audio-player';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import SidebarTaskNode from '../ui/sidebar-task-node';

const DocumentAudio = ({
	document_id,
}: {
	document_id: number;
}) => {
	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id: document_id }),
	});

	return (
		<>
			{document?.audio_info && document?.audio_info.audio_file_name && (
				<SidebarTaskNode
					icon={AudioLines}
					status='Source Audio'
					title={document.title ?? 'Unknown Title'}
					description={document.creator.nickname ?? 'Unknown Author'}
					tone='success'
					result={
						<AudioPlayer
							src={document?.audio_info.audio_file_name}
							cover={
								document.cover ??
								'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
							}
							title={document.title ?? 'Unkown Title'}
							artist={document.creator.nickname ?? 'Unknown Author'}
							className='rounded-[20px] border border-border/35 bg-background/20'
						/>
					}
				/>
			)}
		</>
	);
};

export default DocumentAudio;
