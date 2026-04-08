'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Eye, FileText, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { DocumentCategory } from '@/enums/document';
import {
	deleteAdminDocuments,
	getAdminDocumentDetail,
	searchAdminDocuments,
	type AdminDocumentSummary,
} from '@/service/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

const getCategoryLabel = (
	category: number,
	t: ReturnType<typeof useTranslations>,
) => {
	switch (category) {
		case DocumentCategory.FILE:
			return t('admin_documents_category_file');
		case DocumentCategory.WEBSITE:
			return t('admin_documents_category_website');
		case DocumentCategory.QUICK_NOTE:
			return t('admin_documents_category_quick_note');
		case DocumentCategory.AUDIO:
			return t('admin_documents_category_audio');
		default:
			return String(category);
	}
};

const AdminDocumentsPage = () => {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [keyword, setKeyword] = useState('');
	const [submittedKeyword, setSubmittedKeyword] = useState('');
	const [pageNum, setPageNum] = useState(1);
	const [pageSize, setPageSize] = useState<'10' | '20' | '50'>('10');
	const [viewDocumentId, setViewDocumentId] = useState<number | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<AdminDocumentSummary | null>(
		null,
	);

	const searchParams = useMemo(
		() => ({
			keyword: submittedKeyword || undefined,
			page_num: pageNum,
			page_size: Number(pageSize),
		}),
		[submittedKeyword, pageNum, pageSize],
	);

	const documentsQuery = useQuery({
		queryKey: ['admin-documents', searchParams],
		queryFn: () => searchAdminDocuments(searchParams),
	});

	const detailQuery = useQuery({
		queryKey: ['admin-document-detail', viewDocumentId],
		queryFn: () => getAdminDocumentDetail(viewDocumentId!),
		enabled: viewDocumentId != null,
	});

	const deleteMutation = useMutation({
		mutationFn: (documentIds: number[]) => deleteAdminDocuments(documentIds),
		onSuccess() {
			toast.success(t('admin_documents_delete_success'));
			setDeleteTarget(null);
			queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
			queryClient.invalidateQueries({ queryKey: ['admin-document-detail'] });
		},
		onError(error: Error) {
			toast.error(error.message);
		},
	});

	const documents = documentsQuery.data?.elements ?? [];

	const handleRefresh = async () => {
		await queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
		await documentsQuery.refetch();
	};

	return (
		<div className='p-6 sm:p-7'>
			<Card className='rounded-[28px] border-border/60 py-0'>
				<CardHeader className='px-6 pt-6'>
					<CardTitle className='flex items-center gap-2 text-2xl tracking-tight'>
						<FileText className='size-5 text-emerald-600 dark:text-emerald-300' />
						{t('admin_documents_title')}
					</CardTitle>
					<CardDescription className='leading-6'>
						{t('admin_documents_description')}
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-5 px-6 pb-6'>
					<div className='flex flex-col gap-3 md:flex-row'>
						<Input
							value={keyword}
							onChange={(event) => setKeyword(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									setPageNum(1);
									setSubmittedKeyword(keyword.trim());
								}
							}}
							placeholder={t('admin_documents_search_placeholder')}
							className='h-10 rounded-xl md:max-w-md'
						/>
						<Button
							onClick={() => {
								setPageNum(1);
								setSubmittedKeyword(keyword.trim());
							}}
							className='rounded-xl'>
							<Search className='size-4' />
							{t('admin_search')}
						</Button>
						<Button
							variant='outline'
							onClick={handleRefresh}
							disabled={documentsQuery.isFetching}
							className='rounded-xl'>
							<RefreshCw
								className={documentsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
							/>
							{t('refresh')}
						</Button>
					</div>
					<div className='flex items-center justify-between gap-3'>
						<div className='text-sm text-muted-foreground'>
							{t('admin_page_size_label')}
						</div>
						<Select
							value={pageSize}
							onValueChange={(value) => {
								setPageSize(value as '10' | '20' | '50');
								setPageNum(1);
							}}>
							<SelectTrigger className='w-[120px]'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='10'>10</SelectItem>
								<SelectItem value='20'>20</SelectItem>
								<SelectItem value='50'>50</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{documentsQuery.isLoading ? (
						<Skeleton className='h-[320px] rounded-[24px]' />
					) : documentsQuery.isError ? (
						<Empty className='rounded-[24px]'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<FileText />
								</EmptyMedia>
								<EmptyTitle>{t('something_wrong')}</EmptyTitle>
								<EmptyDescription>
									{documentsQuery.error.message}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : documents.length === 0 ? (
						<Empty className='rounded-[24px]'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<FileText />
								</EmptyMedia>
								<EmptyTitle>{t('admin_empty_title')}</EmptyTitle>
								<EmptyDescription>
									{t('admin_documents_empty_description')}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<>
							<Table className='table-fixed'>
								<TableHeader>
									<TableRow>
										<TableHead className='w-[46%]'>
											{t('admin_documents_table_title')}
										</TableHead>
										<TableHead>{t('admin_documents_table_category')}</TableHead>
										<TableHead>{t('admin_documents_table_creator')}</TableHead>
										<TableHead>{t('admin_documents_table_source')}</TableHead>
										<TableHead>{t('admin_action')}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{documents.map((document) => (
										<TableRow key={document.id}>
											<TableCell className='w-[46%] whitespace-normal'>
												<div className='min-w-0 space-y-1'>
													<div className='line-clamp-2 break-all font-medium'>
														{document.title}
													</div>
													<div className='line-clamp-1 max-w-full break-all text-xs text-muted-foreground'>
														{document.description || '-'}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant='outline' className='rounded-full'>
													{getCategoryLabel(document.category, t)}
												</Badge>
											</TableCell>
											<TableCell>{document.creator_nickname}</TableCell>
											<TableCell>{document.from_plat}</TableCell>
											<TableCell>
												<div className='flex items-center gap-2'>
													<Button
														variant='outline'
														size='sm'
														onClick={() => setViewDocumentId(document.id)}>
														<Eye className='size-4' />
													</Button>
													<Button variant='outline' size='sm' asChild>
														<Link href={`/document/detail/${document.id}`}>
															<ExternalLink className='size-4' />
														</Link>
													</Button>
													<Button
														variant='destructive'
														size='sm'
														onClick={() => setDeleteTarget(document)}>
														<Trash2 className='size-4' />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<div className='flex items-center justify-between gap-3 pt-2'>
								<div className='text-xs text-muted-foreground'>
									{t('admin_pagination_summary', {
										page: documentsQuery.data?.page_num ?? pageNum,
										totalPages: documentsQuery.data?.total_pages ?? 1,
										total:
											documentsQuery.data?.total_elements ?? documents.length,
									})}
								</div>
								<div className='flex gap-2'>
									<Button
										variant='outline'
										onClick={() => setPageNum((current) => current - 1)}
										disabled={pageNum <= 1}>
										{t('previous_page')}
									</Button>
									<Button
										variant='outline'
										onClick={() => setPageNum((current) => current + 1)}
										disabled={pageNum >= (documentsQuery.data?.total_pages ?? 1)}>
										{t('next_page')}
									</Button>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={viewDocumentId != null}
				onOpenChange={(open) => !open && setViewDocumentId(null)}>
				<DialogContent className='max-w-3xl rounded-[28px]'>
					<DialogHeader>
						<DialogTitle>{t('admin_documents_view_title')}</DialogTitle>
						<DialogDescription>
							{t('admin_documents_view_description')}
						</DialogDescription>
					</DialogHeader>
					{detailQuery.isLoading || !detailQuery.data ? (
						<Skeleton className='h-64 rounded-[24px]' />
					) : (
						<div className='grid gap-4 sm:grid-cols-2'>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4 sm:col-span-2'>
								<div className='text-lg font-semibold'>{detailQuery.data.title}</div>
								<div className='mt-2 text-sm leading-6 text-muted-foreground'>
									{detailQuery.data.description || '-'}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
								<div className='text-xs text-muted-foreground'>
									{t('admin_documents_table_category')}
								</div>
								<div className='mt-2 text-sm font-medium'>
									{getCategoryLabel(detailQuery.data.category, t)}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
								<div className='text-xs text-muted-foreground'>
									{t('admin_documents_table_creator')}
								</div>
								<div className='mt-2 text-sm font-medium'>
									{detailQuery.data.creator.nickname}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
								<div className='text-xs text-muted-foreground'>
									{t('admin_documents_table_source')}
								</div>
								<div className='mt-2 text-sm font-medium'>
									{detailQuery.data.from_plat}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
								<div className='text-xs text-muted-foreground'>
									{t('admin_documents_table_section_count')}
								</div>
								<div className='mt-2 text-sm font-medium'>
									{detailQuery.data.sections?.length ?? 0}
								</div>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant='outline' asChild>
							<Link href={`/document/detail/${viewDocumentId ?? detailQuery.data?.id ?? ''}`}>
								<ExternalLink className='size-4' />
								{t('admin_open_detail_page')}
							</Link>
						</Button>
						<Button variant='outline' onClick={() => setViewDocumentId(null)}>
							{t('done')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={deleteTarget != null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}>
				<AlertDialogContent className='rounded-[28px]'>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('admin_documents_delete_title')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('admin_documents_delete_description', {
								title: deleteTarget?.title ?? '',
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								deleteTarget && deleteMutation.mutate([deleteTarget.id])
							}
							className='bg-destructive text-white hover:bg-destructive/90'>
							{deleteMutation.isPending ? (
								<Loader2 className='size-4 animate-spin' />
							) : null}
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default AdminDocumentsPage;
