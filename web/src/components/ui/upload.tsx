'use client';

import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { BuiltInFile } from '@/service/built-in-file';

const Upload = () => {
	const [status, setStatus] = useState<string | null>(null);
	const fileInput = useRef<HTMLInputElement>(null);

	const onChooseFile = async () => {
		fileInput.current?.click();
	};

	const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const fileService = new BuiltInFile();
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
