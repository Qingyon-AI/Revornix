import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import {
	getSectionDetail,
	getMineUserRoleAndAuthority,
	retrySectionDocumentIntegration,
	searchSectionDocuments,
} from '@/service/section';
import SectionDocumentCard from './section-document-card';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { Loader2, PlusCircleIcon, RotateCcw, TableOfContentsIcon } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { SectionProcessStatus, UserSectionRole } from '@/enums/section';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { SectionDocumentIntegration } from '@/enums/document';
import { toast } from 'sonner';

const SectionDocument = ({
	section_id,
	className,
	onTriggerClick,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = useQueryClient();

	const handleAddDocument = (section_id: string) => {
		const params = new URLSearchParams({
			section_id: section_id,
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
	const { data: sectionDetail } = useQuery({
		queryKey: ['getSectionDetail', section_id],
		queryFn: () => getSectionDetail({ section_id }),
	});

	const canAddDocument =
		sectionUserRoleAndAuthority?.role === UserSectionRole.CREATOR ||
		sectionUserRoleAndAuthority?.role === UserSectionRole.MEMBER;
	const sectionProcessFailed =
		sectionDetail?.process_task?.status === SectionProcessStatus.FAILED;

	const retryMutation = useMutation({
		mutationFn: (document_id: number) =>
			retrySectionDocumentIntegration({
				section_id,
				document_id,
			}),
		onSuccess() {
			toast.success(t('section_document_retry_submit_success'));
			queryClient.invalidateQueries({
				queryKey: ['searchSectionDocument', section_id],
			});
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section_id],
			});
		},
		onError(error) {
			toast.error(error.message || t('section_document_retry_submit_failed'));
		},
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
					className={cn('w-full flex-1 text-xs', className)}
					onClick={onTriggerClick}>
					<TableOfContentsIcon />
					{t('section_documents')}
				</Button>
			</SheetTrigger>
			<SheetContent className='flex h-full flex-col gap-0 overflow-hidden bg-card/95 pt-0 sm:max-w-xl'>
				<SheetHeader className='border-b border-border/60 px-5 pt-6 pb-3 pr-12 text-left'>
					<SheetTitle>{t('section_documents')}</SheetTitle>
					<SheetDescription className='text-sm leading-6'>
						{t('section_documents_description')}
					</SheetDescription>
				</SheetHeader>
				<div className='min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-4 sm:px-5 sm:pb-4'>
					<div className='flex flex-col gap-4'>
						{isSuccess && documents && documents.length === 0 && (
							<Empty className='rounded-3xl border border-dashed border-border/70 bg-muted/20 py-12'>
								<EmptyHeader>
									<EmptyMedia variant='icon'>
										<TableOfContentsIcon />
									</EmptyMedia>
									<EmptyDescription>{t('documents_empty')}</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
						{isSuccess &&
							documents &&
							documents.map((document, index) => {
								return (
									<div
							key={document.id ?? index}
							ref={
								index === documents.length - 1 ? bottomRef : undefined
							}>
										<SectionDocumentCard
											document={document}
											action={
												canAddDocument &&
												(document.status === SectionDocumentIntegration.FAILED ||
													(sectionProcessFailed &&
														document.status ===
															SectionDocumentIntegration.WAIT_TO)) ? (
													<Button
														variant='outline'
														size='sm'
														className='h-7 rounded-lg border-border/50 bg-card/75 px-2 text-[11px] text-muted-foreground shadow-none hover:bg-card'
														disabled={retryMutation.isPending}
														onClick={(event) => {
															event.preventDefault();
															event.stopPropagation();
															retryMutation.mutate(document.id);
														}}>
														{retryMutation.isPending &&
														retryMutation.variables === document.id ? (
															<Loader2 className='size-3 animate-spin' />
														) : (
															<RotateCcw className='size-3' />
														)}
														{t('section_document_retry')}
													</Button>
												) : undefined
											}
										/>
									</div>
								);
							})}
						{isFetching && !data && (
							<>
								{[...Array(10)].map((_, index) => {
									return (
										<Skeleton className='h-40 w-full rounded-3xl' key={index} />
									);
								})}
							</>
						)}
						{isFetchingNextPage && data && (
							<>
								{[...Array(10)].map((_, index) => {
									return (
										<Skeleton className='h-40 w-full rounded-3xl' key={index} />
									);
								})}
							</>
						)}
					</div>
				</div>
				{canAddDocument && (
					<div className='shrink-0 border-t border-border/60 bg-card/95 px-4 pb-4 pt-3 backdrop-blur sm:px-5 sm:pb-5'>
						<Button
							className='w-full rounded-2xl'
							onClick={() => {
								handleAddDocument(section_id.toString());
							}}>
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
