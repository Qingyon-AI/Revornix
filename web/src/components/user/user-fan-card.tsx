import { UserPublicInfo } from '@/generated';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

const UserFanCard = ({ user }: { user: UserPublicInfo }) => {
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
		</Card>
	);
};

export default UserFanCard;
