'use client';

import { useUserContext } from '@/provider/user-provider';
import { Skeleton } from '../ui/skeleton';

const UserUUID = () => {
	const { userInfo } = useUserContext();
	return (
		<>
			{userInfo?.uuid ? (
				<p className='text-center text-muted-foreground text-xs'>
					uuid: {userInfo?.uuid}
				</p>
			) : (
				<Skeleton className='w-full h-[1rem]' />
			)}
		</>
	);
};

export default UserUUID;
