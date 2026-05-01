'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
	addAdminUserNotificationTask,
	deleteAdminUserNotificationTask,
	getAdminUserNotificationTaskDetail,
	getAdminUserNotificationTasks,
	getAdminUserUsableNotificationSources,
	getAdminUserUsableNotificationTargets,
	updateAdminUserNotificationTask,
} from '@/service/admin';
import { getTriggerEvents } from '@/service/notification';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { ResourceCardSkeleton, TablePanelSkeleton } from '@/components/ui/skeleton';
import SelectEmpty from '@/components/ui/select-empty';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

type TaskFormState = {
	title: string;
	notification_source_id: string;
	notification_target_id: string;
	trigger_event_id: string;
	enable: boolean;
};

const DEFAULT_TASK_FORM: TaskFormState = {
	title: '',
	notification_source_id: '',
	notification_target_id: '',
	trigger_event_id: '',
	enable: true,
};

const AdminUserNotificationsPage = ({
	userId,
}: {
	userId: number;
}) => {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [pageNum, setPageNum] = useState(1);
	const [pageSize] = useState(10);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTaskId, setEditTaskId] = useState<number | null>(null);
	const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
	const [pendingEnableTask, setPendingEnableTask] = useState<{
		id: number;
		enable: boolean;
		title: string;
	} | null>(null);
	const [createForm, setCreateForm] = useState<TaskFormState>(DEFAULT_TASK_FORM);
	const [editForm, setEditForm] = useState<TaskFormState>(DEFAULT_TASK_FORM);

	const usableSourcesQuery = useQuery({
		queryKey: ['admin-user-usable-notification-sources', userId],
		queryFn: () => getAdminUserUsableNotificationSources(userId),
	});

	const usableTargetsQuery = useQuery({
		queryKey: ['admin-user-usable-notification-targets', userId],
		queryFn: () => getAdminUserUsableNotificationTargets(userId),
	});

	const triggerEventsQuery = useQuery({
		queryKey: ['notification-trigger-events-admin'],
		queryFn: getTriggerEvents,
	});

	const tasksQuery = useQuery({
		queryKey: ['admin-user-notification-tasks', userId, pageNum, pageSize],
		queryFn: () =>
			getAdminUserNotificationTasks({
				user_id: userId,
				page_num: pageNum,
				page_size: pageSize,
			}),
	});

	const taskDetailQuery = useQuery({
		queryKey: ['admin-user-notification-task-detail', userId, editTaskId],
		queryFn: () =>
			getAdminUserNotificationTaskDetail({
				user_id: userId,
				notification_task_id: editTaskId!,
			}),
		enabled: editTaskId != null,
	});

	const createMutation = useMutation({
		mutationFn: addAdminUserNotificationTask,
		onSuccess() {
			toast.success(t('admin_notifications_task_create_success'));
			setCreateOpen(false);
			setCreateForm(DEFAULT_TASK_FORM);
			queryClient.invalidateQueries({ queryKey: ['admin-user-notification-tasks', userId] });
		},
		onError(error: Error) {
			toast.error(error.message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: updateAdminUserNotificationTask,
		onSuccess() {
			toast.success(t('admin_notifications_task_update_success'));
			setEditTaskId(null);
			setEditForm(DEFAULT_TASK_FORM);
			setPendingEnableTask(null);
			queryClient.invalidateQueries({ queryKey: ['admin-user-notification-tasks', userId] });
			queryClient.invalidateQueries({ queryKey: ['admin-user-notification-task-detail', userId] });
		},
		onError(error: Error) {
			toast.error(error.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteAdminUserNotificationTask,
		onSuccess() {
			toast.success(t('admin_notifications_task_delete_success'));
			setDeleteTaskId(null);
			queryClient.invalidateQueries({ queryKey: ['admin-user-notification-tasks', userId] });
		},
		onError(error: Error) {
			toast.error(error.message);
		},
	});

	useEffect(() => {
		if (!taskDetailQuery.data) {
			return;
		}
		setEditForm({
			title: taskDetailQuery.data.title || '',
			notification_source_id: String(taskDetailQuery.data.notification_source?.id || ''),
			notification_target_id: String(taskDetailQuery.data.notification_target?.id || ''),
			trigger_event_id: String(taskDetailQuery.data.trigger_event?.trigger_event_id || ''),
			enable: taskDetailQuery.data.enable,
		});
	}, [taskDetailQuery.data]);

	const tasks = tasksQuery.data?.elements ?? [];
	const validateTaskForm = (form: TaskFormState) => {
		if (!form.title.trim() || !form.notification_source_id || !form.notification_target_id) {
			toast.error(t('admin_notifications_task_form_required'));
			return false;
		}
		if (!form.trigger_event_id) {
			toast.error(t('admin_notifications_task_event_required'));
			return false;
		}
		return true;
	};

	const buildTaskPayload = (form: TaskFormState) => ({
		user_id: userId,
		title: form.title.trim(),
		notification_source_id: Number(form.notification_source_id),
		notification_target_id: Number(form.notification_target_id),
		trigger_type: 0,
		trigger_event_id: form.trigger_event_id ? Number(form.trigger_event_id) : undefined,
		enable: form.enable,
	});

	const submitCreate = async () => {
		if (!validateTaskForm(createForm)) return;
		await createMutation.mutateAsync(buildTaskPayload(createForm));
	};

	const submitUpdate = async () => {
		if (!editTaskId) return;
		if (!validateTaskForm(editForm)) return;
		await updateMutation.mutateAsync({
			notification_task_id: editTaskId,
			...buildTaskPayload(editForm),
		});
	};

	const taskMutationPending =
		createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

	return (
		<div className='p-6 sm:p-7'>
			<Card className='rounded-[28px] border-border/60 py-0'>
				<CardHeader className='px-6 pt-6'>
					<CardTitle className='flex items-center gap-2 text-2xl tracking-tight'>
						<BellRing className='size-5 text-emerald-600 dark:text-emerald-300' />
						{t('admin_notifications_title')}
					</CardTitle>
					<CardDescription className='leading-6'>
						{t('admin_notifications_description')}
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-6 px-6 pb-6'>
					<Card className='rounded-[24px] border-border/60'>
						<CardHeader className='flex flex-row items-center justify-between gap-4'>
							<div>
								<CardTitle className='text-base'>{t('admin_notifications_tasks_title')}</CardTitle>
								<CardDescription>{t('admin_notifications_tasks_description')}</CardDescription>
							</div>
							<Button onClick={() => setCreateOpen(true)} className='rounded-xl'>
								<Plus className='size-4' />
								{t('admin_notifications_task_add')}
							</Button>
						</CardHeader>
						<CardContent className='space-y-4'>
							{tasksQuery.isLoading ? (
								<TablePanelSkeleton />
							) : tasks.length === 0 ? (
								<Empty className='rounded-[20px] border border-border/60'>
									<EmptyHeader>
										<EmptyMedia variant='icon'>
											<BellRing />
										</EmptyMedia>
										<EmptyTitle>{t('admin_empty_title')}</EmptyTitle>
										<EmptyDescription>{t('admin_notifications_tasks_empty')}</EmptyDescription>
									</EmptyHeader>
								</Empty>
							) : (
								<>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>{t('admin_notifications_task_title_column')}</TableHead>
												<TableHead>{t('admin_notifications_task_source_column')}</TableHead>
												<TableHead>{t('admin_notifications_task_target_column')}</TableHead>
												<TableHead>{t('admin_notifications_task_type_column')}</TableHead>
												<TableHead>{t('admin_notifications_task_enable_column')}</TableHead>
												<TableHead>{t('admin_action')}</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{tasks.map((task) => (
												<TableRow key={task.id}>
													<TableCell className='whitespace-normal'>
													<div className='font-medium'>{task.title}</div>
													<div className='text-xs text-muted-foreground'>
														{t('setting_notification_task_manage_form_trigger_type_event')}
													</div>
													</TableCell>
													<TableCell>{task.notification_source?.title || '-'}</TableCell>
													<TableCell>{task.notification_target?.title || '-'}</TableCell>
													<TableCell>
														<Badge variant='outline' className='rounded-full'>
															{t('setting_notification_task_manage_form_trigger_type_event')}
														</Badge>
													</TableCell>
													<TableCell>
														<Switch
															checked={task.enable}
															onCheckedChange={(enable) =>
																setPendingEnableTask({
																	id: task.id,
																	enable,
																	title: task.title,
																})
															}
														/>
													</TableCell>
													<TableCell>
														<div className='flex items-center gap-2'>
															<Button variant='outline' size='sm' onClick={() => setEditTaskId(task.id)}>
																{t('edit')}
															</Button>
															<Button variant='destructive' size='sm' onClick={() => setDeleteTaskId(task.id)}>
																<Trash2 className='size-4' />
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
									<div className='flex items-center justify-between gap-3'>
										<div className='text-xs text-muted-foreground'>
											{t('admin_pagination_summary', {
												page: tasksQuery.data?.page_num ?? pageNum,
												totalPages: tasksQuery.data?.total_pages ?? 1,
												total: tasksQuery.data?.total_elements ?? tasks.length,
											})}
										</div>
										<div className='flex gap-2'>
											<Button variant='outline' onClick={() => setPageNum((current) => current - 1)} disabled={pageNum <= 1}>
												{t('previous_page')}
											</Button>
											<Button
												variant='outline'
												onClick={() => setPageNum((current) => current + 1)}
												disabled={pageNum >= (tasksQuery.data?.total_pages ?? 1)}>
												{t('next_page')}
											</Button>
										</div>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</CardContent>
			</Card>

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent className='flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden rounded-[28px] p-0'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>{t('admin_notifications_task_add')}</DialogTitle>
						<DialogDescription>{t('admin_notifications_task_form_description')}</DialogDescription>
					</DialogHeader>
					<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
						<TaskForm
							form={createForm}
							onChange={setCreateForm}
							usableSources={usableSourcesQuery.data?.data ?? []}
							usableTargets={usableTargetsQuery.data?.data ?? []}
							triggerEvents={triggerEventsQuery.data?.data ?? []}
						/>
					</div>
					<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
						<Button variant='outline' onClick={() => setCreateOpen(false)}>
							{t('cancel')}
						</Button>
						<Button onClick={submitCreate} disabled={taskMutationPending}>
							{taskMutationPending ? <Loader2 className='size-4 animate-spin' /> : null}
							{t('create')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={editTaskId != null} onOpenChange={(open) => !open && setEditTaskId(null)}>
				<DialogContent className='flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden rounded-[28px] p-0'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>{t('admin_notifications_task_edit')}</DialogTitle>
						<DialogDescription>{t('admin_notifications_task_form_description')}</DialogDescription>
					</DialogHeader>
					{taskDetailQuery.isLoading ? (
						<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
							<ResourceCardSkeleton />
						</div>
					) : (
						<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
							<TaskForm
								form={editForm}
								onChange={setEditForm}
								usableSources={usableSourcesQuery.data?.data ?? []}
								usableTargets={usableTargetsQuery.data?.data ?? []}
								triggerEvents={triggerEventsQuery.data?.data ?? []}
							/>
						</div>
					)}
					<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
						<Button variant='outline' onClick={() => setEditTaskId(null)}>
							{t('cancel')}
						</Button>
						<Button onClick={submitUpdate} disabled={taskMutationPending || taskDetailQuery.isLoading}>
							{taskMutationPending ? <Loader2 className='size-4 animate-spin' /> : null}
							{t('save')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog open={deleteTaskId != null} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
				<AlertDialogContent className='rounded-[28px]'>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('admin_notifications_task_delete_title')}</AlertDialogTitle>
						<AlertDialogDescription>{t('admin_notifications_task_delete_description')}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								deleteTaskId &&
								deleteMutation.mutate({
									user_id: userId,
									notification_task_ids: [deleteTaskId],
								})
							}
							className='bg-destructive text-white hover:bg-destructive/90'>
							{deleteMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={pendingEnableTask != null} onOpenChange={(open) => !open && setPendingEnableTask(null)}>
				<AlertDialogContent className='rounded-[28px]'>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('admin_notifications_task_toggle_title')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('admin_notifications_task_toggle_description', {
								name: pendingEnableTask?.title ?? '',
								status: pendingEnableTask?.enable
									? t('admin_notifications_task_status_enabled')
									: t('admin_notifications_task_status_disabled'),
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!pendingEnableTask) return;
								updateMutation.mutate({
									user_id: userId,
									notification_task_id: pendingEnableTask.id,
									enable: pendingEnableTask.enable,
								});
							}}>
							{updateMutation.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
							{t('confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className='mt-4'>
				<Link href={`/admin/users`}>
					<Button variant='outline'>{t('admin_notifications_back_users')}</Button>
				</Link>
			</div>
		</div>
	);
};

const TaskForm = ({
	form,
	onChange,
	usableSources,
	usableTargets,
	triggerEvents,
}: {
	form: TaskFormState;
	onChange: (form: TaskFormState) => void;
	usableSources: Array<{ id: number; title: string }>;
	usableTargets: Array<{ id: number; title: string }>;
	triggerEvents: Array<{ id: number; name: string; name_zh: string }>;
}) => {
	const t = useTranslations();

	const setField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
		onChange({
			...form,
			[key]: value,
		});
	};

	return (
		<div className='space-y-6'>
			<div className='grid gap-5 lg:grid-cols-2'>
				<div className='grid gap-2 lg:col-span-2'>
				<Label>{t('setting_notification_task_manage_form_task_title')}</Label>
				<Input
					className='h-11 rounded-xl'
					placeholder={t('setting_notification_task_manage_form_task_title_placeholder')}
					value={form.title}
					onChange={(event) => setField('title', event.target.value)}
				/>
				</div>
				<div className='grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4'>
				<Label>{t('setting_notification_task_manage_form_source')}</Label>
				<Select
					value={form.notification_source_id}
					onValueChange={(value) => setField('notification_source_id', value)}>
					<SelectTrigger className='h-11 w-full rounded-xl'>
						<SelectValue placeholder={t('setting_notification_task_manage_form_source_placeholder')} />
					</SelectTrigger>
					<SelectContent>
						{usableSources.length > 0 ? (
							usableSources.map((item) => (
								<SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
							))
						) : (
							<SelectEmpty message={t('admin_notifications_sources_empty')} />
						)}
					</SelectContent>
				</Select>
				</div>
				<div className='grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4'>
				<Label>{t('setting_notification_task_manage_form_target')}</Label>
				<Select
					value={form.notification_target_id}
					onValueChange={(value) => setField('notification_target_id', value)}>
					<SelectTrigger className='h-11 w-full rounded-xl'>
						<SelectValue placeholder={t('setting_notification_task_manage_form_target_placeholder')} />
					</SelectTrigger>
					<SelectContent>
						{usableTargets.length > 0 ? (
							usableTargets.map((item) => (
								<SelectItem key={item.id} value={String(item.id)}>{item.title}</SelectItem>
							))
						) : (
							<SelectEmpty message={t('admin_notifications_targets_empty')} />
						)}
					</SelectContent>
				</Select>
				</div>
				<div className='grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4'>
				<Label>{t('setting_notification_task_manage_form_trigger_type')}</Label>
				<div className='flex h-11 items-center rounded-xl border border-input bg-background px-3 text-sm'>
					{t('setting_notification_task_manage_form_trigger_type_event')}
				</div>
				</div>
				<div className='grid gap-2 rounded-2xl border border-border/60 bg-muted/20 p-4'>
				<Label>{t('setting_notification_task_manage_form_trigger_event_id')}</Label>
				<Select
					value={form.trigger_event_id}
					onValueChange={(value) => setField('trigger_event_id', value)}>
					<SelectTrigger className='h-11 w-full rounded-xl'>
						<SelectValue placeholder={t('setting_notification_task_manage_form_trigger_event_id_placeholder')} />
					</SelectTrigger>
					<SelectContent>
						{triggerEvents.length > 0 ? (
							triggerEvents.map((item) => (
								<SelectItem key={item.id} value={String(item.id)}>{item.name_zh || item.name}</SelectItem>
							))
						) : (
							<SelectEmpty message={t('select_empty')} />
						)}
					</SelectContent>
				</Select>
				</div>
			</div>
			<div className='flex min-h-12 items-center rounded-2xl border border-border/60 bg-muted/20 px-4'>
				<Switch checked={form.enable} onCheckedChange={(checked) => setField('enable', checked)} />
				<Label className='ml-3'>{t('setting_notification_task_manage_form_enable')}</Label>
			</div>
		</div>
	);
};

export default AdminUserNotificationsPage;
