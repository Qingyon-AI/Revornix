import { useTranslations } from 'next-intl';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '../ui/button';
import SectionComments from './section-comments';
import { MessageCircleMore } from 'lucide-react';

const SectionOperateComment = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					title={t('section_comments')}
					variant={'ghost'}
					className='flex-1 text-xs w-full'>
					<MessageCircleMore />
					{t('section_comments')}
				</Button>
			</SheetTrigger>
			<SheetContent className='pt-5 h-full'>
				<VisuallyHidden>
					<SheetTitle>{t('section_comments')}</SheetTitle>
				</VisuallyHidden>
				<div className='px-5 h-full'>
					<SectionComments section_id={section_id} />
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateComment;
