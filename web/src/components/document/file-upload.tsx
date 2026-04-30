import { utils } from '@kinda/utils';
import { FileIcon, Info, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
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
	const [isDragActive, setIsDragActive] = useState(false);

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

	const uploadSelectedFile = useCallback(
		async (selectedFile: File | null | undefined) => {
			const file = selectedFile;
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
		},
		[
			mainUserInfo?.default_user_file_system,
			maxSizeBytes,
			onSuccess,
			t,
			userFileSystemDetail?.file_system_id,
		],
	);

	const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		await uploadSelectedFile(file);
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

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		if (uploadingStatus) return;
		event.preventDefault();
		setIsDragActive(true);
	};

	const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
		if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
			return;
		}
		setIsDragActive(false);
	};

	const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
		if (uploadingStatus) return;
		event.preventDefault();
		setIsDragActive(false);

		const droppedFiles = Array.from(event.dataTransfer.files ?? []);
		if (!droppedFiles.length) {
			return;
		}
		if (droppedFiles.length > 1) {
			toast.error(t('document_create_file_upload_single_only'));
			return;
		}
		await uploadSelectedFile(droppedFiles[0]);
	};

	return (
		<div
			onClick={handleOnUploadFile}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={(event) => void handleDrop(event)}
			className={cn(
				'relative flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/25 px-5 py-8 text-center text-sm text-muted-foreground transition hover:border-foreground/20 hover:bg-muted/45',
				isDragActive &&
					'border-primary/60 bg-primary/8 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]',
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
					<div
						className={cn(
							'flex size-14 items-center justify-center rounded-full bg-background shadow-sm transition-colors',
							isDragActive && 'bg-primary/10 text-primary',
						)}>
						{isDragActive ? (
							<UploadCloud className='size-6' />
						) : (
							<FileIcon className='size-5' />
						)}
					</div>
					<div className='flex flex-col items-center gap-1.5 text-center'>
						<span className='font-medium text-foreground'>
							{isDragActive
								? t('document_create_file_upload_drop_here')
								: t('document_create_file_upload')}
						</span>
						<span className='text-xs text-muted-foreground'>
							{t('document_create_file_upload_drag_hint')}
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
