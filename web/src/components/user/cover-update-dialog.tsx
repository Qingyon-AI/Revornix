'use client';

import { ChangeEvent, useRef, useState } from 'react';

import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { FileService } from '@/lib/file';
import { replacePath } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import { updateUserInfo } from '@/service/user';
import { formatUploadSize, IMAGE_MAX_UPLOAD_BYTES } from '@/lib/upload';

const CoverUpdateDialog = () => {
	const t = useTranslations();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const [open, setOpen] = useState(false);
	const [uploading, setUploading] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);

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

	const mutationUpdateUserInfo = useMutation({
		mutationFn: updateUserInfo,
		onSuccess: async () => {
			await utils.sleep(500);
			await refreshMainUserInfo();
		},
		onError(error) {
			toast.error(error.message);
		},
	});

	const onChooseFile = () => fileInput.current?.click();

	const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > IMAGE_MAX_UPLOAD_BYTES) {
			toast.error(
				t('file_upload_size_exceeded', {
					size: formatUploadSize(IMAGE_MAX_UPLOAD_BYTES),
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
		setUploading(true);
		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const fileName = `images/${name}.${suffix}`;
		const [_, err] = await utils.to(fileService.uploadFile(fileName, file));
		if (err) {
			toast.error(t('error_upload_image_failed'));
			setUploading(false);
			return;
		}

		await mutationUpdateUserInfo.mutateAsync({ cover: fileName });
		setUploading(false);
		e.target.value = '';
	};

	const coverSrc =
		mainUserInfo?.cover && mainUserInfo.cover.length > 0
			? replacePath(mainUserInfo.cover, mainUserInfo.id)
			: null;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant='outline'>{t('account_cover_update')}</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-xl'>
				<DialogHeader>
					<DialogTitle>{t('account_cover')}</DialogTitle>
					<DialogDescription>
						{t('account_cover_description')}
					</DialogDescription>
				</DialogHeader>

				<button
					type='button'
					onClick={onChooseFile}
					disabled={uploading}
					className='group relative aspect-[3/1] w-full overflow-hidden rounded-xl border border-border bg-muted transition hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-70'>
					{coverSrc ? (
						<img
							src={coverSrc}
							alt='profile cover'
							className='h-full w-full object-cover'
						/>
					) : (
						<div className='flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground'>
							<ImagePlus className='size-8' />
							<span className='text-sm'>
								{t('account_cover_upload')}
							</span>
						</div>
					)}
					<div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100'>
						{uploading ? (
							<Loader2 className='size-5 animate-spin' />
						) : (
							t('account_cover_update')
						)}
					</div>
				</button>

				<p className='text-xs text-muted-foreground'>
					{t('upload_limit_hint', {
						size: formatUploadSize(IMAGE_MAX_UPLOAD_BYTES),
					})}
				</p>

				<DialogFooter>
					<Button
						variant='outline'
						onClick={() => setOpen(false)}
						disabled={uploading}>
						{t('account_cover_dialog_done')}
					</Button>
					<Button onClick={onChooseFile} disabled={uploading}>
						{uploading ? (
							<Loader2 className='size-4 animate-spin' />
						) : null}
						{coverSrc
							? t('account_cover_update')
							: t('account_cover_upload')}
					</Button>
				</DialogFooter>

				<input
					type='file'
					accept='image/*'
					className='hidden'
					ref={fileInput}
					onChange={onUpload}
				/>
			</DialogContent>
		</Dialog>
	);
};

export default CoverUpdateDialog;
