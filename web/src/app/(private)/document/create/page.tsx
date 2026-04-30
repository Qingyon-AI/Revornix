import type { Metadata } from 'next';
import AddAudio from '@/components/document/add-audio';
import AddFile from '@/components/document/add-file';
import AddLink from '@/components/document/add-link';
import AddQuickNote from '@/components/document/add-quick-note';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileAudio, FileText, FileUp, Link2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Create Document',
	'Create a new document in Revornix from notes, links, files, or audio.',
);

type SearchParams = Promise<{ [key: string]: string }>;

const CreatePage = async (props: { searchParams: SearchParams }) => {
	await props.searchParams;
	const t = await getTranslations();
	return (
		<div className='flex min-h-0 flex-1 flex-col overflow-x-hidden lg:h-[calc(100dvh-var(--private-top-header-height,3.5rem))] lg:max-h-[calc(100dvh-var(--private-top-header-height,3.5rem))] lg:overflow-hidden'>
			<Tabs
				defaultValue={'quick-note'}
				className='flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-3 sm:px-5 md:pb-4 lg:h-full lg:max-h-full lg:overflow-hidden lg:px-6 lg:pt-3'>
				<div className='flex shrink-0 flex-col gap-2 border-b border-border/60 pb-3 pt-1 lg:flex-row lg:items-center lg:justify-between lg:gap-6'>
					<div className='min-w-0'>
						<p className='text-base font-semibold tracking-normal'>
							{t('document_create')}
						</p>
						<p className='mt-0.5 max-w-2xl text-sm text-muted-foreground'>
							{t('document_create_quick_note_description')}
						</p>
					</div>
					<TabsList className='h-9 w-full justify-start gap-1 overflow-x-auto rounded-md bg-muted/70 p-1 sm:w-auto sm:overflow-visible'>
						<TabsTrigger
							value='quick-note'
							className='min-w-fit flex-none justify-start gap-2 px-3 data-[state=active]:bg-background'>
							<FileText className='size-4' />
							{t('document_create_quick_note')}
						</TabsTrigger>
						<TabsTrigger
							value='link'
							className='min-w-fit flex-none justify-start gap-2 px-3 data-[state=active]:bg-background'>
							<Link2 className='size-4' />
							{t('document_create_link')}
						</TabsTrigger>
						<TabsTrigger
							value='file'
							className='min-w-fit flex-none justify-start gap-2 px-3 data-[state=active]:bg-background'>
							<FileUp className='size-4' />
							{t('document_create_file')}
						</TabsTrigger>
						<TabsTrigger
							value='audio'
							className='min-w-fit flex-none justify-start gap-2 px-3 data-[state=active]:bg-background'>
							<FileAudio className='size-4' />
							{t('document_create_audio')}
						</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent
					value='quick-note'
					className='mt-0 flex flex-col overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden'>
					<AddQuickNote />
				</TabsContent>
				<TabsContent
					value='link'
					className='mt-0 flex flex-col overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden'>
					<AddLink />
				</TabsContent>
				<TabsContent
					value='file'
					className='mt-0 flex flex-col overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden'>
					<AddFile />
				</TabsContent>
				<TabsContent
					value='audio'
					className='mt-0 flex flex-col overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden'>
					<AddAudio />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default CreatePage;
