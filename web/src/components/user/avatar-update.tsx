'use client';

import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { updateUserInfo } from '@/service/user';
import { useMutation, useQuery } from '@tanstack/react-query';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import CustomImage from '../ui/custom-image';
import { FileService } from '@/lib/file';
import { getUserFileSystemDetail } from '@/service/file-system';

const AvatarUpdate = () => {
	const t = useTranslations();
	const { userInfo, refreshUserInfo } = useUserContext();
	const [uploadingStatus, setUploadingStatus] = useState<boolean>(false);
	const fileInput = useRef<HTMLInputElement>(null);

	const { data: userFileSystemDetail } = useQuery({
		queryKey: ['getUserFileSystemDetail', userInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: userInfo!.default_user_file_system!,
			}),
		enabled:
			userInfo?.id !== undefined &&
			userInfo?.default_user_file_system !== undefined,
	});

	const mutationUpdateUserInfo = useMutation({
		mutationFn: updateUserInfo,
		onSuccess: async () => {
			await utils.sleep(500);
			await refreshUserInfo();
		},
		onError(error) {
			toast.error(error.message);
		},
	});

	const onChooseFile = async () => {
		fileInput.current?.click();
	};

	const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!userInfo?.default_user_file_system) {
			toast.error('No user default file system found');
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		setUploadingStatus(true);
		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const fileName = `images/${name}.${suffix}`;
		const [res, err] = await utils.to(fileService.uploadFile(fileName, file));
		if (err) {
			toast.error('Failed to upload the image');
			setUploadingStatus(false);
			return;
		}
		await mutationUpdateUserInfo.mutateAsync({
			avatar: fileName,
		});
		setUploadingStatus(false);
	};

	return (
		<>
			{userInfo && !userInfo.avatar && (
				<>
					<Button
						className='text-xs'
						variant={'link'}
						onClick={onChooseFile}
						disabled={uploadingStatus}>
						{t('account_avatar_upload')}
						{uploadingStatus && <Loader2 className='size-4 animate-spin' />}
					</Button>
					<input
						type='file'
						className='hidden'
						ref={fileInput}
						onChange={onUpload}
					/>
				</>
			)}
			{userInfo && userInfo.avatar && (
				<>
					<div className='flex flex-row'>
						<CustomImage
							src={userInfo.avatar}
							className='mr-2 size-8 rounded object-cover'
							alt='avatar'
						/>
						<Button
							className='text-xs'
							variant={'link'}
							onClick={onChooseFile}
							disabled={uploadingStatus}>
							{t('account_avatar_update')}
							{uploadingStatus && <Loader2 className='size-4 animate-spin' />}
						</Button>
					</div>
					<input
						type='file'
						className='hidden'
						ref={fileInput}
						onChange={onUpload}
					/>
				</>
			)}
		</>
	);
};

export default AvatarUpdate;
