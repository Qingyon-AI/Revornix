'use client';

import type { ReactNode, Ref } from 'react';
import type { SectionInfo } from '@/generated';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import SectionVisibilityHint from './section-visibility-hint';

const SectionListTable = ({
	sections,
	footer,
	lastRowRef,
}: {
	sections: SectionInfo[];
	footer?: ReactNode;
	lastRowRef?: Ref<HTMLTableRowElement>;
}) => {
	const t = useTranslations();
	const router = useRouter();

	return (
		<div className='rounded-[24px] border border-border/60 bg-card/50 px-3 py-3 backdrop-blur-sm'>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t('admin_sections_table_title')}</TableHead>
						<TableHead>{t('admin_sections_table_creator')}</TableHead>
						<TableHead>{t('admin_sections_table_publish')}</TableHead>
						<TableHead>{t('admin_sections_table_counts')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sections.map((section, index) => (
						<TableRow
							key={section.id}
							ref={index === sections.length - 1 ? lastRowRef : undefined}
							className='cursor-pointer'
							onClick={() => router.push(`/section/detail/${section.id}`)}>
							<TableCell className='whitespace-normal'>
								<div className='space-y-1'>
									<div className='font-medium'>
										{section.title || t('section_title_empty')}
									</div>
									<div className='line-clamp-1 max-w-[420px] text-xs text-muted-foreground'>
										{section.description || t('section_description_empty')}
									</div>
								</div>
							</TableCell>
							<TableCell>{section.creator.nickname}</TableCell>
							<TableCell>
								<SectionVisibilityHint
									isPublished={Boolean(section.publish_uuid)}
								/>
							</TableCell>
							<TableCell>
								<div className='text-xs text-muted-foreground'>
									{t('admin_sections_documents_count', {
										count: section.documents_count ?? 0,
									})}
									<br />
									{t('admin_sections_subscribers_count', {
										count: section.subscribers_count ?? 0,
									})}
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			{footer ? <div className='border-t border-border/60 px-2 pt-3'>{footer}</div> : null}
		</div>
	);
};

export default SectionListTable;
