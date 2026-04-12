import { UserPublicInfo } from '@/generated';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { replacePath } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const UserFanCard = ({ user }: { user: UserPublicInfo }) => {
	const t = useTranslations();
	const avatarSrc =
		user.avatar && user.avatar.length > 0
			? replacePath(user.avatar, user.id)
			: undefined;

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
		</Card>
	);
};

export default UserFanCard;
