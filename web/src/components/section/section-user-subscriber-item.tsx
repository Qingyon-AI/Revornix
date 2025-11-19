import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useRouter } from 'nextjs-toploader/app';
import { SectionUserPublicInfo } from '@/generated';
import { useMutation } from '@tanstack/react-query';
import { deleteSectionUser } from '@/service/section';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Loader2, XCircleIcon } from 'lucide-react';
import { getQueryClient } from '@/lib/get-query-client';

const SectionSubscriberItem = ({
	user,
	section_id,
}: {
	user: SectionUserPublicInfo;
	section_id: number;
}) => {
	const router = useRouter();
	const queryClient = getQueryClient();

	const mutateDeleteSectionUser = useMutation({
		mutationFn: deleteSectionUser,
		onError(error, variables, context) {
			console.error(error, variables, context);
			toast.error(error.message);
		},
		onSuccess(data, variables, onMutateResult, context) {
			queryClient.invalidateQueries({
				predicate(query) {
					return query.queryKey[0] === 'getSectionSubscriber';
				},
			});
		},
	});

	const handleDeleteSectionUser = () => {
		mutateDeleteSectionUser.mutate({
			section_id: section_id,
			user_id: user.id,
		});
	};

	return (
		<div className='flex items-center justify-between'>
			<div className='flex flex-row gap-2 items-center'>
				<Avatar
					className='size-5'
					title={user?.nickname ?? ''}
					onClick={(e) => {
						router.push(`/user/detail/${user?.id}`);
						e.preventDefault();
						e.stopPropagation();
					}}>
					<AvatarImage src={user.avatar} alt='avatar' />
					<AvatarFallback>{user.nickname}</AvatarFallback>
				</Avatar>
				<p>{user.nickname}</p>
			</div>
			<Button
				size={'icon'}
				variant={'secondary'}
				disabled={mutateDeleteSectionUser.isPending}
				onClick={handleDeleteSectionUser}>
				<XCircleIcon />
				{mutateDeleteSectionUser.isPending && (
					<Loader2 className='animate-spin' />
				)}
			</Button>
		</div>
	);
};
export default SectionSubscriberItem;
