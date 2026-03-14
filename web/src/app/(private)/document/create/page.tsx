import AddAudio from '@/components/document/add-audio';
import AddFile from '@/components/document/add-file';
import AddLink from '@/components/document/add-link';
import AddQuickNote from '@/components/document/add-quick-note';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTranslations } from 'next-intl/server';

type SearchParams = Promise<{ [key: string]: string }>;

const CreatePage = async (props: { searchParams: SearchParams }) => {
	const searchParams = await props.searchParams;
	const t = await getTranslations();
	return (
		<div className='pb-5 px-5 w-full flex-1 min-h-0 overflow-hidden'>
			<Tabs
				defaultValue={'quick-note'}
				className='h-full min-h-0 flex flex-col w-full overflow-hidden'>
				<TabsList className='grid w-full grid-cols-4'>
					<TabsTrigger value='quick-note'>
						{t('document_create_quick_note')}
					</TabsTrigger>
					<TabsTrigger value='link'>{t('document_create_link')}</TabsTrigger>
					<TabsTrigger value='file'>{t('document_create_file')}</TabsTrigger>
					<TabsTrigger value='audio'>{t('document_create_audio')}</TabsTrigger>
				</TabsList>
				<TabsContent value='quick-note' className='flex-1 min-h-0 overflow-hidden'>
					<Card className='h-full min-h-0 flex flex-col overflow-hidden'>
						<CardHeader>
							<CardTitle>{t('document_create_quick_note')}</CardTitle>
							<CardDescription>
								{t('document_create_quick_note_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1 min-h-0 overflow-hidden'>
							<AddQuickNote />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='link' className='flex-1 min-h-0 overflow-hidden'>
					<Card className='h-full min-h-0 flex flex-col overflow-hidden'>
						<CardHeader>
							<CardTitle>{t('document_create_link')}</CardTitle>
							<CardDescription>
								{t('document_create_link_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1 min-h-0 overflow-hidden'>
							<AddLink />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='file' className='flex-1 min-h-0 overflow-hidden'>
					<Card className='h-full min-h-0 flex flex-col overflow-hidden'>
						<CardHeader>
							<CardTitle>{t('document_create_file')}</CardTitle>
							<CardDescription>
								{t('document_create_file_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1 min-h-0 overflow-hidden'>
							<AddFile />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='audio' className='flex-1 min-h-0 overflow-hidden'>
					<Card className='h-full min-h-0 flex flex-col overflow-hidden'>
						<CardHeader>
							<CardTitle>{t('document_create_audio')}</CardTitle>
							<CardDescription>
								{t('document_create_audio_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1 min-h-0 overflow-hidden'>
							<AddAudio />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default CreatePage;
