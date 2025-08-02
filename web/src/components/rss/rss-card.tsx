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
			<CardFooter className='flex justify-end gap-3'>
				<Button>更新</Button>
				<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<AlertDialogTrigger asChild>
						<Button variant={'secondary'}>删除</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>警告</AlertDialogTitle>
							<AlertDialogDescription>
								确认删除吗，一经删除，将不再自动爬取对应源。但注意过往已爬取的文档会保留。
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>取消</AlertDialogCancel>
							<Button
								variant='destructive'
								disabled={mutateDeleteRssServer.isPending}
								onClick={() => {
									mutateDeleteRssServer.mutateAsync({
										ids: [rss.id],
									});
								}}>
								确认
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
