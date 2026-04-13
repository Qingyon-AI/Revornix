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
		<div className='flex min-h-[calc(100svh-4.75rem)] flex-1 flex-col overflow-x-hidden lg:h-[calc(100svh-4.75rem)] lg:max-h-[calc(100svh-4.75rem)] lg:min-h-0 lg:overflow-hidden'>
			<Tabs
				defaultValue={'quick-note'}
				className='grid grid-cols-1 gap-4 px-4 pb-4 pt-3 sm:px-5 md:pb-6 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:overflow-hidden lg:px-5 lg:pt-0'>
				<aside className='relative flex h-fit flex-col rounded-2xl lg:min-h-0 lg:h-full'>
					<div className='px-3 pb-2 pt-2'>
						<p className='text-sm font-semibold'>{t('document_create')}</p>
						<p className='mt-1 text-xs text-muted-foreground'>
							{t('document_create_quick_note_description')}
						</p>
					</div>
					<TabsList className='h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:flex lg:flex-col lg:gap-1'>
						<TabsTrigger
							value='quick-note'
							className='min-w-fit justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted lg:w-full'>
							<FileText className='size-4' />
							{t('document_create_quick_note')}
						</TabsTrigger>
						<TabsTrigger
							value='link'
							className='min-w-fit justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted lg:w-full'>
							<Link2 className='size-4' />
							{t('document_create_link')}
						</TabsTrigger>
						<TabsTrigger
							value='file'
							className='min-w-fit justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted lg:w-full'>
							<Globe className='size-4' />
							{t('document_create_file')}
						</TabsTrigger>
						<TabsTrigger
							value='audio'
							className='min-w-fit justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted lg:w-full'>
							<FileAudio className='size-4' />
							{t('document_create_audio')}
						</TabsTrigger>
					</TabsList>
				</aside>
				<TabsContent
					value='quick-note'
					className='flex flex-col overflow-visible lg:h-full lg:min-h-0 lg:overflow-hidden'>
					<AddQuickNote />
				</TabsContent>
				<TabsContent
					value='link'
					className='flex flex-col overflow-visible lg:h-full lg:min-h-0 lg:overflow-hidden'>
					<AddLink />
				</TabsContent>
				<TabsContent
					value='file'
					className='flex flex-col overflow-visible lg:h-full lg:min-h-0 lg:overflow-hidden'>
					<AddFile />
				</TabsContent>
				<TabsContent
					value='audio'
					className='flex flex-col overflow-visible lg:h-full lg:min-h-0 lg:overflow-hidden'>
					<AddAudio />
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default CreatePage;
