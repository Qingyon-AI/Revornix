'use client';

import type { Ref } from 'react';
import { DocumentCategory } from '@/enums/document';
import type { DocumentInfo } from '@/generated';
import { formatInUserTimeZone } from '@/lib/time';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { Badge } from '@/components/ui/badge';
import DocumentVisibilityHint from './document-visibility-hint';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import ListLoadingIndicator from '@/components/ui/list-loading-indicator';
import { Checkbox } from '@/components/ui/checkbox';

/** 传了才渲染勾选列 —— 公共列表页没有批量操作，就不该多出一列。 */
export type ListSelection = {
	isSelected: (id: number) => boolean;
	toggle: (id: number) => void;
	allVisibleSelected: boolean;
	someVisibleSelected: boolean;
	toggleAllVisible: () => void;
};

const DocumentListTable = ({
	documents,
	lastRowRef,
	loadingMore = false,
	loadingCentered = false,
	selection,
}: {
	documents: DocumentInfo[];
	lastRowRef?: Ref<HTMLTableRowElement>;
	loadingMore?: boolean;
	loadingCentered?: boolean;
	selection?: ListSelection;
}) => {
	const t = useTranslations();
	const router = useRouter();

	const getCategoryLabel = (category: number) => {
		switch (category) {
			case DocumentCategory.WEBSITE:
				return t('document_category_link');
			case DocumentCategory.FILE:
				return t('document_category_file');
			case DocumentCategory.QUICK_NOTE:
				return t('document_category_quick_note');
			case DocumentCategory.AUDIO:
				return t('document_category_audio');
			default:
				return t('document_category_others');
		}
	};

	return (
		<div className='rounded-[24px] border border-border/60 bg-card/50 px-3 py-3 backdrop-blur-sm'>
			<Table className='table-fixed min-w-[900px]'>
				<TableHeader>
					<TableRow>
						{selection ? (
							<TableHead className='w-10'>
								<Checkbox
									aria-label={t('selection_select_all_visible')}
									checked={
										selection.allVisibleSelected
											? true
											: selection.someVisibleSelected
												? 'indeterminate'
												: false
									}
									onCheckedChange={() => selection.toggleAllVisible()}
								/>
							</TableHead>
						) : null}
						<TableHead className='w-[42%] min-w-[260px]'>
							{t('admin_documents_table_title')}
						</TableHead>
						<TableHead>{t('admin_documents_table_category')}</TableHead>
						<TableHead>{t('admin_sections_table_publish')}</TableHead>
						<TableHead>{t('admin_documents_table_source')}</TableHead>
						<TableHead>{t('admin_documents_table_section_count')}</TableHead>
						<TableHead>{t('document_last_update')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{documents.map((document, index) => (
						<TableRow
							key={document.id}
							ref={index === documents.length - 1 ? lastRowRef : undefined}
							className='cursor-pointer'
							onClick={() => router.push(`/document/detail/${document.id}`)}>
							{selection ? (
								// 勾选格自己吃掉点击，否则会连带触发整行的跳转。
								<TableCell onClick={(e) => e.stopPropagation()}>
									<Checkbox
										aria-label={document.title ?? undefined}
										checked={selection.isSelected(document.id)}
										onCheckedChange={() => selection.toggle(document.id)}
									/>
								</TableCell>
							) : null}
							<TableCell className='whitespace-normal'>
								<div className='min-w-0 space-y-1'>
									<div className='line-clamp-2 break-all font-medium'>
										{document.title || t('document_no_title')}
									</div>
									<div className='line-clamp-1 max-w-full break-all text-xs text-muted-foreground'>
										{document.description || t('document_no_description')}
									</div>
								</div>
							</TableCell>
							<TableCell>
								<Badge variant='outline' className='rounded-full'>
									{getCategoryLabel(document.category)}
								</Badge>
							</TableCell>
							<TableCell>
								<DocumentVisibilityHint documentId={document.id} />
							</TableCell>
							<TableCell>{document.from_plat}</TableCell>
							<TableCell>{document.sections?.length ?? 0}</TableCell>
							<TableCell>
								{formatInUserTimeZone(
									document.update_time ?? document.create_time,
									'MM-dd HH:mm',
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			{loadingMore || loadingCentered ? (
				<div className='border-t border-border/60 px-2 pt-3'>
					<ListLoadingIndicator centered={loadingCentered} />
				</div>
			) : null}
		</div>
	);
};

export default DocumentListTable;
