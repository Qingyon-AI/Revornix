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
import { useTranslations } from 'next-intl';

const CreatePage = () => {
	const t = useTranslations();
	return (
		<div className='pb-5 px-5 w-full flex-1'>
			<Tabs defaultValue='quick-note' className='h-full flex flex-col w-full'>
				<TabsList className='grid w-full grid-cols-3'>
					<TabsTrigger value='quick-note'>
						{t('document_create_quick_note')}
					</TabsTrigger>
					<TabsTrigger value='link'>{t('document_create_link')}</TabsTrigger>
					<TabsTrigger value='file'>{t('document_create_file')}</TabsTrigger>
				</TabsList>
				<TabsContent value='quick-note' className='flex-1'>
					<Card className='h-full flex flex-col'>
						<CardHeader>
							<CardTitle>{t('document_create_quick_note')}</CardTitle>
							<CardDescription>
								{t('document_create_quick_note_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1'>
							<AddQuickNote />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='link' className='flex-1'>
					<Card className='h-full flex flex-col'>
						<CardHeader>
							<CardTitle>{t('document_create_link')}</CardTitle>
							<CardDescription>
								{t('document_create_link_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1'>
							<AddLink />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='file' className='flex-1'>
					<Card className='h-full flex flex-col'>
						<CardHeader>
							<CardTitle>{t('document_create_file')}</CardTitle>
							<CardDescription>
								{t('document_create_file_description')}
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1'>
							<AddFile />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default CreatePage;
