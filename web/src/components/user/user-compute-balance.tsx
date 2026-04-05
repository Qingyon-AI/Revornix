'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useUserContext } from '@/provider/user-provider';

const UserComputeBalance = () => {
	const t = useTranslations();
	const { paySystemUserInfo } = useUserContext();
	const availablePoints =
		paySystemUserInfo?.computeBalance?.available_points ?? 0;

	return (
		<div className='flex items-center justify-between'>
			<div className='flex flex-row items-center gap-2'>
				<span className='text-xs font-medium text-muted-foreground'>
					{t('account_compute_points_remaining')}
				</span>
				<span className='font-semibold leading-none text-lg'>
					{availablePoints.toLocaleString()}
				</span>
			</div>
			<Link href={'/account/plan#compute-pack'}>
				<Button size='sm' variant={'link'} className='text-xs'>
					{t('account_plan_buy_compute_pack')}
				</Button>
			</Link>
		</div>
	);
};

export default UserComputeBalance;
