'use client';

import Link from 'next/link';
import { StarIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getPlanLevelTranslationKey } from '@/lib/subscription';

type SubscriptionPlanBadgeContentProps = {
	requiredPlanLevel?: number | null;
	actionLabel?: string;
	actionHref?: string;
};

const SubscriptionPlanBadgeContent = ({
	requiredPlanLevel,
	actionLabel,
	actionHref,
}: SubscriptionPlanBadgeContentProps) => {
	const t = useTranslations();

	return (
		<>
			<StarIcon className='size-3 fill-current' strokeWidth={1.8} />
			<span>{t('setting_subscription_limited_badge')}</span>
			<span className='opacity-70'>·</span>
			<span>{t(getPlanLevelTranslationKey(requiredPlanLevel))}</span>
			{actionLabel && actionHref && (
				<>
					<span className='opacity-70'>·</span>
					<Link
						href={actionHref}
						className='underline underline-offset-4 transition-colors hover:opacity-80'>
						{actionLabel}
					</Link>
				</>
			)}
		</>
	);
};

export default SubscriptionPlanBadgeContent;
