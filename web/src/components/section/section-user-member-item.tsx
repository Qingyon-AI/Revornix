import { UserSectionRole } from '@/enums/section';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import {
	InifiniteScrollPagnitionSectionUserPublicInfo,
	SectionUserPublicInfo,
} from '@/generated';
import { InfiniteData, useMutation } from '@tanstack/react-query';
import { deleteSectionUser, modifySectionUser } from '@/service/section';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Loader2, XCircleIcon } from 'lucide-react';
import { getQueryClient } from '@/lib/get-query-client';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useState } from 'react';
import {
	filterInfiniteQueryElements,
	mapInfiniteQueryElements,
} from '@/lib/infinite-query-cache';

const SectionMemberItem = ({
	user,
	section_id,
}: {
	user: SectionUserPublicInfo;
	section_id: number;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();

	const [showDeleteDialog, setShowDeleteDialog] = useState(false);

	const mutateModifySectionUser = useMutation({
		mutationFn: modifySectionUser,
		onMutate(variables) {
			const previousMembers = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionSectionUserPublicInfo>
			>({
				queryKey: ['getSectionMembers', section_id],
			});

			mapInfiniteQueryElements<
				InifiniteScrollPagnitionSectionUserPublicInfo,
				SectionUserPublicInfo
			>(queryClient, ['getSectionMembers', section_id], (item) => {
				if (item.id !== user.id) return item;
				return {
					...item,
					authority: variables.authority,
				};
			});

			return { previousMembers };
		},
		onError(error, variables, context) {
			console.error(error, variables, context);
			toast.error(error.message);
			context?.previousMembers?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
		},
	});

	const mutateDeleteSectionUser = useMutation({
		mutationFn: deleteSectionUser,
		onMutate() {
			const previousMembers = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionSectionUserPublicInfo>
			>({
				queryKey: ['getSectionMembers', section_id],
			});

			filterInfiniteQueryElements<
				InifiniteScrollPagnitionSectionUserPublicInfo,
				SectionUserPublicInfo
			>(queryClient, ['getSectionMembers', section_id], (item) => {
				return item.id !== user.id;
			});

			return { previousMembers };
		},
		onError(error, variables, context) {
			console.error(error, variables, context);
			toast.error(error.message);
			context?.previousMembers?.forEach(([queryKey, snapshot]) => {
				queryClient.setQueryData(queryKey, snapshot);
			});
		},
		onSuccess(data, variables, onMutateResult, context) {
			setShowDeleteDialog(false);
		},
	});

	const handleDeleteSectionUser = () => {
		mutateDeleteSectionUser.mutate({
			section_id: section_id,
			user_id: user.id,
		});
	};

	return (
		<div className='flex items-center justify-between'>
			<div className='flex flex-row gap-2 items-center'>
				<Avatar
					className='size-6'
					title={user?.nickname ?? ''}
					onClick={(e) => {
						router.push(`/user/detail/${user?.id}`);
						e.preventDefault();
						e.stopPropagation();
					}}>
					<AvatarImage src={user.avatar} alt='avatar' />
					<AvatarFallback className='font-semibold'>
						{user.nickname.slice(0, 1) ?? '?'}
					</AvatarFallback>
				</Avatar>
				<p>{user.nickname}</p>
			</div>
			<div className='flex flex-row gap-2 items-center'>
				<Select
					value={user.authority?.toString()}
					onValueChange={(e) => {
						mutateModifySectionUser.mutate({
							section_id: section_id,
							user_id: user.id,
							authority: Number(e) as 0 | 1 | 2,
							role: UserSectionRole.MEMBER,
						});
					}}>
					<SelectTrigger
						className='h-6 px-2 text-xs w-[140px] shrink-0'
						size={'sm'}>
						<SelectValue placeholder='Authority' />
					</SelectTrigger>
					<SelectContent className='text-xs'>
						<SelectGroup>
							<SelectItem value='0'>
								{t('section_share_user_authority_full_access')}
							</SelectItem>
							<SelectItem value='1'>
								{t('section_share_user_authority_w_and_r')}
							</SelectItem>
							<SelectItem value='2'>
								{t('section_share_user_authority_r_only')}
							</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
				<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
					<DialogTrigger asChild>
						<Button size={'icon'} variant={'secondary'}>
							<XCircleIcon />
						</Button>
					</DialogTrigger>
					<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-md'>
						<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
							<DialogTitle>{t('warning')}</DialogTitle>
							<DialogDescription>
								{t('section_participants_delete_description')}
							</DialogDescription>
						</DialogHeader>
						<div className='min-h-0 flex-1 px-6 py-5' />
						<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
							<Button
								variant='destructive'
								onClick={handleDeleteSectionUser}
								disabled={mutateDeleteSectionUser.isPending}>
								{t('confirm')}
								{mutateDeleteSectionUser.isPending && (
									<Loader2 className='animate-spin' />
								)}
							</Button>
							<DialogClose asChild>
								<Button variant='default'>{t('cancel')}</Button>
							</DialogClose>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
};
export default SectionMemberItem;
