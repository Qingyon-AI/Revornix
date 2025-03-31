import { UserPublicInfo } from '@/generated';
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
import { utils } from '@kinda/utils';
import { followUser } from '@/service/user';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Loader2 } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import Link from 'next/link';

const UserFollowCard = ({ user }: { user: UserPublicInfo }) => {
	const queryClient = getQueryClient();
	const { refreshUserInfo } = useUserContext();
	const [cancelinig, setCanceling] = useState(false);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const handleCancelFollow = async () => {
		setCanceling(true);
		const [res, err] = await utils.to(
			followUser({ to_user_id: user.id, status: false })
		);
		if (err) {
			toast.error(`操作失败，${err.message}`);
			setCanceling(false);
			return;
		}
		queryClient.invalidateQueries({
			predicate(query) {
				return (
					query.queryKey.includes('getUserFollows') ||
					query.queryKey.includes('getUserFans') ||
					query.queryKey.includes('userInfo')
				);
			},
		});
		refreshUserInfo();
		setShowCancelDialog(false);
		setCanceling(false);
	};
	return (
		<Card key={user.id} className='px-5 gap-2'>
			<Link href={`/user/detail/${user.id}`}>
				<div className='flex flex-row items-center gap-2 mb-2'>
					<img
						className='rounded w-12 h-12 object-cover'
						src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${user.avatar?.name}`}
						alt=''
					/>
					<div className='flex flex-col gap-1'>
						<p className='font-bold'>{user.nickname}</p>
						<p className='text-muted-foreground text-sm'>
							{user.slogan ? user.slogan : '暂无签名'}
						</p>
					</div>
				</div>
			</Link>
			<div className='flex flex-row items-center gap-5'>
				<p className='flex-1 bg-muted py-1 rounded flex justify-center items-center'>
					<span className='text-muted-foreground text-xs'>粉丝</span>
					<span className='font-bold ml-1'>{user.fans}</span>
				</p>
				<p className='flex-1 bg-muted py-1 rounded flex justify-center items-center'>
					<span className='text-muted-foreground text-xs'>关注</span>
					<span className='font-bold ml-1'>{user.follows}</span>
				</p>
			</div>
			<Dialog onOpenChange={setShowCancelDialog} open={showCancelDialog}>
				<DialogTrigger asChild>
					<Button variant={'outline'} className='shadow-none'>
						取消关注
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>提醒</DialogTitle>
						<DialogDescription>
							确认取消关注吗？一旦取消关注的话，对方的新专栏的更新将无法通知到你噢。
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant={'secondary'}>取消</Button>
						</DialogClose>
						<Button
							variant={'destructive'}
							onClick={handleCancelFollow}
							disabled={cancelinig}>
							确认
							{cancelinig && <Loader2 className='animate-spin' />}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</Card>
	);
};

export default UserFollowCard;
