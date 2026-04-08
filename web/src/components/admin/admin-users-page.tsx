'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
	Eye,
	ExternalLink,
	BellRing,
	Loader2,
	Pencil,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	Trash2,
	Upload,
	UserCog,
	Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { UserRole } from '@/enums/user';
import { cn, replacePath } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import {
	type AdminUserCreateRequest,
	type AdminUserComputeLedgerItem,
	type AdminUserDetail,
	type AdminUserSummary,
	type AdminUserUpdateRequest,
	createAdminUser,
	deleteAdminUser,
	getAdminUserComputeInfo,
	getAdminUserComputeLedger,
	getAdminUserDetail,
	searchAdminUsers,
	uploadAdminUserAvatar,
	updateAdminUser,
} from '@/service/admin';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

type RoleFilterValue = 'all' | '1' | '2' | '3';
type StatusFilterValue = 'all' | 'active' | 'forbidden';
type PageSizeValue = '10' | '20' | '50';
type PendingUserAction = 'create' | 'update' | null;
type LedgerFilter = 'all' | 'income' | 'expense';

type UserFormState = {
	nickname: string;
	email: string;
	password: string;
	role: string;
	slogan: string;
	avatar: string;
	avatarFile: File | null;
	avatarPreviewUrl: string | null;
	is_forbidden: boolean;
};

const DEFAULT_AVATAR_PATH = 'files/default_avatar.png';

const DEFAULT_FORM_STATE: UserFormState = {
	nickname: '',
	email: '',
	password: '',
	role: String(UserRole.USER),
	slogan: '',
	avatar: DEFAULT_AVATAR_PATH,
	avatarFile: null,
	avatarPreviewUrl: null,
	is_forbidden: false,
};

const getRoleMeta = (
	role: number,
	t: ReturnType<typeof useTranslations>,
) => {
	switch (role) {
		case UserRole.ROOT:
			return {
				label: t('user_detail_role_root'),
				className:
					'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
			};
		case UserRole.ADMIN:
			return {
				label: t('user_detail_role_admin'),
				className:
					'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
			};
		default:
			return {
				label: t('user_detail_role_user'),
				className:
					'border-border/60 bg-background/70 text-muted-foreground',
			};
	}
};

const AvatarField = ({
	avatar,
	avatarPreviewUrl,
	previewOwnerId,
	nickname,
	onSelectFile,
	onReset,
	disabled = false,
}: {
	avatar: string;
	avatarPreviewUrl: string | null;
	previewOwnerId?: number | null;
	nickname: string;
	onSelectFile: (file: File) => void;
	onReset: () => void;
	disabled?: boolean;
}) => {
	const t = useTranslations();
	const inputRef = useRef<HTMLInputElement>(null);

	const previewSrc =
		avatarPreviewUrl ??
		(avatar && previewOwnerId ? replacePath(avatar, previewOwnerId) : null);

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		onSelectFile(file);
		event.target.value = '';
	};

	return (
		<div className='grid gap-3 sm:col-span-2'>
			<Label>{t('admin_users_avatar_label')}</Label>
			<div className='flex flex-col gap-4 rounded-[24px] border border-border/60 bg-muted/20 p-4 sm:flex-row sm:items-center'>
				<Avatar className='size-20 border border-border/60'>
					{previewSrc ? (
						<AvatarImage
							src={previewSrc}
							alt={nickname || 'avatar'}
							className='object-cover'
						/>
					) : null}
					<AvatarFallback className='text-lg font-semibold'>
						{nickname.slice(0, 1) || '?'}
					</AvatarFallback>
				</Avatar>
				<div className='min-w-0 flex-1 space-y-2'>
					<div className='text-sm text-muted-foreground'>
						{t('admin_users_avatar_hint')}
					</div>
					<div className='flex flex-wrap gap-2'>
						<Button
							type='button'
							variant='outline'
							onClick={() => inputRef.current?.click()}
							disabled={disabled}>
							<Upload className='size-4' />
							{avatarPreviewUrl || avatar !== DEFAULT_AVATAR_PATH
								? t('account_avatar_update')
								: t('account_avatar_upload')}
						</Button>
						<Button
							type='button'
							variant='ghost'
							onClick={onReset}
							disabled={disabled}>
							<RotateCcw className='size-4' />
							{t('admin_users_avatar_reset')}
						</Button>
					</div>
				</div>
			</div>
			<input
				ref={inputRef}
				type='file'
				accept='image/*'
				className='hidden'
				onChange={handleChange}
				disabled={disabled}
			/>
		</div>
	);
};

const resolveLedgerType = (
	t: ReturnType<typeof useTranslations>,
	source?: string | null,
	deltaPoints?: number,
) => {
	if ((source ?? '').startsWith('plan-')) {
		return {
			label: t('account_compute_ledger_type_plan'),
			className:
				'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
		};
	}
	if ((source ?? '').includes('compute-pack')) {
		return {
			label: t('account_compute_ledger_type_pack'),
			className:
				'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
		};
	}
	if ((source ?? '').includes('consume')) {
		return {
			label: t('account_compute_ledger_type_consume'),
			className:
				'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
		};
	}
	if ((source ?? '').includes('expire')) {
		return {
			label: t('account_compute_ledger_type_expired'),
			className:
				'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300',
		};
	}
	if ((source ?? '').includes('order')) {
		return {
			label:
				deltaPoints && deltaPoints > 0
					? t('account_compute_ledger_type_pack')
					: t('account_compute_ledger_type_consume'),
			className:
				deltaPoints && deltaPoints > 0
					? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
					: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
		};
	}
	return {
		label:
			deltaPoints && deltaPoints > 0
				? t('account_compute_ledger_type_income')
				: t('account_compute_ledger_type_expense'),
		className: 'border-border/70 bg-background/80 text-foreground',
	};
};

const AdminUserComputeLedgerTable = ({
	userId,
}: {
	userId: number;
}) => {
	const t = useTranslations();
	const [filter, setFilter] = useState<LedgerFilter>('all');
	const [page, setPage] = useState(0);
	const pageSize = 10;
	const { data, isLoading, isFetching, isError, error } = useQuery({
		queryKey: ['admin-user-compute-ledger', userId, filter, page],
		queryFn: () =>
			getAdminUserComputeLedger({
				user_id: userId,
				direction: filter,
				page,
				page_size: pageSize,
			}),
	});

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const startIndex = total === 0 ? 0 : page * pageSize + 1;
	const endIndex = total === 0 ? 0 : Math.min((page + 1) * pageSize, total);

	if (isLoading) {
		return <Skeleton className='h-72 rounded-[24px]' />;
	}

	if (isError) {
		return (
			<div className='rounded-[24px] border border-border/60 bg-background/60 p-4 text-sm text-destructive'>
				{error instanceof Error ? error.message : t('something_wrong')}
			</div>
		);
	}

	return (
		<div className='rounded-[24px] border border-border/60 bg-background/60 p-4'>
			<div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
				<Tabs
					value={filter}
					onValueChange={(value) => {
						setFilter(value as LedgerFilter);
						setPage(0);
					}}
					className='gap-0'>
					<TabsList>
						<TabsTrigger value='all'>{t('account_compute_ledger_filter_all')}</TabsTrigger>
						<TabsTrigger value='income'>{t('account_compute_ledger_filter_income')}</TabsTrigger>
						<TabsTrigger value='expense'>{t('account_compute_ledger_filter_expense')}</TabsTrigger>
					</TabsList>
				</Tabs>
				<div className='text-right text-xs text-muted-foreground'>
					<p>{t('account_compute_ledger_total', { total: total.toLocaleString() })}</p>
					<p>{t('account_compute_ledger_page_range', { start: startIndex.toLocaleString(), end: endIndex.toLocaleString() })}</p>
				</div>
			</div>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t('account_compute_ledger_time')}</TableHead>
						<TableHead>{t('account_compute_ledger_change')}</TableHead>
						<TableHead>{t('account_compute_ledger_reason')}</TableHead>
						<TableHead>{t('account_compute_ledger_expire_time')}</TableHead>
						<TableHead className='text-right'>{t('account_compute_ledger_balance_after')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.length === 0 ? (
						<TableRow>
							<TableCell colSpan={5} className='py-6 text-center text-sm text-muted-foreground'>
								{filter === 'all'
									? t('account_compute_ledger_empty')
									: t('account_compute_ledger_empty_filtered')}
							</TableCell>
						</TableRow>
					) : null}
					{items.map((item: AdminUserComputeLedgerItem) => {
						const ledgerType = resolveLedgerType(t, item.source, item.delta_points);
						return (
							<TableRow key={item.id}>
								<TableCell className='text-xs text-muted-foreground whitespace-normal'>
									{item.create_time
										? format(new Date(item.create_time), 'yyyy-MM-dd HH:mm')
										: '--'}
								</TableCell>
								<TableCell
									className={cn('font-semibold', {
										'text-emerald-600': item.delta_points > 0,
										'text-rose-600': item.delta_points < 0,
									})}>
									{item.delta_points > 0 ? '+' : ''}
									{item.delta_points.toLocaleString()}
								</TableCell>
								<TableCell className='max-w-[260px] whitespace-normal'>
									<div className='flex flex-col gap-1'>
										<Badge variant='outline' className={cn('w-fit', ledgerType.className)}>
											{ledgerType.label}
										</Badge>
										<p className='break-all text-sm'>
											{item.reason || item.source || '--'}
										</p>
									</div>
								</TableCell>
								<TableCell className='text-xs text-muted-foreground whitespace-normal'>
									{item.expire_time
										? format(new Date(item.expire_time), 'yyyy-MM-dd HH:mm')
										: '--'}
								</TableCell>
								<TableCell className='text-right font-medium'>
									{item.balance_after.toLocaleString()}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
			<div className='mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
				<p className='text-xs text-muted-foreground'>
					{t('account_compute_ledger_browse_hint')}
				</p>
				<div className='flex items-center justify-end gap-2'>
					<Button
						type='button'
						variant='outline'
						size='sm'
						disabled={page === 0 || isFetching}
						onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}>
						{t('account_compute_ledger_prev_page')}
					</Button>
					<span className='min-w-24 text-center text-xs text-muted-foreground'>
						{t('account_compute_ledger_page_status', { page: page + 1, total: totalPages })}
					</span>
					<Button
						type='button'
						variant='outline'
						size='sm'
						disabled={!data?.has_more || isFetching}
						onClick={() => setPage((currentPage) => currentPage + 1)}>
						{t('account_compute_ledger_next_page')}
					</Button>
				</div>
			</div>
		</div>
	);
};

const UserFormDialog = ({
	open,
	onOpenChange,
	title,
	description,
	form,
	onFormChange,
	onAvatarSelect,
	onAvatarReset,
	onSubmit,
	isPending,
	submitLabel,
	isEdit = false,
	canManagePrivilegedRoles = false,
	previewOwnerId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	form: UserFormState;
	onFormChange: (patch: Partial<UserFormState>) => void;
	onAvatarSelect: (file: File) => void;
	onAvatarReset: () => void;
	onSubmit: () => void;
	isPending: boolean;
	submitLabel: string;
	isEdit?: boolean;
	canManagePrivilegedRoles?: boolean;
	previewOwnerId?: number | null;
}) => {
	const t = useTranslations();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='max-w-2xl rounded-[28px]'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4 sm:grid-cols-2'>
					<div className='grid gap-2'>
						<Label>{t('account_nickname')}</Label>
						<Input
							value={form.nickname}
							onChange={(event) =>
								onFormChange({ nickname: event.target.value })
							}
						/>
					</div>
					<div className='grid gap-2'>
						<Label>{t('account_email')}</Label>
						<Input
							type='email'
							value={form.email}
							onChange={(event) => onFormChange({ email: event.target.value })}
						/>
					</div>
					<div className='grid gap-2'>
						<Label>{t('account_password')}</Label>
						<Input
							type='password'
							value={form.password}
							onChange={(event) =>
								onFormChange({ password: event.target.value })
							}
							placeholder={
								isEdit ? t('admin_users_password_placeholder') : undefined
							}
						/>
					</div>
					<div className='grid gap-2'>
						<Label>{t('user_detail_role')}</Label>
						<Select
							value={form.role}
							onValueChange={(value) => onFormChange({ role: value })}>
							<SelectTrigger className='w-full'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={String(UserRole.USER)}>
									{t('user_detail_role_user')}
								</SelectItem>
								{canManagePrivilegedRoles ? (
									<SelectItem value={String(UserRole.ADMIN)}>
										{t('user_detail_role_admin')}
									</SelectItem>
								) : null}
								{canManagePrivilegedRoles ? (
									<SelectItem value={String(UserRole.ROOT)}>
										{t('user_detail_role_root')}
									</SelectItem>
								) : null}
							</SelectContent>
						</Select>
					</div>
					<div className='grid gap-2 sm:col-span-2'>
						<Label>{t('account_slogan')}</Label>
						<Input
							value={form.slogan}
							onChange={(event) => onFormChange({ slogan: event.target.value })}
						/>
					</div>
					<AvatarField
						avatar={form.avatar}
						avatarPreviewUrl={form.avatarPreviewUrl}
						previewOwnerId={previewOwnerId}
						nickname={form.nickname}
						onSelectFile={onAvatarSelect}
						onReset={onAvatarReset}
						disabled={isPending}
					/>
					{isEdit ? (
						<div className='grid gap-2 sm:col-span-2'>
							<Label>{t('admin_users_status_label')}</Label>
							<Select
								value={form.is_forbidden ? 'forbidden' : 'active'}
								onValueChange={(value) =>
									onFormChange({ is_forbidden: value === 'forbidden' })
								}>
								<SelectTrigger className='w-full'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='active'>
										{t('admin_users_status_active')}
									</SelectItem>
									<SelectItem value='forbidden'>
										{t('admin_users_status_forbidden')}
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					) : null}
				</div>
				<DialogFooter>
					<Button variant='outline' onClick={() => onOpenChange(false)}>
						{t('cancel')}
					</Button>
					<Button onClick={onSubmit} disabled={isPending}>
						{isPending ? <Loader2 className='size-4 animate-spin' /> : null}
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const AdminUsersPage = () => {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { mainUserInfo } = useUserContext();
	const [keyword, setKeyword] = useState('');
	const [roleFilter, setRoleFilter] = useState<RoleFilterValue>('all');
	const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
	const [submittedKeyword, setSubmittedKeyword] = useState('');
	const [submittedRole, setSubmittedRole] = useState<RoleFilterValue>('all');
	const [submittedStatus, setSubmittedStatus] =
		useState<StatusFilterValue>('all');
	const [pageNum, setPageNum] = useState(1);
	const [pageSize, setPageSize] = useState<PageSizeValue>('10');

	const [createOpen, setCreateOpen] = useState(false);
	const [viewUserId, setViewUserId] = useState<number | null>(null);
	const [editUserId, setEditUserId] = useState<number | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<AdminUserSummary | null>(null);
	const [pendingUserAction, setPendingUserAction] =
		useState<PendingUserAction>(null);
	const [createForm, setCreateForm] = useState<UserFormState>(DEFAULT_FORM_STATE);
	const [editForm, setEditForm] = useState<UserFormState>(DEFAULT_FORM_STATE);
	const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);

	const searchParams = useMemo(() => {
		return {
			keyword: submittedKeyword || undefined,
			role: submittedRole === 'all' ? undefined : Number(submittedRole),
			is_forbidden:
				submittedStatus === 'all'
					? undefined
					: submittedStatus === 'forbidden',
			page_num: pageNum,
			page_size: Number(pageSize),
		};
	}, [submittedKeyword, submittedRole, submittedStatus, pageNum, pageSize]);

	const usersQuery = useQuery({
		queryKey: ['admin-users', searchParams],
		queryFn: () => searchAdminUsers(searchParams),
	});

	const viewUserQuery = useQuery({
		queryKey: ['admin-user-detail', viewUserId],
		queryFn: () => getAdminUserDetail(viewUserId!),
		enabled: viewUserId != null,
	});

	const viewUserComputeInfoQuery = useQuery({
		queryKey: ['admin-user-compute-info', viewUserId],
		queryFn: () => getAdminUserComputeInfo(viewUserId!),
		enabled: viewUserId != null,
	});

	const editUserQuery = useQuery({
		queryKey: ['admin-user-edit-detail', editUserId],
		queryFn: () => getAdminUserDetail(editUserId!),
		enabled: editUserId != null,
	});

	useEffect(() => {
		if (!editUserQuery.data) {
			return;
		}
		const detail = editUserQuery.data;
		setEditForm({
			nickname: detail.nickname || '',
			email: detail.email || '',
			password: '',
			role: String(detail.role),
			slogan: detail.slogan || '',
			avatar: detail.avatar || DEFAULT_AVATAR_PATH,
			avatarFile: null,
			avatarPreviewUrl: null,
			is_forbidden: detail.is_forbidden,
		});
	}, [editUserQuery.data]);

	const createMutation = useMutation({
		mutationFn: (data: AdminUserCreateRequest) => createAdminUser(data),
		onError(error: Error) {
			toast.error(error.message);
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: AdminUserUpdateRequest) => updateAdminUser(data),
		onError(error: Error) {
			toast.error(error.message);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (userId: number) => deleteAdminUser(userId),
		onSuccess() {
			toast.success(t('admin_users_delete_success'));
			setDeleteTarget(null);
			queryClient.invalidateQueries({ queryKey: ['admin-users'] });
			queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
			queryClient.invalidateQueries({ queryKey: ['admin-user-edit-detail'] });
		},
		onError(error: Error) {
			toast.error(error.message);
		},
	});

	const users = usersQuery.data?.elements ?? [];
	const canManagePrivilegedRoles = mainUserInfo?.role === UserRole.ROOT;

	const revokePreviewUrl = (url: string | null) => {
		if (url?.startsWith('blob:')) {
			URL.revokeObjectURL(url);
		}
	};

	const updateFormAvatar = (
		form: UserFormState,
		file: File,
	): UserFormState => {
		revokePreviewUrl(form.avatarPreviewUrl);
		return {
			...form,
			avatarFile: file,
			avatarPreviewUrl: URL.createObjectURL(file),
		};
	};

	const resetFormAvatar = (form: UserFormState): UserFormState => {
		revokePreviewUrl(form.avatarPreviewUrl);
		return {
			...form,
			avatar: DEFAULT_AVATAR_PATH,
			avatarFile: null,
			avatarPreviewUrl: null,
		};
	};

	useEffect(() => {
		return () => {
			revokePreviewUrl(createForm.avatarPreviewUrl);
			revokePreviewUrl(editForm.avatarPreviewUrl);
		};
	}, [createForm.avatarPreviewUrl, editForm.avatarPreviewUrl]);

	const submitSearch = () => {
		setSubmittedKeyword(keyword.trim());
		setSubmittedRole(roleFilter);
		setSubmittedStatus(statusFilter);
		setPageNum(1);
	};

	const handleRefresh = async () => {
		await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
		await usersQuery.refetch();
	};

	const handleCreateSubmit = async () => {
		if (!createForm.nickname.trim() || !createForm.email.trim() || !createForm.password.trim()) {
			toast.error(t('admin_users_form_required'));
			return;
		}
		try {
			setIsAvatarSubmitting(true);
			const createdUser = await createMutation.mutateAsync({
				nickname: createForm.nickname.trim(),
				email: createForm.email.trim(),
				password: createForm.password,
				role: Number(createForm.role),
				slogan: createForm.slogan.trim() || undefined,
				avatar: createForm.avatar.trim() || undefined,
			});
			if (createForm.avatarFile) {
				const uploaded = await uploadAdminUserAvatar({
					user_id: createdUser.id,
					file: createForm.avatarFile,
				});
				await updateMutation.mutateAsync({
					user_id: createdUser.id,
					avatar: uploaded.file_path,
				});
			}
			toast.success(t('admin_users_create_success'));
			setCreateOpen(false);
			setCreateForm((current) => resetFormAvatar({ ...DEFAULT_FORM_STATE, avatarPreviewUrl: current.avatarPreviewUrl }));
			queryClient.invalidateQueries({ queryKey: ['admin-users'] });
			queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
			queryClient.invalidateQueries({ queryKey: ['admin-user-edit-detail'] });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('something_wrong'));
		} finally {
			setIsAvatarSubmitting(false);
		}
	};

	const handleUpdateSubmit = async () => {
		if (!editUserId) return;
		if (!editForm.nickname.trim() || !editForm.email.trim()) {
			toast.error(t('admin_users_form_required'));
			return;
		}
		try {
			setIsAvatarSubmitting(true);
			const nextAvatar =
				editForm.avatarFile != null
					? (
							await uploadAdminUserAvatar({
								user_id: editUserId,
								file: editForm.avatarFile,
							})
						).file_path
					: editForm.avatar.trim() || undefined;
			await updateMutation.mutateAsync({
				user_id: editUserId,
				nickname: editForm.nickname.trim(),
				email: editForm.email.trim(),
				password: editForm.password.trim() || undefined,
				role: Number(editForm.role),
				slogan: editForm.slogan,
				avatar: nextAvatar,
				is_forbidden: editForm.is_forbidden,
			});
			toast.success(t('admin_users_update_success'));
			setEditUserId(null);
			setEditForm((current) => resetFormAvatar({ ...DEFAULT_FORM_STATE, avatarPreviewUrl: current.avatarPreviewUrl }));
			queryClient.invalidateQueries({ queryKey: ['admin-users'] });
			queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
			queryClient.invalidateQueries({ queryKey: ['admin-user-edit-detail'] });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t('something_wrong'));
		} finally {
			setIsAvatarSubmitting(false);
		}
	};

	return (
		<div className='p-6 sm:p-7'>
			<Card className='rounded-[28px] border-border/60 py-0'>
				<CardHeader className='px-6 pt-6'>
					<CardTitle className='flex items-center gap-2 text-2xl tracking-tight'>
						<UserCog className='size-5 text-emerald-600 dark:text-emerald-300' />
						{t('admin_users_title')}
					</CardTitle>
					<CardDescription className='leading-6'>
						{t('admin_users_description')}
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-5 px-6 pb-6'>
					<div className='flex flex-col gap-3 xl:flex-row'>
						<Input
							value={keyword}
							onChange={(event) => setKeyword(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									submitSearch();
								}
							}}
							placeholder={t('admin_users_search_placeholder')}
							className='h-10 rounded-xl xl:max-w-md'
						/>
						<Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilterValue)}>
							<SelectTrigger className='w-full xl:w-[180px]'>
								<SelectValue placeholder={t('admin_users_filter_role')} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>{t('admin_filter_all')}</SelectItem>
								<SelectItem value='1'>{t('user_detail_role_root')}</SelectItem>
								<SelectItem value='2'>{t('user_detail_role_admin')}</SelectItem>
								<SelectItem value='3'>{t('user_detail_role_user')}</SelectItem>
							</SelectContent>
						</Select>
						<Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilterValue)}>
							<SelectTrigger className='w-full xl:w-[180px]'>
								<SelectValue placeholder={t('admin_users_status_label')} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='all'>{t('admin_filter_all')}</SelectItem>
								<SelectItem value='active'>
									{t('admin_users_status_active')}
								</SelectItem>
								<SelectItem value='forbidden'>
									{t('admin_users_status_forbidden')}
								</SelectItem>
							</SelectContent>
						</Select>
						<Button onClick={submitSearch} className='rounded-xl'>
							<Search className='size-4' />
							{t('admin_search')}
						</Button>
						<Button
							variant='outline'
							onClick={handleRefresh}
							disabled={usersQuery.isFetching}
							className='rounded-xl'>
							<RefreshCw
								className={usersQuery.isFetching ? 'size-4 animate-spin' : 'size-4'}
							/>
							{t('refresh')}
						</Button>
						<Button
							onClick={() => setCreateOpen(true)}
							className='rounded-xl xl:ml-auto'>
							<Plus className='size-4' />
							{t('admin_users_create_action')}
						</Button>
					</div>
					<div className='flex items-center justify-between gap-3'>
						<div className='text-sm text-muted-foreground'>
							{t('admin_page_size_label')}
						</div>
						<Select
							value={pageSize}
							onValueChange={(value) => {
								setPageSize(value as PageSizeValue);
								setPageNum(1);
							}}>
							<SelectTrigger className='w-[120px]'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value='10'>10</SelectItem>
								<SelectItem value='20'>20</SelectItem>
								<SelectItem value='50'>50</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{usersQuery.isLoading ? (
						<Skeleton className='h-[320px] rounded-[24px]' />
					) : usersQuery.isError ? (
						<Empty className='rounded-[24px]'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<Users />
								</EmptyMedia>
								<EmptyTitle>{t('something_wrong')}</EmptyTitle>
								<EmptyDescription>{usersQuery.error.message}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : users.length === 0 ? (
						<Empty className='rounded-[24px]'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<Users />
								</EmptyMedia>
								<EmptyTitle>{t('admin_empty_title')}</EmptyTitle>
								<EmptyDescription>{t('admin_users_empty_description')}</EmptyDescription>
							</EmptyHeader>
						</Empty>
					) : (
						<div className='space-y-3'>
							<div className='text-sm text-muted-foreground'>
								{t('admin_users_result_summary', {
									count: users.length,
									total: usersQuery.data?.total_elements ?? users.length,
								})}
							</div>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{t('admin_users_table_user')}</TableHead>
										<TableHead>{t('account_email')}</TableHead>
										<TableHead>{t('user_detail_role')}</TableHead>
										<TableHead>{t('admin_users_status_label')}</TableHead>
										<TableHead>{t('admin_users_table_stats')}</TableHead>
										<TableHead>{t('admin_action')}</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{users.map((user) => {
										const roleMeta = getRoleMeta(user.role, t);
										const canMutateTarget =
											canManagePrivilegedRoles || user.role === UserRole.USER;
										return (
											<TableRow key={user.id}>
												<TableCell>
													<div className='flex items-center gap-3'>
														<Avatar className='size-10 border border-border/60'>
															<AvatarImage
																src={replacePath(user.avatar, user.id)}
																alt={user.nickname}
															/>
															<AvatarFallback>
																{user.nickname.slice(0, 1)}
															</AvatarFallback>
														</Avatar>
														<div className='min-w-0'>
															<div className='truncate font-medium'>
																{user.nickname}
															</div>
															<div className='truncate text-xs text-muted-foreground'>
																ID {user.id} · {user.uuid}
															</div>
														</div>
													</div>
												</TableCell>
												<TableCell>{user.email || '-'}</TableCell>
												<TableCell>
													<Badge className={cn('rounded-full border', roleMeta.className)}>
														{roleMeta.label}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge
														variant={user.is_forbidden ? 'destructive' : 'outline'}
														className='rounded-full'>
														{user.is_forbidden
															? t('admin_users_status_forbidden')
															: t('admin_users_status_active')}
													</Badge>
												</TableCell>
												<TableCell>
													<div className='text-xs text-muted-foreground'>
														{t('user_fans')} {user.fans} / {t('user_follows')} {user.follows}
													</div>
												</TableCell>
												<TableCell>
													<div className='flex items-center gap-2'>
														<Button
															variant='outline'
															size='sm'
															onClick={() => setViewUserId(user.id)}>
															<Eye className='size-4' />
														</Button>
														<Button variant='outline' size='sm' asChild>
															<Link href={`/user/detail/${user.id}`}>
																<ExternalLink className='size-4' />
															</Link>
														</Button>
														<Button variant='outline' size='sm' asChild>
															<Link href={`/admin/users/${user.id}/notifications`}>
																<BellRing className='size-4' />
															</Link>
														</Button>
														<Button
															variant='outline'
															size='sm'
															disabled={!canMutateTarget}
															onClick={() => setEditUserId(user.id)}>
															<Pencil className='size-4' />
														</Button>
														<Button
															variant='destructive'
															size='sm'
															disabled={!canMutateTarget}
															onClick={() => setDeleteTarget(user)}>
															<Trash2 className='size-4' />
														</Button>
													</div>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
							<div className='flex items-center justify-between gap-3 pt-2'>
								<div className='text-xs text-muted-foreground'>
									{t('admin_pagination_summary', {
										page: usersQuery.data?.page_num ?? pageNum,
										totalPages: usersQuery.data?.total_pages ?? 1,
										total: usersQuery.data?.total_elements ?? users.length,
									})}
								</div>
								<div className='flex gap-2'>
									<Button
										variant='outline'
										onClick={() => setPageNum((current) => current - 1)}
										disabled={pageNum <= 1}>
										{t('previous_page')}
									</Button>
									<Button
										variant='outline'
										onClick={() => setPageNum((current) => current + 1)}
										disabled={
											pageNum >= (usersQuery.data?.total_pages ?? 1)
										}>
										{t('next_page')}
									</Button>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<UserFormDialog
				open={createOpen}
				onOpenChange={(open) => {
					if (!open) {
						setCreateOpen(false);
						setCreateForm((current) => resetFormAvatar({ ...DEFAULT_FORM_STATE, avatarPreviewUrl: current.avatarPreviewUrl }));
						return;
					}
					setCreateOpen(true);
				}}
				title={t('admin_users_create_title')}
				description={t('admin_users_create_description')}
				form={createForm}
				onFormChange={(patch) =>
					setCreateForm((current) => ({ ...current, ...patch }))
				}
				onAvatarSelect={(file) =>
					setCreateForm((current) => updateFormAvatar(current, file))
				}
				onAvatarReset={() =>
					setCreateForm((current) => resetFormAvatar(current))
				}
				onSubmit={() => setPendingUserAction('create')}
				isPending={createMutation.isPending || updateMutation.isPending || isAvatarSubmitting}
				submitLabel={t('create')}
				canManagePrivilegedRoles={canManagePrivilegedRoles}
				previewOwnerId={null}
			/>

			<UserFormDialog
				open={editUserId != null}
				onOpenChange={(open) => {
					if (!open) {
						setEditForm((current) => resetFormAvatar(current));
						setEditUserId(null);
					}
				}}
				title={t('admin_users_edit_title')}
				description={t('admin_users_edit_description')}
				form={editForm}
				onFormChange={(patch) =>
					setEditForm((current) => ({ ...current, ...patch }))
				}
				onAvatarSelect={(file) =>
					setEditForm((current) => updateFormAvatar(current, file))
				}
				onAvatarReset={() =>
					setEditForm((current) => resetFormAvatar(current))
				}
				onSubmit={() => setPendingUserAction('update')}
				isPending={createMutation.isPending || updateMutation.isPending || isAvatarSubmitting}
				submitLabel={t('save')}
				isEdit
				canManagePrivilegedRoles={canManagePrivilegedRoles}
				previewOwnerId={editUserId}
			/>

			<Dialog open={viewUserId != null} onOpenChange={(open) => !open && setViewUserId(null)}>
				<DialogContent className='max-w-2xl rounded-[28px]'>
					<DialogHeader>
						<DialogTitle>{t('admin_users_view_title')}</DialogTitle>
						<DialogDescription>{t('admin_users_view_description')}</DialogDescription>
					</DialogHeader>
					{viewUserQuery.isLoading || !viewUserQuery.data ? (
						<Skeleton className='h-56 rounded-[24px]' />
					) : (
						<div className='space-y-4'>
							<div className='grid gap-4 sm:grid-cols-2'>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4 sm:col-span-2'>
								<div className='flex items-center gap-4'>
									<Avatar className='size-16 border border-border/60'>
										<AvatarImage
											src={replacePath(
												viewUserQuery.data.avatar,
												viewUserQuery.data.id,
											)}
											alt={viewUserQuery.data.nickname}
										/>
										<AvatarFallback>
											{viewUserQuery.data.nickname.slice(0, 1)}
										</AvatarFallback>
									</Avatar>
									<div>
										<div className='text-lg font-semibold'>
											{viewUserQuery.data.nickname}
										</div>
										<div className='text-sm text-muted-foreground'>
											{viewUserQuery.data.email || '-'}
										</div>
										<div className='mt-2'>
											<Badge
												className={cn(
													'rounded-full border',
													getRoleMeta(viewUserQuery.data.role, t).className,
												)}>
												{getRoleMeta(viewUserQuery.data.role, t).label}
											</Badge>
										</div>
									</div>
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
								<div className='text-xs text-muted-foreground'>UUID</div>
								<div className='mt-2 break-all text-sm font-medium'>
									{viewUserQuery.data.uuid}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
								<div className='text-xs text-muted-foreground'>
									{t('admin_users_status_label')}
								</div>
								<div className='mt-2 text-sm font-medium'>
									{viewUserQuery.data.is_forbidden
										? t('admin_users_status_forbidden')
										: t('admin_users_status_active')}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
								<div className='text-xs text-muted-foreground'>
									{t('user_fans')}
								</div>
								<div className='mt-2 text-sm font-medium'>
									{viewUserQuery.data.fans}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4'>
								<div className='text-xs text-muted-foreground'>
									{t('user_follows')}
								</div>
								<div className='mt-2 text-sm font-medium'>
									{viewUserQuery.data.follows}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4 sm:col-span-2'>
								<div className='text-xs text-muted-foreground'>
									{t('account_slogan')}
								</div>
								<div className='mt-2 text-sm leading-6'>
									{viewUserQuery.data.slogan || t('user_no_slogan')}
								</div>
							</div>
							<div className='rounded-[22px] border border-border/60 bg-background/60 p-4 sm:col-span-2'>
								<div className='text-xs text-muted-foreground'>
									{t('account_compute_points_remaining')}
								</div>
								<div className='mt-2 text-2xl font-semibold'>
									{viewUserComputeInfoQuery.isLoading
										? '--'
										: (viewUserComputeInfoQuery.data?.available_points ?? 0).toLocaleString()}
								</div>
							</div>
							</div>
							<div className='space-y-2'>
								<div className='text-sm font-medium'>
									{t('account_compute_ledger_title')}
								</div>
								<AdminUserComputeLedgerTable userId={viewUserQuery.data.id} />
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant='outline' asChild>
							<Link href={`/admin/users/${viewUserId ?? viewUserQuery.data?.id ?? ''}/notifications`}>
								<BellRing className='size-4' />
								{t('admin_manage_notifications')}
							</Link>
						</Button>
						<Button variant='outline' asChild>
							<Link href={`/user/detail/${viewUserId ?? viewUserQuery.data?.id ?? ''}`}>
								<ExternalLink className='size-4' />
								{t('admin_open_detail_page')}
							</Link>
						</Button>
						<Button variant='outline' onClick={() => setViewUserId(null)}>
							{t('done')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={pendingUserAction != null}
				onOpenChange={(open) => {
					if (!open) {
						setPendingUserAction(null);
					}
				}}>
				<AlertDialogContent className='rounded-[28px]'>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pendingUserAction === 'create'
								? t('admin_users_create_confirm_title')
								: t('admin_users_update_confirm_title')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pendingUserAction === 'create'
								? t('admin_users_create_confirm_description', {
										name: createForm.nickname || '-',
									})
								: t('admin_users_update_confirm_description', {
										name: editForm.nickname || '-',
									})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								setPendingUserAction(null);
								if (pendingUserAction === 'create') {
									await handleCreateSubmit();
									return;
								}
								await handleUpdateSubmit();
							}}>
							{createMutation.isPending || updateMutation.isPending || isAvatarSubmitting ? (
								<Loader2 className='size-4 animate-spin' />
							) : null}
							{t('confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={deleteTarget != null}
				onOpenChange={(open) => {
					if (!open) {
						setDeleteTarget(null);
					}
				}}>
				<AlertDialogContent className='rounded-[28px]'>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('admin_users_delete_title')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('admin_users_delete_description', {
								name: deleteTarget?.nickname ?? '',
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() =>
								deleteTarget && deleteMutation.mutate(deleteTarget.id)
							}
							className='bg-destructive text-white hover:bg-destructive/90'>
							{deleteMutation.isPending ? (
								<Loader2 className='size-4 animate-spin' />
							) : null}
							{t('delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default AdminUsersPage;
