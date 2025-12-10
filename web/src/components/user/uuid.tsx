'use client';

import { useUserContext } from '@/provider/user-provider';
import { Skeleton } from '../ui/skeleton';

const UserUUID = () => {
	const { mainUserInfo } = useUserContext();
	return (
		<>
			{mainUserInfo?.uuid ? (
				<p className='text-center text-muted-foreground text-xs'>
					uuid: {mainUserInfo?.uuid}
				</p>
			) : (
				<Skeleton className='w-full h-4' />
			)}
		</>
	);
};

export default UserUUID;
