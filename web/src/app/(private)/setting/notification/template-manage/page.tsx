'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query';
import {
	ChevronRight,
	Info,
	Loader2,
	PlusCircleIcon,
	Send,
	XCircleIcon,
	Trash2,
} from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { toast } from 'sonner';

import NotificationTemplateCard from '@/components/notification/notification-template-card';
import PublicVisibilityField from '@/components/notification/public-visibility-field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
	getNotificationTemplatesCommunity,
	upsertNotificationTemplate,
	type NotificationTemplateItem,
	type NotificationTemplateUpsertRequest,
} from '@/service/notification';

type TemplateParameterForm = {
	key: string;
	label: string;
	description: string;
	value_type: string;
	required: boolean;
	default_value: string;
};

type TemplateForm = {
	notification_template_id?: number;
	name: string;
	description: string;
	is_public: boolean;
	title_template: string;
	content_template: string;
	link_template: string;
	cover_template: string;
	parameters: TemplateParameterForm[];
};

const EMPTY_PARAMETER: TemplateParameterForm = {
	key: '',
	label: '',
	description: '',
	value_type: 'string',
	required: false,
	default_value: '',
};

const EMPTY_FORM: TemplateForm = {
	name: '',
	description: '',
	is_public: false,
	title_template: '',
	content_template: '',
	link_template: '',
	cover_template: '',
	parameters: [],
};

const PARAMETER_TYPE_OPTIONS = ['string', 'number', 'boolean', 'date'];

export default function NotificationTemplateManagePage() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { ref: bottomRef, inView } = useInView();
	const [keyword, setKeyword] = useState('');
	const [open, setOpen] = useState(false);
	const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
	const [activeParameterIndex, setActiveParameterIndex] = useState<number>(0);

	const {
		data,
		isFetchingNextPage,
		isFetching,
		isError,
		error,
		isSuccess,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchNotificationTemplates', keyword],
		queryFn: (pageParam) =>
			getNotificationTemplatesCommunity({ ...pageParam.pageParam }),
		initialPageParam: {
			limit: 10,
			keyword,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start ?? undefined,
						limit: lastPage.limit,
						keyword,
					}
				: undefined;
		},
	});

	const templates = data?.pages.flatMap((page) => page.elements) || [];
	const activeParameter = form.parameters[activeParameterIndex];

	useEffect(() => {
		inView && !isFetching && hasNextPage && fetchNextPage();
	}, [fetchNextPage, hasNextPage, inView, isFetching]);

	const saveMutation = useMutation({
		mutationFn: upsertNotificationTemplate,
		onSuccess: () => {
			toast.success(t('notification_template_manage_save_success'));
			setOpen(false);
			setForm(EMPTY_FORM);
			setActiveParameterIndex(0);
			queryClient.invalidateQueries({
				queryKey: ['searchNotificationTemplates'],
			});
			queryClient.invalidateQueries({
				queryKey: ['searchUsableNotificationTemplates'],
			});
			queryClient.invalidateQueries({
				queryKey: ['notification-template'],
			});
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const openCreate = () => {
		setForm(EMPTY_FORM);
		setActiveParameterIndex(0);
		setOpen(true);
	};

	const openEdit = (template: NotificationTemplateItem) => {
		setForm({
			notification_template_id: template.id,
			name: template.name,
			description: template.description ?? '',
			is_public: template.is_public,
			title_template: template.title_template ?? '',
			content_template: template.content_template ?? '',
			link_template: template.link_template ?? '',
			cover_template: template.cover_template ?? '',
			parameters: template.parameters.map((item) => ({
				key: item.key,
				label: item.label,
				description: item.description ?? '',
				value_type: item.value_type,
				required: item.required,
				default_value: item.default_value ?? '',
			})),
		});
		setActiveParameterIndex(0);
		setOpen(true);
	};

	const updateParameter = (
		index: number,
		nextValue: Partial<TemplateParameterForm>,
	) => {
		setForm((current) => {
			const nextParameters = [...current.parameters];
			nextParameters[index] = { ...nextParameters[index], ...nextValue };
			return {
				...current,
				parameters: nextParameters,
			};
		});
	};

	const addParameter = () => {
		setForm((current) => ({
			...current,
			parameters: [...current.parameters, { ...EMPTY_PARAMETER }],
		}));
		setActiveParameterIndex(form.parameters.length);
	};

	const removeParameter = (index: number) => {
		setForm((current) => ({
			...current,
			parameters: current.parameters.filter(
				(_, itemIndex) => itemIndex !== index,
			),
		}));
		setActiveParameterIndex((current) =>
			Math.max(0, Math.min(current, form.parameters.length - 2)),
		);
	};

	const submit = async () => {
		if (!form.name.trim() || !form.title_template.trim()) {
			toast.error(t('notification_template_manage_required'));
			return;
		}
		const payload: NotificationTemplateUpsertRequest = {
			notification_template_id: form.notification_template_id,
			name: form.name.trim(),
			is_public: form.is_public,
			description: form.description.trim() || undefined,
			title_template: form.title_template.trim(),
			content_template: form.content_template.trim() || undefined,
			link_template: form.link_template.trim() || undefined,
			cover_template: form.cover_template.trim() || undefined,
			parameters: form.parameters
				.filter((item) => item.key.trim() && item.label.trim())
				.map((item) => ({
					key: item.key.trim(),
					label: item.label.trim(),
					description: item.description.trim() || undefined,
					value_type: item.value_type.trim() || 'string',
					required: item.required,
					default_value: item.default_value.trim() || undefined,
				})),
		};
		await saveMutation.mutateAsync(payload);
	};

	const submitting = saveMutation.isPending;
	const parameterCountLabel = useMemo(() => {
		return form.parameters.length > 0
			? `${form.parameters.length}`
			: t('notification_template_manage_parameters_empty');
	}, [form.parameters.length, t]);

	return (
		<>
			<div className='flex flex-row gap-3 px-5 pb-5'>
				<Alert className='border-none bg-emerald-600/10 text-emerald-500 dark:bg-emerald-600/15'>
					<Info className='size-4' />
					<AlertTitle>{t('notification_template_manage_alert')}</AlertTitle>
					<AlertDescription>
						{t('notification_template_manage_alert_detail')}
					</AlertDescription>
				</Alert>
			</div>
			<div className='flex flex-row gap-3 px-5 pb-5'>
				<Input
					placeholder={t('notification_template_manage_search')}
					value={keyword}
					onChange={(e) => setKeyword(e.target.value)}
				/>
				<Button onClick={openCreate}>
					{t('notification_template_manage_add')}
					<PlusCircleIcon />
				</Button>
			</div>
			{isSuccess && templates.length === 0 && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<Send />
						</EmptyMedia>
						<EmptyDescription>
							{t('notification_template_manage_empty')}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			{isError && (
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<XCircleIcon />
						</EmptyMedia>
						<EmptyDescription>{error.message}</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			<div className='grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-3 xl:grid-cols-4'>
				{templates.map((template, index) => (
					<div
						className='h-full'
						key={template.id}
						ref={index === templates.length - 1 ? bottomRef : undefined}>
						<NotificationTemplateCard
							notification_template={template}
							onEdit={openEdit}
						/>
					</div>
				))}
				{isFetching && !data && (
					<>
						{[...Array(12)].map((_, index) => (
							<Skeleton key={index} className='h-64 w-full' />
						))}
					</>
				)}
				{isFetchingNextPage && data && (
					<>
						{[...Array(12)].map((_, index) => (
							<Skeleton key={index} className='h-64 w-full' />
						))}
					</>
				)}
			</div>

			<Dialog
				open={open}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) {
						setForm(EMPTY_FORM);
						setActiveParameterIndex(0);
					}
					setOpen(nextOpen);
				}}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-4xl'>
					<DialogHeader className='border-b border-border/60 px-6 pb-4 pt-6'>
						<DialogTitle>
							{form.notification_template_id
								? t('notification_template_manage_edit')
								: t('notification_template_manage_add')}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-6 overflow-y-auto px-6 py-5'>
						<div className='grid grid-cols-12 gap-2'>
							<Label className='col-span-3'>
								{t('notification_template_manage_name')}
							</Label>
							<Input
								className='col-span-9'
								value={form.name}
								onChange={(event) =>
									setForm({ ...form, name: event.target.value })
								}
							/>
						</div>
						<div className='grid grid-cols-12 gap-2'>
							<Label className='col-span-3'>
								{t('notification_template_manage_description_field')}
							</Label>
							<Textarea
								className='col-span-9 min-h-24'
								value={form.description}
								onChange={(event) =>
									setForm({ ...form, description: event.target.value })
								}
							/>
						</div>

						<div className='grid grid-cols-12 gap-2'>
							<div className='col-span-3'>
								<Label>{t('notification_template_manage_public_label')}</Label>
							</div>
							<div className='col-span-9'>
								<PublicVisibilityField
									label={t('notification_template_manage_public_label')}
									description={t(
										'notification_template_manage_public_description',
									)}
									checked={form.is_public}
									onCheckedChange={(checked) =>
										setForm({ ...form, is_public: checked })
									}
								/>
							</div>
						</div>

						<Separator />

						<div className='grid grid-cols-12 gap-2'>
							<Label className='col-span-3'>
								{t('notification_template_manage_title_template')}
							</Label>
							<Input
								className='col-span-9'
								value={form.title_template}
								onChange={(event) =>
									setForm({ ...form, title_template: event.target.value })
								}
							/>
						</div>

						<div className='grid grid-cols-12 gap-2'>
							<Label className='col-span-3'>
								{t('notification_template_manage_content_template')}
							</Label>
							<Textarea
								className='col-span-9 min-h-32'
								value={form.content_template}
								onChange={(event) =>
									setForm({ ...form, content_template: event.target.value })
								}
							/>
						</div>

						<div className='grid grid-cols-12 gap-2'>
							<Label className='col-span-3'>
								{t('notification_template_manage_link_template')}
							</Label>
							<Input
								className='col-span-9'
								value={form.link_template}
								onChange={(event) =>
									setForm({ ...form, link_template: event.target.value })
								}
							/>
						</div>
						<div className='grid grid-cols-12 gap-2'>
							<Label className='col-span-3'>
								{t('notification_template_manage_cover_template')}
							</Label>
							<Input
								className='col-span-9'
								value={form.cover_template}
								onChange={(event) =>
									setForm({ ...form, cover_template: event.target.value })
								}
							/>
						</div>

						<div className='rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground'>
							{t('notification_template_manage_tip')}
						</div>

						<Separator />

						<div className='grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]'>
							<div className='space-y-4 rounded-3xl border border-border/60 p-4'>
								<div className='flex items-center justify-between gap-2'>
									<Label>
										{t('notification_template_manage_parameters')}
										<div className='text-xs text-muted-foreground'>
											{parameterCountLabel}
										</div>
									</Label>
									<Button
										type='button'
										variant='outline'
										size='sm'
										onClick={addParameter}>
										{t('notification_template_manage_parameter_add_action')}
									</Button>
								</div>

								<div className='space-y-2'>
									{form.parameters.length > 0 ? (
										form.parameters.map((parameter, index) => (
											<button
												key={`${parameter.key || 'parameter'}-${index}`}
												type='button'
												onClick={() => setActiveParameterIndex(index)}
												className={cn(
													'flex w-full items-center justify-between rounded-2xl border p-3 text-left transition',
													activeParameterIndex === index
														? 'border-foreground/20 bg-muted'
														: 'border-border/60 hover:bg-muted/40',
												)}>
												<div className='min-w-0'>
													<p className='truncate font-medium'>
														{parameter.label ||
															t(
																'notification_template_manage_parameter_untitled',
															)}
													</p>
													<p className='truncate text-xs text-muted-foreground'>
														{parameter.key ||
															t('notification_template_manage_parameter_key')}
													</p>
												</div>
												<ChevronRight className='size-4 shrink-0 text-muted-foreground' />
											</button>
										))
									) : (
										<div className='rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground'>
											{t('notification_template_manage_parameters_empty')}
										</div>
									)}
								</div>
							</div>

							<div className='rounded-3xl border border-border/60 p-5'>
								{activeParameter ? (
									<div className='space-y-5'>
										<div className='flex items-center justify-between gap-3'>
											<div>
												<h3 className='font-medium'>
													{activeParameter.label ||
														t('notification_template_manage_parameter_editor')}
												</h3>
												<p className='text-sm text-muted-foreground'>
													{t(
														'notification_template_manage_parameter_editor_description',
													)}
												</p>
											</div>
											<div className='flex gap-2'>
												<Button
													type='button'
													variant='ghost'
													size='sm'
													onClick={() => removeParameter(activeParameterIndex)}>
													<Trash2 className='size-4' />
													{t('delete')}
												</Button>
											</div>
										</div>
										<div className='grid gap-5 md:grid-cols-2'>
											<div className='grid gap-2'>
												<Label>
													{t('notification_template_manage_parameter_label')}
												</Label>
												<Input
													value={activeParameter.label}
													onChange={(event) =>
														updateParameter(activeParameterIndex, {
															label: event.target.value,
														})
													}
												/>
											</div>
											<div className='grid gap-2'>
												<Label>
													{t('notification_template_manage_parameter_key')}
												</Label>
												<Input
													value={activeParameter.key}
													onChange={(event) =>
														updateParameter(activeParameterIndex, {
															key: event.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className='grid gap-2'>
											<Label>
												{t('notification_template_manage_description_field')}
											</Label>
											<Textarea
												value={activeParameter.description}
												onChange={(event) =>
													updateParameter(activeParameterIndex, {
														description: event.target.value,
													})
												}
											/>
										</div>
										<div className='grid gap-5 md:grid-cols-2'>
											<div className='grid gap-2'>
												<Label>
													{t('notification_template_manage_parameter_type')}
												</Label>
												<Select
													value={activeParameter.value_type}
													onValueChange={(value) =>
														updateParameter(activeParameterIndex, {
															value_type: value,
														})
													}>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{PARAMETER_TYPE_OPTIONS.map((option) => (
															<SelectItem key={option} value={option}>
																{option}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className='grid gap-2'>
												<Label>
													{t('notification_template_manage_parameter_default')}
												</Label>
												<Input
													value={activeParameter.default_value}
													onChange={(event) =>
														updateParameter(activeParameterIndex, {
															default_value: event.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className='flex items-center justify-between rounded-2xl border border-border/60 px-4 py-3'>
											<div>
												<p className='font-medium'>
													{t('notification_template_manage_parameter_required')}
												</p>
											</div>
											<Switch
												checked={activeParameter.required}
												onCheckedChange={(checked) =>
													updateParameter(activeParameterIndex, {
														required: checked,
													})
												}
											/>
										</div>
									</div>
								) : (
									<div className='rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground'>
										{t('notification_template_manage_parameters_empty')}
									</div>
								)}
							</div>
						</div>
					</div>
					<DialogFooter className='border-t border-border/60 px-6 py-4'>
						<Button
							variant='outline'
							onClick={() => setOpen(false)}
							disabled={submitting}>
							{t('cancel')}
						</Button>
						<Button onClick={submit} disabled={submitting}>
							{t('save')}
							{submitting && <Loader2 className='animate-spin' />}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
