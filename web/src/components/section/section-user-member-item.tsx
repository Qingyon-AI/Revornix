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
import { modifySectionUser } from '@/service/section';
import { toast } from 'sonner';
import { cloneDeep } from 'lodash';

const SectionMemberItem = ({
	user,
	section_id,
}: {
	user: SectionUserPublicInfo;
	section_id: number;
}) => {
	const t = useTranslations();
	const router = useRouter();

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
			<Select
				value={user.authority?.toString()}
				onValueChange={(e) => {
					mutateModifySectionUser.mutate({
						section_id: section_id,
						user_id: user.id,
						authority: Number(e),
						role: UserSectionRole.MEMBER,
					});
				}}>
				<SelectTrigger
					className='h-6 px-2 text-xs w-[140px] flex-shrink-0'
					size={'sm'}>
					<SelectValue placeholder='请设置该用户的权限' />
				</SelectTrigger>
				<SelectContent className='text-xs'>
					<SelectGroup>
						<SelectItem value='0'>
							{t('section_share_user_authority_full_access')}
						</SelectItem>
						<SelectItem value='1'>
							{t('section_share_user_authority_w_and_r')}
						</SelectItem>
						<SelectItem value='2'>
							{t('section_share_user_authority_r_only')}
						</SelectItem>
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
};
export default SectionMemberItem;
