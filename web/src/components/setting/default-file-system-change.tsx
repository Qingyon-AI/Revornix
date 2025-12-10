'use client';

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogCancel,
	AlertDialogAction,
	AlertDialogFooter,
} from '@/components/ui/alert-dialog';

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
import { useState, useEffect } from 'react';
import { AlertCircleIcon } from 'lucide-react';

const DefaultFileSystemChange = () => {
	const t = useTranslations();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();

	const { data: mineFileSystems, isFetching: isFetchingMineFileSystems } =
		useQuery({
			queryKey: ['mine-file-system'],
			queryFn: async () => {
				return await getMineFileSystems({ keyword: '' });
			},
		});

	// 本地状态：当前选中的 filesystem id（字符串形式以匹配 Select 的 value）
	const [selectedFs, setSelectedFs] = useState<string | undefined>(
		mainUserInfo?.default_user_file_system
			? String(mainUserInfo.default_user_file_system)
			: undefined
	);

	// 对话框是否打开
	const [confirmOpen, setConfirmOpen] = useState(false);

	// 要切换到的目标 filesystem id（数字）
	const [targetFsId, setTargetFsId] = useState<number | null>(null);

	// 当 mainUserInfo 更新时，同步本地选中值
	useEffect(() => {
		if (mainUserInfo?.default_user_file_system) {
			setSelectedFs(String(mainUserInfo.default_user_file_system));
		}
	}, [mainUserInfo?.default_user_file_system]);

	const handleSelectChange = (value: string) => {
		const id = Number(value);
		if (id === mainUserInfo?.default_user_file_system) {
			// 选中了当前已是默认的不变
			setSelectedFs(value);
			return;
		}
		// 想切换：先记录目标 id，打开确认对话框
		setTargetFsId(id);
		setConfirmOpen(true);
	};

	const handleConfirmChange = async () => {
		if (targetFsId == null) {
			setConfirmOpen(false);
			return;
		}
		const [res, err] = await utils.to(
			updateUserDefaultFileSystem({
				default_user_file_system: targetFsId,
			})
		);
		if (err) {
			toast.error(err.message);
			// 失败的话，保持原来的选中值（不更改 selectedFs）
		} else {
			toast.success(
				t('setting_file_system_page_current_file_system_update_successfully')
			);
			await refreshMainUserInfo(); // 更新用户信息
			// 刷新 mainUserInfo -> effect 会同步 selectedFs
		}
		setConfirmOpen(false);
	};

	const handleCancelChange = () => {
		// 取消：恢复本地选中值到 mainUserInfo 默认值
		if (mainUserInfo?.default_user_file_system) {
			setSelectedFs(String(mainUserInfo.default_user_file_system));
		}
		setConfirmOpen(false);
	};

	return (
		<>
			<Select
				value={selectedFs}
				onValueChange={(e) => {
					handleSelectChange(e);
				}}>
				<SelectTrigger className='min-w-[180px]'>
					<SelectValue
						placeholder={t(
							'setting_file_system_page_current_user_file_system_select'
						)}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{mineFileSystems &&
							mineFileSystems.data.map((user_file_system) => (
								<SelectItem
									key={user_file_system.id}
									value={String(user_file_system.id)}>
									{user_file_system.title}
								</SelectItem>
							))}
					</SelectGroup>
				</SelectContent>
			</Select>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className='flex flex-row items-center gap-2 mb-2'>
							<div className='mx-auto sm:mx-0 flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10'>
								<AlertCircleIcon className='size-4 text-destructive' />
							</div>
							{t('setting_file_system_confirm_switch_file_system_title')}
						</AlertDialogTitle>
						<AlertDialogDescription className='text-destructive'>
							{t('setting_file_system_confirm_switch_file_system_description')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={handleCancelChange}>
							{t('cancel')}
						</AlertDialogCancel>
						<AlertDialogAction onClick={handleConfirmChange}>
							{t('confirm')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default DefaultFileSystemChange;
