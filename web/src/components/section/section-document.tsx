import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { getSectionDetail, getSectionUser } from '@/service/section';
import SectionDocumentCard from './section-document-card';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { PlusCircleIcon, TableOfContentsIcon } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { UserSectionRole } from '@/enums/section';
import { useUserContext } from '@/provider/user-provider';

const SectionDocument = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const router = useRouter();

	const { userInfo } = useUserContext();

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: async () => {
			return getSectionDetail({ section_id: section_id });
		},
	});

	const { data: sectionUsers, isLoading: isLoadingMembers } = useQuery({
		queryKey: ['getSectionMembers', section_id],
		queryFn: async () => {
			return getSectionUser({
				section_id: section_id,
				filter_roles: [UserSectionRole.MEMBER, UserSectionRole.CERATOR],
			});
		},
	});

	const handleAddDocument = () => {
		const params = new URLSearchParams({
			section_id: section_id.toString(),
		});
		router.push(`/document/create?${params.toString()}`);
	};

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
			<SheetContent className='flex'>
				<SheetHeader>
					<SheetTitle>{t('section_documents')}</SheetTitle>
					<SheetDescription>
						{t('section_documents_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='px-5 flex flex-col gap-5 overflow-auto pb-5 flex-1'>
					{section &&
						section.documents &&
						section.documents.map((document, index) => {
							return <SectionDocumentCard key={index} document={document} />;
						})}
				</div>
				{userInfo &&
					sectionUsers?.users.find((user) => {
						return user.id === userInfo.id;
					}) && (
						<div className='p-5 w-full'>
							<Button className='w-full' onClick={handleAddDocument}>
								{t('section_documents_add')}
								<PlusCircleIcon />
							</Button>
						</div>
					)}
			</SheetContent>
		</Sheet>
	);
};
export default SectionDocument;
