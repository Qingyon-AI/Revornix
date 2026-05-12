'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/provider/user-provider';
import { getUserInfo, followUser } from '@/service/user';
import { cn } from '@/lib/utils';
import type { UserPublicInfo } from '@/generated';

type SeoUserFollowButtonProps = {
	userId: number;
	initialIsFollowed?: boolean | null;
	className?: string;
};

const SeoUserFollowButton = ({
	userId,
	initialIsFollowed,
	className,
}: SeoUserFollowButtonProps) => {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const [isFollowed, setIsFollowed] = useState(!!initialIsFollowed);

	const queryKey = ['userInfo', userId] as const;
	const relationQuery = useQuery({
		queryKey,
		queryFn: async () => {
			return getUserInfo({ user_id: userId });
		},
		enabled: !!mainUserInfo,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		setIsFollowed(!!initialIsFollowed);
	}, [initialIsFollowed, userId]);

	useEffect(() => {
		if (!relationQuery.data) {
			return;
		}
		setIsFollowed(!!relationQuery.data.is_followed);
	}, [relationQuery.data]);

	const mutateFollow = useMutation({
		mutationFn: async (nextStatus: boolean) => {
			return followUser({
				to_user_id: userId,
				status: nextStatus,
			});
		},
		onMutate: async (nextStatus) => {
			const previousUser = queryClient.getQueryData<UserPublicInfo>(queryKey);

			setIsFollowed(nextStatus);
			queryClient.setQueryData<UserPublicInfo>(queryKey, (old) => {
				if (!old) {
					return old;
				}
				return {
					...old,
					is_followed: nextStatus,
					fans: Math.max(0, (old.fans ?? 0) + (nextStatus ? 1 : -1)),
				};
			});

			return { previousUser };
		},
		onError: (error, _nextStatus, context) => {
			if (context?.previousUser) {
				queryClient.setQueryData(queryKey, context.previousUser);
				setIsFollowed(!!context.previousUser.is_followed);
			} else {
				setIsFollowed(!!initialIsFollowed);
			}
			toast.error(error.message);
		},
		onSuccess: async () => {
			await refreshMainUserInfo();
			queryClient.invalidateQueries({
				queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: ['getUserFollows', mainUserInfo?.id],
			});
			queryClient.invalidateQueries({
				queryKey: ['getUserFans', userId],
			});
		},
	});

	if (mainUserInfo?.id === userId) {
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
			variant={isFollowed ? 'outline' : 'default'}
			className={cn(
				'rounded-2xl px-5 shadow-sm',
				isFollowed ? 'bg-background/80' : '',
				className,
			)}
			disabled={mutateFollow.isPending || relationPending}
			onClick={() => {
				if (!mainUserInfo) {
					handleLoginRedirect();
					return;
				}
				mutateFollow.mutate(!isFollowed);
			}}>
			{isFollowed ? <UserCheck className='size-4' /> : <UserPlus className='size-4' />}
			{isFollowed ? t('user_cancel_follow') : t('user_follow')}
			{(mutateFollow.isPending || relationPending) && (
				<Loader2 className='size-4 animate-spin' />
			)}
		</Button>
	);
};

export default SeoUserFollowButton;
