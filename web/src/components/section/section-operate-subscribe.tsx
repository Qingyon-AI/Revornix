'use client';

import { getSectionDetail, subscribeSection } from '@/service/section';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useState } from 'react';
import { utils } from '@kinda/utils';
import { BellOffIcon, BellPlusIcon, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';

const SectionOperateSubscribe = ({
	section_id,
	className,
	onTriggerClick,
	iconOnly = false,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
	iconOnly?: boolean;
}) => {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { mainUserInfo } = useUserContext();
	const id = section_id;

	const [subscribing, setSubscribing] = useState(false);

	const queryClient = getQueryClient();

	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});
	const handleLoginRedirect = () => {
		const currentSearch = searchParams.toString();
		const redirectTo = currentSearch ? `${pathname}?${currentSearch}` : pathname;
		router.push(`/login?redirect_to=${encodeURIComponent(redirectTo)}`);
	};

	const handleUpdateSubscribeStatue = async () => {
		if (!section) return;
		if (!mainUserInfo) {
			handleLoginRedirect();
			return;
		}
		setSubscribing(true);
		const [res, err] = await utils.to(
			subscribeSection({
				section_id: id,
				status: section?.is_subscribed ? false : true,
			})
		);
		if (err) {
			toast.error(err.message);
			setSubscribing(false);
			return;
		}
		if (section.is_subscribed) {
			toast.success(t('section_unsubscribe_success'));
		} else {
			toast.success(t('section_subscribe_success'));
		}
		section.is_subscribed = !section.is_subscribed;
		setSubscribing(false);
		queryClient.invalidateQueries({
			queryKey: ['getSectionDetail', id],
		});
		queryClient.invalidateQueries({
			queryKey: ['getSectionSubscriber', id],
		});
		queryClient.invalidateQueries({
			predicate(query) {
				return query.queryKey.includes('searchMySubscribedSection');
			},
		});
	};

	return (
		<Button
			title={section?.is_subscribed ? t('section_unsubscribe') : mainUserInfo ? t('section_subscribe') : t('seo_nav_login_in')}
			className={cn('text-xs', className)}
			variant={'ghost'}
			disabled={subscribing}
			onClick={() => {
				handleUpdateSubscribeStatue();
				onTriggerClick?.();
			}}>
			{section?.is_subscribed ? (
				<>
					<BellOffIcon />
					{iconOnly ? <span className='sr-only'>{t('section_unsubscribe')}</span> : t('section_unsubscribe')}
				</>
			) : (
				<>
					<BellPlusIcon />
					{iconOnly ? <span className='sr-only'>{mainUserInfo ? t('section_subscribe') : t('seo_nav_login_in')}</span> : mainUserInfo ? t('section_subscribe') : t('seo_nav_login_in')}
				</>
			)}
			{subscribing && <Loader2 className='animate-spin' />}
		</Button>
	);
};
export default SectionOperateSubscribe;
