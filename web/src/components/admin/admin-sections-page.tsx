'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Eye, Loader2, RefreshCw, Search, Trash2, Waypoints } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
	deleteAdminSections,
	getAdminSectionDetail,
	searchAdminSections,
	type AdminSectionSummary,
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
import { ResourceCardSkeleton, TablePanelSkeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

const AdminSectionsPage = () => {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [keyword, setKeyword] = useState('');
	const [submittedKeyword, setSubmittedKeyword] = useState('');
	const [pageNum, setPageNum] = useState(1);
	const [pageSize, setPageSize] = useState<'10' | '20' | '50'>('10');
	const [viewSectionId, setViewSectionId] = useState<number | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<AdminSectionSummary | null>(
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

	const sectionsQuery = useQuery({
		queryKey: ['admin-sections', searchParams],
		queryFn: () => searchAdminSections(searchParams),
	});

	const detailQuery = useQuery({
		queryKey: ['admin-section-detail', viewSectionId],
		queryFn: () => getAdminSectionDetail(viewSectionId!),
		enabled: viewSectionId != null,
	});

	const deleteMutation = useMutation({
		mutationFn: (sectionIds: number[]) => deleteAdminSections(sectionIds),
		onSuccess() {
			toast.success(t('admin_sections_delete_success'));
			setDeleteTarget(null);
			queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
			queryClient.invalidateQueries({ queryKey: ['admin-section-detail'] });
		},
		onError(error: Error) {
			toast.error(error.message);
		},
	});

	const sections = sectionsQuery.data?.elements ?? [];

	const handleRefresh = async () => {
		await queryClient.invalidateQueries({ queryKey: ['admin-sections'] });
		await sectionsQuery.refetch();
	};

	return (
		<div className='p-6 sm:p-7'>
			<Card className='rounded-[28px] border-border/60 py-0'>
				<CardHeader className='px-6 pt-6'>
					<CardTitle className='flex items-center gap-2 text-2xl tracking-tight'>
						<Waypoints className='size-5 text-emerald-600 dark:text-emerald-300' />
						{t('admin_sections_title')}
					</CardTitle>
					<CardDescription className='leading-6'>
						{t('admin_sections_description')}
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
							placeholder={t('admin_sections_search_placeholder')}
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
							disabled={sectionsQuery.isFetching}
							className='rounded-xl'>
							<RefreshCw
								className={sectionsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
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

					{sectionsQuery.isLoading ? (
						<TablePanelSkeleton />
					) : sectionsQuery.isError ? (
						<Empty className='rounded-[24px]'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<Waypoints />
								</EmptyMedia>
								<EmptyTitle>{t('something_wrong')}</EmptyTitle>
								<EmptyDescription>
									{sectionsQuery.error.message}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : sections.length === 0 ? (
						<Empty className='rounded-[24px]'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<Waypoints />
								</EmptyMedia>
								<EmptyTitle>{t('admin_empty_title')}</EmptyTitle>
								<EmptyDescription>
									{t('admin_sections_empty_description')}
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t('admin_sections_table_title')}</TableHead>
										<TableHead>{t('admin_sections_table_creator')}</TableHead>
										<TableHead>{t('admin_sections_table_publish')}</TableHead>
										<TableHead>{t('admin_sections_table_counts')}</TableHead>
										<TableHead>{t('admin_action')}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{sections.map((section) => (
										<TableRow key={section.id}>
											<TableCell>
												<div className='space-y-1'>
													<div className='font-medium'>{section.title}</div>
													<div className='line-clamp-1 max-w-[380px] text-xs text-muted-foreground'>
														{section.description || '-'}
													</div>
												</div>
											</TableCell>
											<TableCell>{section.creator_nickname}</TableCell>
											<TableCell>
												{section.publish_uuid ? (
													<Badge className='rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'>
														{t('admin_sections_publish_published')}
													</Badge>
												) : (
													<Badge variant='outline' className='rounded-full'>
														{t('admin_sections_publish_private')}
													</Badge>
												)}
											</TableCell>
											<TableCell>
												<div className='text-xs text-muted-foreground'>
													{t('admin_sections_documents_count', {
														count: section.documents_count,
													})}
													<br />
													{t('admin_sections_subscribers_count', {
														count: section.subscribers_count,
													})}
												</div>
											</TableCell>
											<TableCell>
												<div className='flex items-center gap-2'>
													<Button
														variant='outline'
														size='sm'
														onClick={() => setViewSectionId(section.id)}>
														<Eye className='size-4' />
													</Button>
													<Button variant='outline' size='sm' asChild>
														<Link href={`/section/detail/${section.id}`}>
															<ExternalLink className='size-4' />
														</Link>
													</Button>
													<Button
														variant='destructive'
														size='sm'
														onClick={() => setDeleteTarget(section)}>
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
										page: sectionsQuery.data?.page_num ?? pageNum,
										totalPages: sectionsQuery.data?.total_pages ?? 1,
										total:
											sectionsQuery.data?.total_elements ?? sections.length,
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
										disabled={pageNum >= (sectionsQuery.data?.total_pages ?? 1)}>
										{t('next_page')}
									</Button>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={viewSectionId != null}
				onOpenChange={(open) => !open && setViewSectionId(null)}>
				<DialogContent className='flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-[28px] p-0'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>{t('admin_sections_view_title')}</DialogTitle>
						<DialogDescription>
							{t('admin_sections_view_description')}
						</DialogDescription>
					</DialogHeader>
					{detailQuery.isLoading || !detailQuery.data ? (
						<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
							<ResourceCardSkeleton />
						</div>
					) : (
						<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
							<div className='grid gap-4 sm:grid-cols-2'>
								<div className='rounded-[22px] border border-border/60 bg-background/60 p-4 sm:col-span-2'>
									<div className='text-lg font-semibold'>{detailQuery.data.title}</div>
									<div className='mt-2 text-sm leading-6 text-muted-foreground'>
										{detailQuery.data.description || '-'}
									</div>
								</div>
								<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
									<div className='text-xs text-muted-foreground'>
										{t('admin_sections_table_creator')}
									</div>
									<div className='mt-2 text-sm font-medium'>
										{detailQuery.data.creator.nickname}
									</div>
								</div>
								<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
									<div className='text-xs text-muted-foreground'>
										{t('admin_sections_table_publish')}
									</div>
									<div className='mt-2 text-sm font-medium'>
										{detailQuery.data.publish_uuid
											? t('admin_sections_publish_published')
											: t('admin_sections_publish_private')}
									</div>
								</div>
								<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
									<div className='text-xs text-muted-foreground'>
										{t('admin_sections_table_documents')}
									</div>
									<div className='mt-2 text-sm font-medium'>
										{detailQuery.data.documents_count}
									</div>
								</div>
								<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
									<div className='text-xs text-muted-foreground'>
										{t('admin_sections_table_subscribers')}
									</div>
									<div className='mt-2 text-sm font-medium'>
										{detailQuery.data.subscribers_count}
									</div>
								</div>
							</div>
						</div>
					)}
					<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
						<Button variant='outline' asChild>
							<Link href={`/section/detail/${viewSectionId ?? detailQuery.data?.id ?? ''}`}>
								<ExternalLink className='size-4' />
								{t('admin_open_detail_page')}
							</Link>
						</Button>
						<Button variant='outline' onClick={() => setViewSectionId(null)}>
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
						<AlertDialogTitle>{t('admin_sections_delete_title')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('admin_sections_delete_description', {
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

export default AdminSectionsPage;
