import AddAudio from '@/components/document/add-audio';
import AddFile from '@/components/document/add-file';
import AddLink from '@/components/document/add-link';
import AddQuickNote from '@/components/document/add-quick-note';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileAudio, FileText, Globe, Link2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type SearchParams = Promise<{ [key: string]: string }>;

const CreatePage = async (props: { searchParams: SearchParams }) => {
	await props.searchParams;
	const t = await getTranslations();
	return (
		<div className='flex h-[calc(100svh-4.75rem)] max-h-[calc(100svh-4.75rem)] min-h-0 flex-1 flex-col overflow-hidden'>
			<Tabs
				defaultValue={'quick-note'}
				className='grid h-full min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden px-5 pb-4 md:pb-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6'>
				<aside className='relative flex h-fit flex-col rounded-2xl border border-border/60 bg-card/80 p-2 lg:min-h-0 lg:h-full'>
					<div className='px-3 pb-2 pt-2'>
						<p className='text-sm font-semibold'>{t('document_create')}</p>
						<p className='mt-1 text-xs text-muted-foreground'>
							{t('document_create_quick_note_description')}
						</p>
					</div>
					<TabsList className='h-auto w-full flex-col gap-1 bg-transparent p-1'>
						<TabsTrigger
							value='quick-note'
							className='w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted'>
							<FileText className='size-4' />
							{t('document_create_quick_note')}
						</TabsTrigger>
						<TabsTrigger
							value='link'
							className='w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted'>
							<Link2 className='size-4' />
							{t('document_create_link')}
						</TabsTrigger>
						<TabsTrigger
							value='file'
							className='w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted'>
							<Globe className='size-4' />
							{t('document_create_file')}
						</TabsTrigger>
						<TabsTrigger
							value='audio'
							className='w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted'>
							<FileAudio className='size-4' />
							{t('document_create_audio')}
						</TabsTrigger>
					</TabsList>
				</aside>
				<TabsContent
					value='quick-note'
					className='flex h-full min-h-0 flex-col overflow-hidden'>
					<AddQuickNote />
				</TabsContent>
				<TabsContent
					value='link'
					className='flex h-full min-h-0 flex-col overflow-hidden'>
					<AddLink />
				</TabsContent>
				<TabsContent
					value='file'
					className='flex h-full min-h-0 flex-col overflow-hidden'>
					<AddFile />
				</TabsContent>
				<TabsContent
					value='audio'
					className='flex h-full min-h-0 flex-col overflow-hidden'>
					<AddAudio />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default CreatePage;
