import { utils } from '@kinda/utils';
import { FileIcon, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { uploadFile } from '@/service/built-in-file';
import { useTranslations } from 'next-intl';

const ImageUpload = ({
	onSuccess,
	onDelete,
	className,
}: {
	onSuccess?: (fileName: string) => void;
	onDelete?: () => void;
	className?: string;
}) => {
	const t = useTranslations();
	const [file, setFile] = useState<File | null>(null);
	const upload = useRef<HTMLInputElement>(null);
	const [uploadingStatus, setUploadingStatus] = useState<string | null>();
	const handleOnUploadFile = () => {
		upload.current?.click();
	};
	const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}
		setUploadingStatus('uploading');
		setFile(file);
		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const fileName = `files/${name}.${suffix}`;
		await utils.sleep(2000);
		await uploadFile(fileName, file);
		onSuccess && onSuccess(fileName);
		setUploadingStatus('done');
	};
	const handleDeleteFile = () => {
		setFile(null);
		setUploadingStatus(null);
		onDelete && onDelete();
	};
	return (
		<div
			onClick={handleOnUploadFile}
			className={cn(
				'relative p-5 rounded border border-input flex justify-center items-center flex-col text-xs gap-2 text-muted-foreground cursor-pointer hover:bg-muted',
				className
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
					{t('upload_image')}
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
