'use client';

import type { InifiniteScrollPagnitionDocumentCommentInfo } from '@/service/document';
import DocumentCommentInput from './document-comment-input';
import DocumentCommentsList from './document-comments-list';
import DocumentCommentAnchor from './document-comment-anchor';

const DocumentComments = ({
	document_id,
	anchorCommentId,
	initialData,
	publicMode = false,
	loginHref,
}: {
	document_id: number;
	anchorCommentId?: number;
	initialData?: InifiniteScrollPagnitionDocumentCommentInfo;
	publicMode?: boolean;
	loginHref?: string;
}) => {
	return (
		<div className='flex h-full min-h-0 flex-col gap-4'>
			{anchorCommentId ? (
				<DocumentCommentAnchor
					commentId={anchorCommentId}
					documentId={document_id}
					loginHref={loginHref}
				/>
			) : null}
			<div className='min-h-0 flex-1 overflow-hidden'>
				<DocumentCommentsList
					document_id={document_id}
					initialData={initialData}
					publicMode={publicMode}
				/>
			</div>
			{!publicMode && <DocumentCommentInput document_id={document_id} />}
		</div>
	);
};

export default DocumentComments;
