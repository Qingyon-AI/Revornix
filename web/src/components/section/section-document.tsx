import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
	getMineUserRoleAndAuthority,
	searchSectionDocuments,
} from '@/service/section';
import SectionDocumentCard from './section-document-card';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { PlusCircleIcon, TableOfContentsIcon } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { UserSectionRole } from '@/enums/section';

const SectionDocument = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const router = useRouter();

	const handleAddDocument = () => {
		const params = new URLSearchParams({
			section_id: section_id.toString(),
		});
		router.push(`/document/create?${params.toString()}`);
	};

	const { ref: bottomRef, inView } = useInView();
	const {
		data,
		isFetchingNextPage,
		isFetching,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchSectionDocument', section_id, ''],
		queryFn: (pageParam) => searchSectionDocuments({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			section_id: section_id,
			keyword: '',
			desc: true,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						section_id: section_id,
						keyword: '',
						desc: true,
				  }
				: undefined;
		},
	});

	const documents = data?.pages.flatMap((page) => page.elements) || [];

	const { data: sectionUserRoleAndAuthority } = useQuery({
		queryKey: ['getMineUserRoleAndAuthority', section_id],
		queryFn: () => getMineUserRoleAndAuthority({ section_id: section_id }),
	});

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [inView, isFetching, hasNextPage]);

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
					{isSuccess &&
						documents &&
						documents.map((document, index) => {
							return <SectionDocumentCard key={index} document={document} />;
						})}
					{isFetching && !data && (
						<>
							{[...Array(10)].map((number, index) => {
								return <Skeleton className='h-40 w-full' key={index} />;
							})}
						</>
					)}
					{isFetchingNextPage && data && (
						<>
							{[...Array(10)].map((number, index) => {
								return <Skeleton className='h-40 w-full' key={index} />;
							})}
						</>
					)}
					<div ref={bottomRef}></div>
				</div>
				{(sectionUserRoleAndAuthority?.role === UserSectionRole.CERATOR ||
					sectionUserRoleAndAuthority?.role === UserSectionRole.MEMBER) && (
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
