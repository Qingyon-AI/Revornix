import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { getSectionDetail } from '@/service/section';
import SectionDocumentCard from './section-document-card';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';

const SectionDocument = ({ id }: { id: number }) => {
	const t = useTranslations();
	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant={'secondary'} className='text-xs text-muted-foreground underline w-full rounded'>
					{t('section_documents_summary', {
						section_documents_count: section?.documents?.length || 0,
					})}
				</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{t('section_documents')}</SheetTitle>
					<SheetDescription>
						{t('section_documents_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='px-5 flex flex-col gap-5 overflow-auto pb-5'>
					{section &&
						section.documents &&
						section.documents.map((document, index) => {
							return <SectionDocumentCard key={index} document={document} />;
						})}
				</div>
			</SheetContent>
		</Sheet>
	);
};
export default SectionDocument;
