'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

type SubscriptionActionLinksProps = {
	compact?: boolean;
	className?: string;
};

const SubscriptionActionLinks = ({
	compact = false,
	className,
}: SubscriptionActionLinksProps) => {
	const t = useTranslations();

	return (
		<span
			className={cn(
				'inline-flex flex-wrap items-center gap-x-3 gap-y-1',
				className,
			)}>
			<Link
				href='/account/plan'
				className={cn(
					'underline underline-offset-4 transition-colors hover:opacity-80',
					compact ? 'text-current' : 'text-primary',
				)}>
				{t('subscription_action_upgrade')}
			</Link>
			<Link
				href='/account/plan#compute-pack'
				className={cn(
					'underline underline-offset-4 transition-colors hover:opacity-80',
					compact ? 'text-current' : 'text-primary',
				)}>
				{t('subscription_action_compute_pack')}
			</Link>
		</span>
	);
};

export default SubscriptionActionLinks;
