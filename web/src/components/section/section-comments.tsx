'use client';

import SectionCommentForm from './section-comment-form';
import SectionCommentsList from './section-comments-list';
import SectionCommentAnchor from './section-comment-anchor';

const SectionComments = ({
	section_id,
	anchorCommentId,
	loginHref,
}: {
	section_id: number;
	anchorCommentId?: number;
	loginHref?: string;
}) => {
	return (
		<div className='flex h-full min-h-0 flex-col'>
			{anchorCommentId ? (
				<div className='shrink-0 px-4 pt-4 sm:px-5'>
					<SectionCommentAnchor
						commentId={anchorCommentId}
						sectionId={section_id}
						loginHref={loginHref}
					/>
				</div>
			) : null}
			<div className='min-h-0 flex-1 overflow-hidden px-4 sm:px-5'>
				<SectionCommentsList section_id={section_id} />
			</div>
			<div className='shrink-0 border-t border-border/60'>
				<SectionCommentForm section_id={section_id} flat />
			</div>
		</div>
	);
};

export default SectionComments;
