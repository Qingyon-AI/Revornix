'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { UserResponseDTO } from '@/generated-pay';
import { cn } from '@/lib/utils';
import { getSubscriptionCtaTranslationKey } from '@/lib/subscription';

type SubscriptionRequiredTipProps = {
	visible: boolean;
	paySystemUserInfo?: UserResponseDTO;
	requiredPlanLevel?: number | null;
	className?: string;
};

const SubscriptionRequiredTip = ({
	visible,
	paySystemUserInfo,
	requiredPlanLevel,
	className,
}: SubscriptionRequiredTipProps) => {
	const t = useTranslations();

	if (!visible) {
		return null;
	}

	return (
		<p className={cn('text-xs text-muted-foreground leading-5', className)}>
			{t('setting_subscription_required_hint')}{' '}
			<Link
				href='/account/plan'
				className='text-primary underline underline-offset-4'>
				{t(
					getSubscriptionCtaTranslationKey(
						paySystemUserInfo,
						requiredPlanLevel,
					),
				)}
			</Link>
		</p>
	);
};

export default SubscriptionRequiredTip;
