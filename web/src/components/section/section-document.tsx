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

const SectionDocument = ({ id }: { id: string }) => {
	const t = useTranslations();
	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: Number(id) });
		},
	});

	return (
		<Sheet>
			<SheetTrigger className='text-xs underline w-fit'>
				{t('section_documents_summary', {
					section_documents_count: section?.documents?.length || 0,
				})}
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
