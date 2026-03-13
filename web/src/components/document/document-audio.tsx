'use client';

import AudioPlayer from '../ui/audio-player';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';

const DocumentAudio = ({
	document_id,
	className,
}: {
	document_id: number;
	className?: string;
}) => {
	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id: document_id }),
	});

	return (
		<>
			{document?.audio_info && document?.audio_info.audio_file_name && (
				<Card
					className={cn(
						'relative gap-0 rounded-[30px] border border-border/60 bg-card/85 p-4 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur',
						className,
					)}>
					<AudioPlayer
						src={document?.audio_info.audio_file_name}
						cover={
							document.cover ??
							'https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/20251101140344640.png'
						}
						title={document.title ?? 'Unkown Title'}
						artist={document.creator.nickname ?? 'Unknown Author'}
					/>
				</Card>
			)}
		</>
	);
};

export default DocumentAudio;
