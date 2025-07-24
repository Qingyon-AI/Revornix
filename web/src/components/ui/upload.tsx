'use client';

import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useUserContext } from '@/provider/user-provider';
import { FileService } from '@/lib/file';
import { useQuery } from '@tanstack/react-query';
import { getUserFileSystemDetail } from '@/service/file-system';

const Upload = () => {
	const [status, setStatus] = useState<string | null>(null);
	const { userInfo } = useUserContext();
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

	const onChooseFile = async () => {
		fileInput.current?.click();
	};

	const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!userInfo?.default_user_file_system) {
			toast.error('No user default file system found');
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		setStatus('uploading');
		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const fileName = `files/${name}.${suffix}`;
		await fileService.uploadFile(fileName, file);
		toast.success('上传成功');
		setStatus(null);
	};

	return (
		<>
			<Button onClick={onChooseFile} disabled={status === 'uploading'}>
				{status === 'uploading' && (
					<Loader2 className='mr-2 size-4 animate-spin' />
				)}
				上传文件
			</Button>
			<input
				type='file'
				className='hidden'
				ref={fileInput}
				onChange={onUpload}
			/>
		</>
	);
};

export default Upload;
