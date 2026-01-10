'use client';

import { useUserContext } from '@/provider/user-provider';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Plan } from '@/enums/product';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const UserPlan = () => {
	const t = useTranslations();
	const { paySystemUserInfo } = useUserContext();

	return (
		<div className='flex flex-row items-center justify-end'>
			{paySystemUserInfo?.userPlan?.plan && (
				<Badge
					variant='outline'
					className={cn('flex items-center gap-1 rounded-full text-white', {
						'border-none bg-linear-to-r from-sky-500 to-indigo-600':
							paySystemUserInfo?.userPlan.plan.product?.uuid !== Plan.FREE,
					})}>
					{paySystemUserInfo.userPlan.plan.product?.uuid !== Plan.FREE && (
						<Sparkles className='size-3' />
					)}
					{paySystemUserInfo.userPlan.plan.product?.name}
					{new Date().getTime() >
						new Date(paySystemUserInfo.userPlan.expireTime).getTime() && (
						<span className='ml-1'>{t('account_plan_expired')}</span>
					)}
				</Badge>
			)}
			{paySystemUserInfo?.userPlan?.plan &&
				new Date().getTime() >
					new Date(paySystemUserInfo?.userPlan.expireTime).getTime() && (
					<Link href={'/account/plan'}>
						<Button className='text-xs' variant={'link'}>
							{t('account_plan_go_to_renew')}
						</Button>
					</Link>
				)}
			{((paySystemUserInfo?.userPlan?.plan &&
				paySystemUserInfo?.userPlan?.plan.product?.uuid === Plan.FREE) ||
				!paySystemUserInfo?.userPlan) && (
				<Link href={'/account/plan'}>
					<Button className='text-xs w-fit' variant={'link'}>
						{t('account_plan_go_to_subscribe')}
					</Button>
				</Link>
			)}
			{paySystemUserInfo?.userPlan?.plan &&
				paySystemUserInfo?.userPlan?.plan.product?.uuid === Plan.PRO && (
					<Link href={'/account/plan'}>
						<Button className='text-xs w-fit' variant={'link'}>
							{t('account_plan_go_to_upgrade')}
						</Button>
					</Link>
				)}
			{paySystemUserInfo?.userPlan?.plan &&
				paySystemUserInfo?.userPlan.plan.product?.uuid !== Plan.FREE && (
					<div className='mx-5'>
						{format(paySystemUserInfo?.userPlan.startTime, 'yyyy-MM-dd')}
						{' ~ '}
						{format(paySystemUserInfo?.userPlan.expireTime, 'yyyy-MM-dd')}
					</div>
				)}
		</div>
	);
};

export default UserPlan;
