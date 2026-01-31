import { utils } from '@kinda/utils';
import { FileIcon, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getUserFileSystemDetail } from '@/service/file-system';

const FileUpload = ({
	onSuccess,
	onDelete,
	className,
	accept,
	defaultFileName, // ⭐新增：默认文件路径（字符串）
}: {
	accept?: string;
	defaultFileName?: string; // ⭐ 接收默认值
	onSuccess?: (fileName: string) => void;
	onDelete?: () => void;
	className?: string;
}) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [file, setFile] = useState<File | null>(null);
	const [fileName, setFileName] = useState<string | null>(null); // ⭐保存文件路径
	const upload = useRef<HTMLInputElement>(null);
	const [uploadingStatus, setUploadingStatus] = useState<string | null>(null);

	// 加载用户文件系统信息
	const { data: userFileSystemDetail } = useQuery({
		queryKey: ['getUserFileSystemDetail', mainUserInfo?.id],
		queryFn: () =>
			getUserFileSystemDetail({
				user_file_system_id: mainUserInfo!.default_user_file_system!,
			}),
		enabled:
			mainUserInfo?.id !== undefined &&
			mainUserInfo?.default_user_file_system !== undefined,
	});

	// ⭐初始化默认值（仅初始化一次）
	useEffect(() => {
		if (defaultFileName && !fileName) {
			setFileName(defaultFileName);
			setUploadingStatus('done'); // 已上传状态
		}
	}, [defaultFileName]);

	const handleOnUploadFile = () => {
		upload.current?.click();
	};

	const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!mainUserInfo?.default_user_file_system) {
			toast.error('No user default file system found');
			return;
		}

		const fileService = new FileService(userFileSystemDetail?.file_system_id!);

		setUploadingStatus('uploading');
		setFile(file);

		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const newFileName = `files/${name}.${suffix}`;

		await utils.sleep(2000);
		await fileService.uploadFile(newFileName, file);

		// ⭐更新文件路径
		setFileName(newFileName);

		onSuccess && onSuccess(newFileName);

		setUploadingStatus('done');
	};

	const handleDeleteFile = () => {
		setFile(null);
		setFileName(null);
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
				'relative p-5 rounded border border-input flex justify-center items-center flex-col text-xs gap-2 text-muted-foreground cursor-pointer hover:bg-muted',
				className,
			)}>
			{uploadingStatus && (
				<>
					<div>{file?.name || fileName}</div>
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
				<Loader2 className='size-4 animate-spin' />
			)}

			{!uploadingStatus && (
				<>
					<FileIcon />
					{t('document_create_file_upload')}
				</>
			)}

			<input
				disabled={!!uploadingStatus}
				ref={upload}
				accept={accept}
				type='file'
				className='hidden'
				onChange={handleUploadFile}
			/>
		</div>
	);
};

export default FileUpload;
