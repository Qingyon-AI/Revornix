'use client';

import SectionCommentForm from './section-comment-form';
import SectionCommentsList from './section-comments-list';

const SectionComments = ({ section_id }: { section_id: number }) => {
	return (
		<div className='flex h-full flex-col gap-4'>
			<div className='min-h-0 flex-1 overflow-auto rounded-2xl backdrop-blur-sm'>
				<SectionCommentsList section_id={section_id} />
			</div>
			<SectionCommentForm section_id={section_id} />
		</div>
	);
};

export default SectionComments;
