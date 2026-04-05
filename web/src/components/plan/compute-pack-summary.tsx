'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getUserInfoForPaySystem } from '@/service/user';
import { useUserContext } from '@/provider/user-provider';

const ComputePackSummary = () => {
	const t = useTranslations();
	const { paySystemUserInfo } = useUserContext();
	const { data } = useQuery({
		queryKey: ['paySystemUserInfo'],
		queryFn: getUserInfoForPaySystem,
		initialData: paySystemUserInfo,
		refetchOnMount: 'always',
	});
	const availablePoints = data?.computeBalance?.available_points ?? 0;
	const giftedPoints = data?.computeBalance?.gifted_points ?? 0;
	const purchasedPoints = data?.computeBalance?.purchased_points ?? 0;
	const consumedPoints = data?.computeBalance?.consumed_points ?? 0;

	return (
		<div className='rounded-2xl border border-border/70 bg-muted/30 px-4 py-4 text-sm text-muted-foreground'>
			<div className='flex flex-col gap-1'>
				<p className='text-xs uppercase tracking-[0.18em] text-muted-foreground/80'>
					{t('account_plan_compute_pack_balance')}
				</p>
				<p className='text-2xl font-semibold leading-none text-foreground'>
					{availablePoints.toLocaleString()}
				</p>
			</div>
			<div className='mt-4 grid grid-cols-1 gap-2 text-sm leading-6 md:grid-cols-3'>
				<p>
					{t('account_plan_compute_pack_gifted')}
					<span className='ml-2 font-semibold text-foreground'>
						{giftedPoints.toLocaleString()}
					</span>
				</p>
				<p>
					{t('account_plan_compute_pack_purchased')}
					<span className='ml-2 font-semibold text-foreground'>
						{purchasedPoints.toLocaleString()}
					</span>
				</p>
				<p>
					{t('account_plan_compute_pack_consumed')}
					<span className='ml-2 font-semibold text-foreground'>
						{consumedPoints.toLocaleString()}
					</span>
				</p>
			</div>
			<p className='mt-4 text-xs leading-5 text-muted-foreground'>
				{t('account_plan_compute_pack_multiplier_hint')}
			</p>
		</div>
	);
};

export default ComputePackSummary;
