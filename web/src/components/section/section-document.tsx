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
import { TableOfContentsIcon } from 'lucide-react';

const SectionDocument = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: async () => {
			return getSectionDetail({ section_id: section_id });
		},
	});

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					title={t('section_documents')}
					variant={'ghost'}
					className='flex-1 text-xs w-full'>
					<TableOfContentsIcon />
					{t('section_documents')}
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
