'use client';

import AudioPlayer from '../ui/audio-player';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import { Card } from '../ui/card';

const DocumentAudio = ({ document_id }: { document_id: number }) => {
	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', document_id],
		queryFn: () => getDocumentDetail({ document_id: document_id }),
	});

	return (
		<>
			{document?.audio_info && document?.audio_info.audio_file_name && (
				<Card className='p-5 relative'>
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
