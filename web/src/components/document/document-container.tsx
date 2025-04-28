'use client';

import WebsiteDocumentDetail from '@/components/document/website-document-detail';
import DocumentInfo from './document-info';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetail } from '@/service/document';
import FileDocumentDetail from './file-document-detail';
import QuickDocumentDetail from './quick-note-document-detail';

const DocumentContainer = ({ id }: { id: string }) => {
	const { data: document } = useQuery({
		queryKey: ['getDocumentDetail', id],
		queryFn: () => getDocumentDetail({ document_id: Number(id) }),
	});
	return (
		<div className='h-full flex flex-row gap-5 px-5 pb-5'>
			<div className='flex-1 overflow-auto'>
				{document?.category === 1 && <WebsiteDocumentDetail id={id} />}
				{document?.category === 0 && <FileDocumentDetail id={id} />}
				{document?.category === 2 && <QuickDocumentDetail id={id} />}
			</div>

			<Card
				className='flex-1 hidden py-0 md:flex overflow-hidden'
				style={{ flex: '1 1 0' }}>
				<DocumentInfo id={id} />
			</Card>
		</div>
	);
};

export default DocumentContainer;
