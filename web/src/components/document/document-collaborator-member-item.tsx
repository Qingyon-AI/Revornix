'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, XCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { toast } from 'sonner';

import { UserDocumentAuthority } from '@/enums/document';
import { getQueryClient } from '@/lib/get-query-client';
import {
	deleteDocumentUser,
	DocumentCollaboratorPublicInfo,
	modifyDocumentUser,
} from '@/service/document';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';

const DocumentCollaboratorMemberItem = ({
	user,
	document_id,
}: {
	user: DocumentCollaboratorPublicInfo;
	document_id: number;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const invalidateCollaborators = () => {
		queryClient.invalidateQueries({
			predicate(query) {
				return (
					query.queryKey[0] === 'getDocumentCollaborators' &&
					query.queryKey[1] === document_id
				);
			},
		});
		queryClient.invalidateQueries({
			queryKey: ['getDocumentDetail', document_id],
		});
	};

	const mutateModifyDocumentUser = useMutation({
		mutationFn: modifyDocumentUser,
		onSuccess() {
			toast.success(t('document_collaborator_update_success'));
			invalidateCollaborators();
		},
		onError(error) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const mutateDeleteDocumentUser = useMutation({
		mutationFn: deleteDocumentUser,
		onSuccess() {
			toast.success(t('document_collaborator_remove_success'));
			setShowDeleteDialog(false);
			invalidateCollaborators();
		},
		onError(error) {
			console.error(error);
			toast.error(error.message);
		},
	});

	return (
		<div className='flex items-center justify-between gap-3'>
			<div className='flex min-w-0 flex-row items-center gap-2'>
				<Avatar
					className='size-6'
					title={user.nickname ?? ''}
					onClick={(e) => {
						router.push(`/user/detail/${user.id}`);
						e.preventDefault();
						e.stopPropagation();
					}}>
					<AvatarImage src={user.avatar} alt='avatar' />
					<AvatarFallback className='font-semibold'>
						{user.nickname.slice(0, 1) ?? '?'}
					</AvatarFallback>
				</Avatar>
				<p className='truncate text-sm'>{user.nickname}</p>
			</div>
			<div className='flex flex-row items-center gap-2'>
				<Select
					value={String(user.authority ?? UserDocumentAuthority.READ_ONLY)}
					onValueChange={(value) => {
						mutateModifyDocumentUser.mutate({
							document_id,
							user_id: user.id,
							authority: Number(value) as 0 | 1 | 2,
						});
					}}>
					<SelectTrigger
						className='h-8 w-[144px] shrink-0 px-2 text-xs'
						size='sm'>
						<SelectValue placeholder={t('document_collaborator_authority')} />
					</SelectTrigger>
					<SelectContent className='text-xs'>
						<SelectGroup>
							<SelectItem value='0'>
								{t('document_collaborator_authority_full_access')}
							</SelectItem>
							<SelectItem value='1'>
								{t('document_collaborator_authority_w_and_r')}
							</SelectItem>
							<SelectItem value='2'>
								{t('document_collaborator_authority_r_only')}
							</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
				<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<AlertDialogTrigger asChild>
						<Button size='icon' variant='secondary'>
							<XCircleIcon />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent className='rounded-[28px] sm:max-w-md'>
						<AlertDialogHeader>
							<AlertDialogTitle>{t('warning')}</AlertDialogTitle>
							<AlertDialogDescription>
								{t('document_collaborator_remove_description')}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
							<AlertDialogAction
								className='bg-destructive text-white hover:bg-destructive/90'
								onClick={() =>
									mutateDeleteDocumentUser.mutate({
										document_id,
										user_id: user.id,
									})
								}
								disabled={mutateDeleteDocumentUser.isPending}>
								{t('confirm')}
								{mutateDeleteDocumentUser.isPending ? (
									<Loader2 className='animate-spin' />
								) : null}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
};

export default DocumentCollaboratorMemberItem;
