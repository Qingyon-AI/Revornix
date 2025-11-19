import { UserSectionRole } from '@/enums/section';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { useTranslations } from 'next-intl';
import { useRouter } from 'nextjs-toploader/app';
import { SectionUserPublicInfo } from '@/generated';
import { useMutation } from '@tanstack/react-query';
import { deleteSectionUser, modifySectionUser } from '@/service/section';
import { toast } from 'sonner';
import { cloneDeep } from 'lodash';
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
	const t = useTranslations();
	const router = useRouter();
	const queryClient = getQueryClient();

	const mutateModifySectionUser = useMutation({
		mutationFn: modifySectionUser,
		onMutate(variables) {
			const prevUser = cloneDeep(user);
			user.authority = variables.authority;
			return { prevUser };
		},
		onError(error, variables, context) {
			console.error(error, variables, context);
			toast.error(error.message);
			if (user && context?.prevUser) {
				user = context?.prevUser;
			}
		},
	});

	const mutateDeleteSectionUser = useMutation({
		mutationFn: deleteSectionUser,
		onError(error, variables, context) {
			console.error(error, variables, context);
			toast.error(error.message);
		},
		onSuccess(data, variables, onMutateResult, context) {
			queryClient.invalidateQueries({
				queryKey: ['getSectionMembers', section_id],
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
