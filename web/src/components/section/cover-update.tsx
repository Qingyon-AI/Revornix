import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Button } from '../ui/button';
import { useRef, useState } from 'react';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { useQuery } from '@tanstack/react-query';
import { getUserFileSystemDetail } from '@/service/file-system';
import { useTranslations } from 'next-intl';

const CoverUpdate = () => {
	const t = useTranslations();
	const form = useFormContext();
	const { mainUserInfo } = useUserContext();
	const [file, setFile] = useState<File | null>(null);
	const upload = useRef<HTMLInputElement>(null);
	const [uploadingStatus, setUploadingStatus] = useState<string | null>();

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

	const handleOnUploadFile = () => {
		upload.current?.click();
	};

	const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) {
			return;
		}
		if (!mainUserInfo?.default_user_file_system) {
			toast.error('No user default file system found');
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
		setUploadingStatus('done');
		form.setValue('cover', fileName);
	};
	return (
		<FormField
			name='cover'
			control={form.control}
			render={({ field }) => {
				return (
					<FormItem>
						<div className='flex flex-row items-center justify-between'>
							<FormLabel>{t('section_form_cover')}</FormLabel>
							<Button
								type='button'
								variant={'link'}
								className='text-xs'
								disabled={uploadingStatus === 'uploading'}
								onClick={handleOnUploadFile}>
								{t('section_form_cover_upload_new')}
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

						{field.value && field.value.startsWith('http') && (
							<img
								alt='cover'
								src={field.value}
								className='w-full object-cover rounded'
							/>
						)}

						{file && !field.value.startsWith('http') && (
							<img
								alt='cover'
								src={URL.createObjectURL(file)}
								className='w-full object-cover rounded'
							/>
						)}

						<FormMessage />
					</FormItem>
				);
			}}
		/>
	);
};

export default CoverUpdate;
