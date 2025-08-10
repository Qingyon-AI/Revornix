import { RssServerInfo } from '@/generated';
import { toast } from 'sonner';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import { deleteRssServer } from '@/service/rss';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { useState } from 'react';
import UpdateRss from './update-rss';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import RssDocumentCard from '../section/rss-document-card';
import { Separator } from '../ui/separator';
import RssSectionCard from '../section/rss-section-card';

const RssCard = ({ rss }: { rss: RssServerInfo }) => {
	const t = useTranslations();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showDocuments, setShowDocuments] = useState(false);
	const [showSections, setShowSections] = useState(false);
	const queryClient = getQueryClient();

	const mutateDeleteRssServer = useMutation({
		mutationFn: deleteRssServer,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				queryKey: ['searchMyRssServers', ''],
			});
			setShowDeleteDialog(false);
		},
		onError(error, variables, context) {
			toast.error(error.message);
			console.error(error);
		},
	});

	return (
		<>
			<Sheet open={showDocuments} onOpenChange={setShowDocuments}>
				<SheetContent className='pb-5'>
					<SheetHeader>
						<SheetTitle>RSS —— {rss.title}</SheetTitle>
					</SheetHeader>
					<div className='px-5 flex flex-col gap-5 overflow-auto pb-5'>
						{rss &&
							rss.documents &&
							rss.documents.map((document, index) => {
								return <RssDocumentCard key={index} document={document} />;
							})}
						{rss && rss.documents && rss.documents.length === 0 && (
							<div className='bg-muted rounded p-5 flex justify-center items-center text-xs text-muted-foreground'>
								暂无数据
							</div>
						)}
					</div>
				</SheetContent>
			</Sheet>
			<Sheet open={showSections} onOpenChange={setShowSections}>
				<SheetContent className='pb-5'>
					<SheetHeader>
						<SheetTitle>RSS —— {rss.title}</SheetTitle>
					</SheetHeader>
					<div className='px-5 flex flex-col gap-5 overflow-auto pb-5'>
						{rss &&
							rss.sections &&
							rss.sections.map((section, index) => {
								return <RssSectionCard key={index} section={section} />;
							})}
						{rss && rss.sections && rss.sections.length === 0 && (
							<div className='bg-muted rounded p-5 flex justify-center items-center text-xs text-muted-foreground'>
								暂无数据
							</div>
						)}
					</div>
				</SheetContent>
			</Sheet>
			<Card className='pt-0 overflow-hidden'>
				{rss.cover ? (
					<img
						src={rss.cover}
						alt={rss.title}
						className='h-48 w-full object-cover'
					/>
				) : (
					<img
						src='https://source.unsplash.com/random/200x200'
						alt={rss.title}
						className='h-48 w-full object-cover'
					/>
				)}
				<CardHeader className='flex-1'>
					<CardTitle>{rss.title}</CardTitle>
					<CardDescription className='line-clamp-3'>
						{rss.description}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='flex h-5 items-center space-x-4 text-sm'>
						<p
							className='text-xs text-muted-foreground underline'
							onClick={() => setShowDocuments(true)}>
							{t('rss_documents_count', {
								document_count: rss.documents?.length ?? 0,
							})}
						</p>
						<Separator className='h-20 w-20' orientation={'vertical'} />
						<p
							className='text-xs text-muted-foreground underline'
							onClick={() => setShowSections(true)}>
							{t('rss_sections_count', {
								section_count: rss.sections?.length ?? 0,
							})}
						</p>
					</div>
				</CardContent>
				<CardFooter className='flex justify-end gap-3'>
					<UpdateRss rss_id={rss.id} />
					<AlertDialog
						open={showDeleteDialog}
						onOpenChange={setShowDeleteDialog}>
						<AlertDialogTrigger asChild>
							<Button variant={'secondary'}>{t('delete')}</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>{t('warning')}</AlertDialogTitle>
								<AlertDialogDescription>
									{t('rss_delete_warning')}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
								<Button
									variant='destructive'
									disabled={mutateDeleteRssServer.isPending}
									onClick={() => {
										mutateDeleteRssServer.mutateAsync({
											ids: [rss.id],
										});
									}}>
									{t('confirm')}
									{mutateDeleteRssServer.isPending && (
										<Loader2 className='h-4 w-4 animate-spin' />
									)}
								</Button>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardFooter>
			</Card>
		</>
	);
};

export default RssCard;
