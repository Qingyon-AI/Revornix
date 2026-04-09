'use client';

import { DocumentCategory } from '@/enums/document';
import type { DocumentInfo } from '@/generated';
import { formatInUserTimeZone } from '@/lib/time';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

const DocumentListTable = ({ documents }: { documents: DocumentInfo[] }) => {
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
			<Table className='table-fixed'>
				<TableHeader>
					<TableRow>
						<TableHead className='w-[42%]'>
							{t('admin_documents_table_title')}
						</TableHead>
						<TableHead>{t('admin_documents_table_category')}</TableHead>
						<TableHead>{t('admin_documents_table_source')}</TableHead>
						<TableHead>{t('admin_documents_table_section_count')}</TableHead>
						<TableHead>{t('document_last_update')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{documents.map((document) => (
						<TableRow
							key={document.id}
							className='cursor-pointer'
							onClick={() => router.push(`/document/detail/${document.id}`)}>
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
		</div>
	);
};

export default DocumentListTable;
