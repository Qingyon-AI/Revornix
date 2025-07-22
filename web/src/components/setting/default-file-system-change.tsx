'use client';

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useUserContext } from '@/provider/user-provider';
import { getMineFileSystems } from '@/service/file-system';
import { updateUserDefaultFileSystem } from '@/service/user';
import { utils } from '@kinda/utils';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const DefaultFileSystemChange = () => {
	const t = useTranslations();
	const { userInfo, refreshUserInfo } = useUserContext();
	const {
		data: mineFileSystems,
		isFetching: isFetchingMineFileSystems,
		isRefetching: isRefetchingMineFileSystems,
	} = useQuery({
		queryKey: ['mine-file-system'],
		queryFn: async () => {
			return await getMineFileSystems({ keyword: '' });
		},
	});

	const handleUpdateDefaultFileSystem = async (file_system_id: number) => {
		const [res, err] = await utils.to(
			updateUserDefaultFileSystem({
				default_file_system: file_system_id,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshUserInfo();
		toast.success(
			t('setting_file_system_page_current_file_system_update_successfully')
		);
	};

	return (
		<>
			<Select
				value={
					userInfo?.default_file_system
						? String(userInfo?.default_file_system)
						: undefined
				}
				onValueChange={(e) => {
					handleUpdateDefaultFileSystem(Number(e));
				}}>
				<SelectTrigger className='w-[180px]'>
					<SelectValue
						placeholder={t(
							'setting_file_system_page_current_file_system_select'
						)}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{mineFileSystems &&
							mineFileSystems.data.map((file_system, index) => (
								<SelectItem key={file_system.id} value={String(file_system.id)}>
									{file_system.name}
								</SelectItem>
							))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</>
	);
};

export default DefaultFileSystemChange;
