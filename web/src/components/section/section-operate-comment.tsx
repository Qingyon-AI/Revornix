import { useTranslations } from 'next-intl';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '../ui/sheet';
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
			<SheetContent className='h-full gap-3'>
				<SheetHeader className='px-5 pb-0 pr-12 text-left'>
					<SheetTitle>{t('section_comments')}</SheetTitle>
					<SheetDescription>
						{t('section_comments_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='h-full px-5 pb-5'>
					<SectionComments section_id={section_id} />
				</div>
			</SheetContent>
		</Sheet>
	);
};

export default SectionOperateComment;
