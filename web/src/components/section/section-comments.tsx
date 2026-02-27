'use client';

import { Separator } from '../ui/separator';
import { useTranslations } from 'next-intl';
import SectionCommentForm from './section-comment-form';
import SectionCommentsList from './section-comments-list';

const SectionComments = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();

	return (
		<div className='rounded flex flex-col h-full'>
			<p className='font-bold text-lg mb-3'>{t('section_comments')}</p>
			<div className='flex-1 overflow-auto'>
				<SectionCommentsList section_id={section_id} />
			</div>
			<Separator className='mb-3' />
			<SectionCommentForm section_id={section_id} />
		</div>
	);
};

export default SectionComments;
