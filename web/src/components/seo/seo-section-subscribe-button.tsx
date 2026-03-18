'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { BellOffIcon, BellPlusIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/provider/user-provider';
import { getSectionDetail, subscribeSection } from '@/service/section';
import { cn } from '@/lib/utils';
import type { SectionInfo } from '@/generated';

type SeoSectionSubscribeButtonProps = {
	sectionId: number;
	creatorId?: number | null;
	initialIsSubscribed?: boolean | null;
	className?: string;
};

const SeoSectionSubscribeButton = ({
	sectionId,
	creatorId,
	initialIsSubscribed,
	className,
}: SeoSectionSubscribeButtonProps) => {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { mainUserInfo } = useUserContext();
	const [isSubscribed, setIsSubscribed] = useState(!!initialIsSubscribed);

	const queryKey = ['getSectionDetail', sectionId] as const;
	const relationQuery = useQuery({
		queryKey,
		queryFn: async () => {
			return getSectionDetail({ section_id: sectionId });
		},
		enabled: !!mainUserInfo,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		setIsSubscribed(!!initialIsSubscribed);
	}, [initialIsSubscribed, sectionId]);

	useEffect(() => {
		if (!relationQuery.data) {
			return;
		}
		setIsSubscribed(!!relationQuery.data.is_subscribed);
	}, [relationQuery.data]);

	const mutateSubscribe = useMutation({
		mutationFn: async (nextStatus: boolean) => {
			return subscribeSection({
				section_id: sectionId,
				status: nextStatus,
			});
		},
		onMutate: async (nextStatus) => {
			const previousSection =
				queryClient.getQueryData<SectionInfo>(queryKey);

			setIsSubscribed(nextStatus);
			queryClient.setQueryData<SectionInfo>(queryKey, (old) => {
				if (!old) {
					return old;
				}
				return {
					...old,
					is_subscribed: nextStatus,
				};
			});

			return { previousSection };
		},
		onError: (error, _nextStatus, context) => {
			if (context?.previousSection) {
				queryClient.setQueryData(queryKey, context.previousSection);
				setIsSubscribed(!!context.previousSection.is_subscribed);
			} else {
				setIsSubscribed(!!initialIsSubscribed);
			}
			toast.error(error.message);
		},
		onSuccess: (_data, nextStatus) => {
			toast.success(
				nextStatus
					? t('section_subscribe_success')
					: t('section_unsubscribe_success'),
			);
			queryClient.invalidateQueries({
				queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: ['getSectionSubscriber', sectionId],
			});
			queryClient.invalidateQueries({
				predicate(query) {
					return query.queryKey.includes('searchMySubscribedSection');
				},
			});
		},
	});

	const isOwner = mainUserInfo?.id === creatorId;
	if (isOwner) {
		return null;
	}

	const handleLoginRedirect = () => {
		const currentSearch = searchParams.toString();
		const redirectTo = currentSearch ? `${pathname}?${currentSearch}` : pathname;
		router.push(`/login?redirect_to=${encodeURIComponent(redirectTo)}`);
	};

	const relationPending =
		!!mainUserInfo &&
		relationQuery.isPending &&
		relationQuery.data === undefined;

	return (
		<Button
			type='button'
			variant={isSubscribed ? 'outline' : 'default'}
			className={cn(
				'rounded-2xl px-4 shadow-sm',
				isSubscribed ? 'bg-background/80' : '',
				className,
			)}
			disabled={mutateSubscribe.isPending || relationPending}
			onClick={() => {
				if (!mainUserInfo) {
					handleLoginRedirect();
					return;
				}
				mutateSubscribe.mutate(!isSubscribed);
			}}>
			{isSubscribed ? <BellOffIcon className='size-4' /> : <BellPlusIcon className='size-4' />}
			{isSubscribed ? t('section_unsubscribe') : t('section_subscribe')}
			{(mutateSubscribe.isPending || relationPending) && (
				<Loader2 className='size-4 animate-spin' />
			)}
		</Button>
	);
};

export default SeoSectionSubscribeButton;
