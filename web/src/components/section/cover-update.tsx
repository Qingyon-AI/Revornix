import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Button } from '../ui/button';
import { useRef, useState } from 'react';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createAttachment } from '@/service/attachment';
import { useQuery } from '@tanstack/react-query';
import { uploadFile } from '@/service/file';

const CoverUpdate = () => {
	const form = useFormContext();
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
		const fileName = `${name}.${suffix}`;
		await utils.sleep(2000);
		await uploadFile(fileName, file);
		const [res, err] = await utils.to(
			createAttachment({
				name: fileName,
				description: '专栏封面',
			})
		);
		if (err) {
			toast.error('上传失败');
			return;
		}
		setUploadingStatus('done');
		form.setValue('cover', res);
	};
	return (
		<FormField
			name='cover'
			control={form.control}
			render={({ field }) => {
				return (
					<FormItem>
						<div className='flex flex-row items-center justify-between'>
							<FormLabel>专栏封面</FormLabel>
							<Button
								type='button'
								variant={'link'}
								className='text-xs'
								disabled={uploadingStatus === 'uploading'}
								onClick={handleOnUploadFile}>
								上传新图
								{uploadingStatus === 'uploading' && (
									<Loader2 className='animate-spin' />
								)}
							</Button>
							<input
								disabled={!!uploadingStatus}
								ref={upload}
								type='file'
								accept='image/*'
								className='hidden'
								onChange={handleUploadFile}
							/>
						</div>
						<img
							src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${field.value.name}`}
							className='w-full object-cover rounded'
						/>
						<FormMessage />
					</FormItem>
				);
			}}
		/>
	);
};

export default CoverUpdate;
