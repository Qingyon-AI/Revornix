'use client';

import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ChangeEvent, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { createAttachment } from '@/service/attachment';
import { updateUserInfo } from '@/service/user';
import { PhotoProvider, PhotoView } from 'react-photo-view';
import { useMutation } from '@tanstack/react-query';
import { utils } from '@kinda/utils';
import { uploadFile } from '@/service/file';

const AvatarUpdate = () => {
	const { userInfo, refreshUserInfo } = useUserContext();
	const [uploadingStatus, setUploadingStatus] = useState<boolean>(false);
	const fileInput = useRef<HTMLInputElement>(null);

	const mutation = useMutation({
		mutationFn: updateUserInfo,
		onSuccess: () => {
			refreshUserInfo();
		},
	});

	const onChooseFile = async () => {
		fileInput.current?.click();
	};

	const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
		setUploadingStatus(true);
		const file = e.target.files?.[0];
		if (!file) return;
		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const fileName = `images/${name}.${suffix}`;
		await uploadFile(fileName, file);
		const [res_create_attachment, err_create_attachment] = await utils.to(
			createAttachment({ name: fileName, description: '头像' })
		);
		if (err_create_attachment) {
			toast.error('上传失败');
			setUploadingStatus(false);
			return;
		}
		if (!res_create_attachment) {
			toast.error('上传失败');
			setUploadingStatus(false);
			return;
		}
		mutation.mutateAsync({
			avatar_attachment_id: res_create_attachment.id,
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
						上传头像
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
						<PhotoProvider>
							<PhotoView
								src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${userInfo.avatar.name}`}>
								<img
									src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${userInfo.avatar.name}`}
									className='mr-2 size-8 rounded object-cover'
									alt='avatar'
								/>
							</PhotoView>
						</PhotoProvider>
						<Button
							className='text-xs'
							variant={'link'}
							onClick={onChooseFile}
							disabled={uploadingStatus}>
							更改头像
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
