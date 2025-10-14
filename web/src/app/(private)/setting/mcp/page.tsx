'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	deleteMCPServer,
	searchMCPServer,
	updateMCPServer,
} from '@/service/mcp';
import { useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTranslations } from 'next-intl';
import { getQueryClient } from '@/lib/get-query-client';
import { MCPServerSearchRequest } from '@/generated';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertDialogContent,
} from '@/components/ui/alert-dialog';
import CreateMcp from '@/components/mcp/create-mcp';
import UpdateMcp from '@/components/mcp/update-mcp';
import { MCPCategory } from '@/enums/mcp';

const MCPPage = () => {
	const t = useTranslations();

	const queryClient = getQueryClient();

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const { data, isFetching, isRefetching } = useQuery({
		queryKey: ['mcp-server-search'],
		queryFn: async () => {
			return await searchMCPServer({
				keyword: '',
			});
		},
	});

	const mutateDeleteMCPServer = useMutation({
		mutationFn: async (id: number) => {
			return await deleteMCPServer({
				id: id,
			});
		},
		onSuccess: () => {
			toast.success(t('mcp_server_delete_success'));
			queryClient.invalidateQueries({
				queryKey: ['mcp-server-search'],
			});
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const activeMutateUpdateMCPServer = useMutation({
		mutationFn: updateMCPServer,
		onMutate(variables) {
			queryClient.cancelQueries({
				queryKey: ['mcp-server-search'],
			});
			const previousData = queryClient.getQueryData<MCPServerSearchRequest>([
				'mcp-server-search',
			]);
			return { previousData };
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: ['mcp-server-search'],
			});
		},
		onError(error, variables, context) {
			toast.error(error.message);
			context &&
				queryClient.setQueryData(['mcp-server-search'], context.previousData);
		},
	});

	return (
		<div className='px-5'>
			<Alert className='mb-4'>
				<Info className='h-4 w-4' />
				<AlertDescription>{t('mcp_server_description')}</AlertDescription>
			</Alert>
			<div className='flex flex-row w-full justify-end mb-4'>
				<CreateMcp />
			</div>
			<div>
				<Table className='mb-4'>
					<TableHeader>
						<TableRow>
							<TableHead>{t('mcp_server_name')}</TableHead>
							<TableHead>{t('mcp_server_category')}</TableHead>
							<TableHead>{t('mcp_server_url')}</TableHead>
							<TableHead>{t('mcp_server_headers')}</TableHead>
							<TableHead>{t('mcp_server_script')}</TableHead>
							<TableHead>{t('mcp_server_args')}</TableHead>
							<TableHead>{t('mcp_server_env')}</TableHead>
							<TableHead>{t('mcp_server_enable')}</TableHead>
							<TableHead>{t('mcp_server_action')}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data &&
							data.data &&
							data.data.length > 0 &&
							data.data.map((mcp_server, index) => {
								return (
									<TableRow key={index}>
										<TableCell className='font-bold'>
											{mcp_server.name}
										</TableCell>
										<TableCell>
											<Badge>
												{mcp_server.category === MCPCategory.STD ? 'std' : 'stream'}
											</Badge>
										</TableCell>
										<TableCell>
											{mcp_server.category === MCPCategory.HTTP ? mcp_server.url : '-'}
										</TableCell>
										<TableCell>
											{mcp_server.category === MCPCategory.HTTP ? mcp_server.headers : '-'}
										</TableCell>
										<TableCell className='font-mono'>
											{mcp_server.category === MCPCategory.STD ? mcp_server.cmd : '-'}
										</TableCell>
										<TableCell className='font-mono'>
											{mcp_server.category === MCPCategory.STD ? mcp_server.args : '-'}
										</TableCell>
										<TableCell className='font-mono'>
											{mcp_server.category === MCPCategory.STD ? mcp_server.env : '-'}
										</TableCell>
										<TableCell>
											<Switch
												checked={mcp_server.enable}
												onCheckedChange={(value) => {
													activeMutateUpdateMCPServer.mutate({
														id: mcp_server.id,
														enable: value,
													});
												}}
											/>
										</TableCell>
										<TableCell className='flex flex-row gap-2'>
											<AlertDialog
												open={showDeleteDialog}
												onOpenChange={setShowDeleteDialog}>
												<AlertDialogTrigger asChild>
													<Button>
														<Trash2 />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															{t('mcp_server_delete_alert_title')}
														</AlertDialogTitle>
														<AlertDialogDescription>
															{t('mcp_server_delete_alert_description')}
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<Button
															variant={'destructive'}
															onClick={() => {
																mutateDeleteMCPServer.mutateAsync(
																	mcp_server.id
																);
															}}
															disabled={mutateDeleteMCPServer.isPending}>
															{t('confirm')}
															{mutateDeleteMCPServer.isPending && (
																<Loader2 className='h-4 w-4 animate-spin' />
															)}
														</Button>
														<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
											<UpdateMcp mcp_id={mcp_server.id} />
										</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
				{isFetching && !isRefetching && <Skeleton className='w-full h-52' />}
				{data && data.data && data.data.length === 0 && (
					<div className='text-center p-5 text-xs text-muted-foreground rounded bg-muted'>
						{t('mcp_server_empty')}
					</div>
				)}
			</div>
		</div>
	);
};

export default MCPPage;
