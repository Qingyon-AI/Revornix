'use client';

import { StarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getPlanLevelTranslationKey } from '@/lib/subscription';
import SubscriptionActionLinks from './subscription-action-links';

type SubscriptionPlanBadgeContentProps = {
	requiredPlanLevel?: number | null;
	showActions?: boolean;
};

const SubscriptionPlanBadgeContent = ({
	requiredPlanLevel,
	showActions,
}: SubscriptionPlanBadgeContentProps) => {
	const t = useTranslations();

	return (
		<>
			<StarIcon className='size-3 fill-current' strokeWidth={1.8} />
			<span>{t('setting_subscription_limited_badge')}</span>
			<span className='opacity-70'>·</span>
			<span>{t(getPlanLevelTranslationKey(requiredPlanLevel))}</span>
			{showActions && (
				<>
					<span className='opacity-70'>·</span>
					<SubscriptionActionLinks compact />
				</>
			)}
		</>
	);
};

export default SubscriptionPlanBadgeContent;
