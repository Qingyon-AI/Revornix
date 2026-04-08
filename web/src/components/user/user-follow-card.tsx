import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { followUser } from '@/service/user';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Loader2 } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { replacePath } from '@/lib/utils';
import {
	InifiniteScrollPagnitionUserPublicInfo,
	UserPublicInfo,
} from '@/generated';
import {
	filterInfiniteQueryElements,
	mapInfiniteQueryElements,
} from '@/lib/infinite-query-cache';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';

const UserFollowCard = ({ user }: { user: UserPublicInfo }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const [showCancelDialog, setShowCancelDialog] = useState(false);

	const cancelFollowMutation = useMutation({
		mutationFn: () => followUser({ to_user_id: user.id, status: false }),
		onError(error) {
			toast.error(error.message);
		},
		onSuccess() {
			filterInfiniteQueryElements<
				InifiniteScrollPagnitionUserPublicInfo,
				UserPublicInfo
			>(
				queryClient,
				['getUserFollows', mainUserInfo?.id],
				(item) => item.id !== user.id,
			);

			mapInfiniteQueryElements<
				InifiniteScrollPagnitionUserPublicInfo,
				UserPublicInfo
			>(queryClient, ['getUserFans', mainUserInfo?.id], (item) => {
				if (item.id !== user.id) return item;
				return {
					...item,
					is_followed: false,
				};
			});

			refreshMainUserInfo();
			setShowCancelDialog(false);
		},
	});

	const handleCancelFollow = () => {
		cancelFollowMutation.mutate();
	};
	return (
		<Card key={user.id} className='px-5 gap-2'>
			<Link href={`/user/detail/${user.id}`}>
				<div className='flex flex-row items-center gap-2 mb-2'>
					<Avatar>
						<AvatarImage
							src={replacePath(user.avatar, user.id)}
							alt='avatar'
							className='size-12 object-cover'
						/>
						<AvatarFallback className='size-12 font-semibold'>
							{user.nickname.slice(0, 1) ?? '?'}
						</AvatarFallback>
					</Avatar>
					<div className='flex flex-col gap-1'>
						<p className='font-bold'>{user.nickname}</p>
						<p className='text-muted-foreground text-sm'>
							{user.slogan ? user.slogan : t('user_slogan_empty')}
						</p>
					</div>
				</div>
			</Link>
			<div className='flex flex-row items-center gap-5'>
				<p className='flex-1 bg-muted py-1 rounded flex justify-center items-center'>
					<span className='text-muted-foreground text-xs'>
						{t('user_fans')}
					</span>
					<span className='font-bold ml-1'>{user.fans}</span>
				</p>
				<p className='flex-1 bg-muted py-1 rounded flex justify-center items-center'>
					<span className='text-muted-foreground text-xs'>
						{t('user_follows')}
					</span>
					<span className='font-bold ml-1'>{user.follows}</span>
				</p>
			</div>
			<Dialog onOpenChange={setShowCancelDialog} open={showCancelDialog}>
				<DialogTrigger asChild>
					<Button variant={'outline'} className='shadow-none'>
						{t('user_cancel_follow')}
					</Button>
				</DialogTrigger>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-md'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>{t('tip')}</DialogTitle>
						<DialogDescription>
							{t('user_cancel_follow_confirm_alert')}
						</DialogDescription>
					</DialogHeader>
					<div className='min-h-0 flex-1 px-6 py-5' />
					<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
						<DialogClose asChild>
							<Button variant={'secondary'}>{t('cancel')}</Button>
						</DialogClose>
						<Button
							variant={'destructive'}
							onClick={handleCancelFollow}
							disabled={cancelFollowMutation.isPending}>
							{t('confirm')}
							{cancelFollowMutation.isPending && (
								<Loader2 className='animate-spin' />
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
};

export default UserFollowCard;
