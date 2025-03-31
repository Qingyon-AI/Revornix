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

const SectionDocument = ({ id }: { id: string }) => {
	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: Number(id) });
		},
	});

	return (
		<Sheet>
			<SheetTrigger className='text-xs underline w-fit'>
				该专栏当前共收录并分析
				<span className='font-bold text-sm px-1'>
					{section?.documents?.length || 0}
				</span>
				篇文档
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>关联文档</SheetTitle>
					<SheetDescription>
						这里可以查看本文章关联的所有文档。
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
