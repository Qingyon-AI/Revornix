'use client';

import SectionCommentForm from './section-comment-form';
import SectionCommentsList from './section-comments-list';
import SectionCommentAnchor from './section-comment-anchor';

const SectionComments = ({
	section_id,
	anchorCommentId,
}: {
	section_id: number;
	anchorCommentId?: number;
}) => {
	return (
		<div className='flex h-full min-h-0 flex-col gap-4'>
			{anchorCommentId ? (
				<SectionCommentAnchor commentId={anchorCommentId} />
			) : null}
			<div className='min-h-0 flex-1 overflow-hidden'>
				<SectionCommentsList section_id={section_id} />
			</div>
			<SectionCommentForm section_id={section_id} />
		</div>
	);
};

export default SectionComments;
