import { utils } from '@kinda/utils';
import { FileIcon, Info, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getUserFileSystemDetail } from '@/service/file-system';
import { formatUploadSize } from '@/lib/upload';
import { generateUUID } from '@/lib/uuid';

const FileUpload = ({
	onSuccess,
	onDelete,
	className,
	accept,
	defaultFileName, // ⭐新增：默认文件路径（字符串）
	maxSizeBytes,
}: {
	accept?: string;
	defaultFileName?: string; // ⭐ 接收默认值
	maxSizeBytes?: number;
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

		if (maxSizeBytes && file.size > maxSizeBytes) {
			toast.error(
				t('file_upload_size_exceeded', {
					size: formatUploadSize(maxSizeBytes),
				}),
			);
			if (upload.current) {
				upload.current.value = '';
			}
			return;
		}

		if (!mainUserInfo?.default_user_file_system) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}

		const fileService = new FileService(userFileSystemDetail?.file_system_id!);

		setUploadingStatus('uploading');
		setFile(file);

		const name = generateUUID();
		const suffix = file.name.split('.').pop();
		const newFileName = `files/${name}.${suffix}`;

		try {
			await utils.sleep(2000);
			await fileService.uploadFile(newFileName, file);

			// ⭐更新文件路径
			setFileName(newFileName);

			onSuccess && onSuccess(newFileName);

			setUploadingStatus('done');
		} catch (error) {
			setFile(null);
			setFileName(null);
			setUploadingStatus(null);
			if (upload.current) {
				upload.current.value = '';
			}
			toast.error(error instanceof Error ? error.message : t('upload_failed'));
		}
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
				'relative flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/25 px-5 py-8 text-center text-sm text-muted-foreground transition hover:border-foreground/20 hover:bg-muted/45',
				className,
			)}>
			{uploadingStatus && (
				<>
					<div className='max-w-full truncate text-sm font-medium text-foreground'>
						{file?.name || fileName}
					</div>
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
					<div className='flex size-12 items-center justify-center rounded-full bg-background shadow-sm'>
						<FileIcon className='size-5' />
					</div>
					<div className='flex flex-col items-center gap-1.5 text-center'>
						<span className='font-medium text-foreground'>
							{t('document_create_file_upload')}
						</span>
						{maxSizeBytes && (
							<span className='inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm'>
								<Info className='size-3' />
								{t('document_create_file_upload_limit_hint', {
									size: formatUploadSize(maxSizeBytes),
								})}
							</span>
						)}
					</div>
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
