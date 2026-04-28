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
		<div className='flex h-full min-h-0 flex-col'>
			{anchorCommentId ? (
				<div className='shrink-0 px-4 pt-4 sm:px-5'>
					<DocumentCommentAnchor
						commentId={anchorCommentId}
						documentId={document_id}
						loginHref={loginHref}
					/>
				</div>
			) : null}
			<div className='min-h-0 flex-1 overflow-hidden px-4 sm:px-5'>
				<DocumentCommentsList
					document_id={document_id}
					initialData={initialData}
					publicMode={publicMode}
					loginHref={loginHref}
				/>
			</div>
			{!publicMode && (
				<div className='shrink-0 border-t border-border/60'>
					<DocumentCommentInput document_id={document_id} flat />
				</div>
			)}
		</div>
	);
};

export default DocumentComments;
