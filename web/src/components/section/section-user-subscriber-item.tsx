import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useRouter } from 'nextjs-toploader/app';
import {
	InifiniteScrollPagnitionSectionUserPublicInfo,
	SectionUserPublicInfo,
} from '@/generated';
import { InfiniteData, useMutation } from '@tanstack/react-query';
import { deleteSectionUser } from '@/service/section';
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
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { filterInfiniteQueryElements } from '@/lib/infinite-query-cache';

const SectionSubscriberItem = ({
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

	const mutateDeleteSectionUser = useMutation({
		mutationFn: deleteSectionUser,
		onMutate() {
			const previousSubscribers = queryClient.getQueriesData<
				InfiniteData<InifiniteScrollPagnitionSectionUserPublicInfo>
			>({
				queryKey: ['getSectionSubscriber', section_id],
			});

			filterInfiniteQueryElements<
				InifiniteScrollPagnitionSectionUserPublicInfo,
				SectionUserPublicInfo
			>(queryClient, ['getSectionSubscriber', section_id], (item) => {
				return item.id !== user.id;
			});

			return { previousSubscribers };
		},
		onError(error, variables, context) {
			console.error(error, variables, context);
			toast.error(error.message);
			context?.previousSubscribers?.forEach(([queryKey, snapshot]) => {
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
							{t('section_subscribers_delete_description')}
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
	);
};
export default SectionSubscriberItem;
