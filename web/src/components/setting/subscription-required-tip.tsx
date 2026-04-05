'use client';

import { useTranslations } from 'next-intl';
import type { UserResponseDTO } from '@/generated-pay';
import { cn } from '@/lib/utils';
import SubscriptionActionLinks from './subscription-action-links';

type SubscriptionRequiredTipProps = {
	visible: boolean;
	paySystemUserInfo?: UserResponseDTO;
	requiredPlanLevel?: number | null;
	className?: string;
};

const SubscriptionRequiredTip = ({
	visible,
	className,
}: SubscriptionRequiredTipProps) => {
	const t = useTranslations();

	if (!visible) {
		return null;
	}

	return (
		<p className={cn('text-xs text-muted-foreground leading-5', className)}>
			{t('setting_subscription_required_hint')}{' '}
			<SubscriptionActionLinks />
			<span className='ml-1'>{t('setting_subscription_required_hint_compute_fallback')}</span>
		</p>
	);
};

export default SubscriptionRequiredTip;
