import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
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
	const avatarSrc =
		user.avatar && user.avatar.length > 0
			? replacePath(user.avatar, user.id)
			: undefined;

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

			queryClient.invalidateQueries({
				queryKey: ['getUserFollows', mainUserInfo?.id],
			});
			queryClient.invalidateQueries({
				queryKey: ['getUserFans', mainUserInfo?.id],
			});
			queryClient.invalidateQueries({
				queryKey: ['userInfo', user.id],
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
					<Avatar className='size-12'>
						<AvatarImage
							src={avatarSrc}
							alt='avatar'
							className='object-cover'
						/>
						<AvatarFallback className='font-semibold'>
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
			<AlertDialog onOpenChange={setShowCancelDialog} open={showCancelDialog}>
				<AlertDialogTrigger asChild>
					<Button variant={'outline'} className='shadow-none'>
						{t('user_cancel_follow')}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent className='rounded-[28px] sm:max-w-md'>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('tip')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('user_cancel_follow_confirm_alert')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							className='bg-destructive text-white hover:bg-destructive/90'
							onClick={handleCancelFollow}
							disabled={cancelFollowMutation.isPending}>
							{t('confirm')}
							{cancelFollowMutation.isPending && (
								<Loader2 className='animate-spin' />
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Card>
	);
};

export default UserFollowCard;
