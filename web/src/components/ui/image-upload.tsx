import { utils } from '@kinda/utils';
import { FileIcon, Info, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useUserContext } from '@/provider/user-provider';
import { FileService } from '@/lib/file';
import { toast } from 'sonner';
import { getUserFileSystemDetail } from '@/service/file-system';
import { useQuery } from '@tanstack/react-query';
import {
	formatUploadSize,
	IMAGE_MAX_UPLOAD_BYTES,
} from '@/lib/upload';

const ImageUpload = ({
	onSuccess,
	onDelete,
	className,
	maxSizeBytes = IMAGE_MAX_UPLOAD_BYTES,
}: {
	onSuccess?: (fileName: string) => void;
	onDelete?: () => void;
	className?: string;
	maxSizeBytes?: number;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [file, setFile] = useState<File | null>(null);
	const upload = useRef<HTMLInputElement>(null);
	const [uploadingStatus, setUploadingStatus] = useState<string | null>();

	const { data: userFileSystemDetail } = useQuery({
		queryKey: [
			'getUserFileSystemDetail',
			mainUserInfo?.id,
			mainUserInfo?.default_user_file_system,
		],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	const handleOnUploadFile = () => {
		upload.current?.click();
	};

	const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}
		if (file.size > maxSizeBytes) {
			toast.error(
				t('file_upload_size_exceeded', {
					size: formatUploadSize(maxSizeBytes),
				}),
			);
			e.target.value = '';
			return;
		}
		if (!mainUserInfo?.default_user_file_system) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}
		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		setUploadingStatus('uploading');
		setFile(file);
		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const fileName = `files/${name}.${suffix}`;
		await utils.sleep(2000);
		await fileService.uploadFile(fileName, file);
		onSuccess && onSuccess(fileName);
		setUploadingStatus('done');
	};

	const handleDeleteFile = () => {
		setFile(null);
		setUploadingStatus(null);
		// ✅ 关键：清空 input 的值，确保下次选同一个文件也会触发 onChange
		if (upload.current) {
			upload.current.value = '';
		}
		onDelete && onDelete();
	};

	return (
		<div
			onClick={handleOnUploadFile}
			className={cn(
				'relative p-5 rounded-xl border border-input flex justify-center items-center flex-col text-xs gap-2 text-muted-foreground cursor-pointer hover:bg-muted',
				className,
			)}>
			{uploadingStatus && (
				<>
					<div>{file?.name}</div>
					{uploadingStatus === 'done' && (
						<Button
							type='button'
							variant={'outline'}
							size={'icon'}
							onClick={handleDeleteFile}>
							<Trash2 />
						</Button>
					)}
				</>
			)}
			{uploadingStatus === 'uploading' && (
				<>
					<Loader2 className='size-4 animate-spin' />
				</>
			)}
			{!uploadingStatus && (
				<>
					<FileIcon />
					<div className='flex flex-col items-center gap-1 text-center'>
						<span className='font-medium text-foreground'>
							{t('upload_image')}
						</span>
						<span className='inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm'>
							<Info className='size-3' />
							{t('upload_limit_hint', {
								size: formatUploadSize(maxSizeBytes),
							})}
						</span>
					</div>
				</>
			)}
			<input
				disabled={!!uploadingStatus}
				ref={upload}
				type='file'
				accept='image/*'
				className='hidden'
				onChange={handleUploadFile}
			/>
		</div>
	);
};

export default ImageUpload;
