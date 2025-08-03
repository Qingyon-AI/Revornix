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

const RssCard = ({ rss }: { rss: RssServerInfo }) => {
	const t = useTranslations();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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
		<Card>
			<CardHeader className='flex-1'>
				<CardTitle>{rss.title}</CardTitle>
				<CardDescription>{rss.description}</CardDescription>
			</CardHeader>
			<CardContent>
				<p className='text-xs text-muted-foreground mb-1'>
					{t('rss_documents_count', {
						document_count: rss.documents?.length ?? 0,
					})}
				</p>
				<p className='text-xs text-muted-foreground'>
					{t('rss_sections_count', {
						section_count: rss.sections?.length ?? 0,
					})}
				</p>
			</CardContent>
			<CardFooter className='flex justify-end gap-3'>
				<UpdateRss rss_id={rss.id} />
				<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
							<AlertDialogCancel>{t('cancel')}ƒ</AlertDialogCancel>
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
	);
};

export default RssCard;
