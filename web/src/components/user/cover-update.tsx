'use client';

import { ChangeEvent, useRef, useState } from 'react';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { FileService } from '@/lib/file';
import { replacePath } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';
import { updateUserInfo } from '@/service/user';

const CoverUpdate = ({
	compact = false,
	className,
}: {
	compact?: boolean;
	className?: string;
}) => {
	const t = useTranslations();
	const { mainUserInfo, refreshMainUserInfo } = useUserContext();
	const [uploadingStatus, setUploadingStatus] = useState(false);
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

	const onChooseFile = async () => {
		fileInput.current?.click();
	};

	const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!mainUserInfo?.default_user_file_system) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}

		const fileService = new FileService(userFileSystemDetail?.file_system_id!);
		setUploadingStatus(true);
		const name = crypto.randomUUID();
		const suffix = file.name.split('.').pop();
		const fileName = `images/${name}.${suffix}`;
		const [_, err] = await utils.to(fileService.uploadFile(fileName, file));
		if (err) {
			toast.error(t('error_upload_image_failed'));
			setUploadingStatus(false);
			return;
		}

		await mutationUpdateUserInfo.mutateAsync({
			cover: fileName,
		});
		setUploadingStatus(false);
		e.target.value = '';
	};

	const coverSrc =
		mainUserInfo?.cover && mainUserInfo.cover.length > 0
			? replacePath(mainUserInfo.cover, mainUserInfo.id)
			: null;

	return (
		<>
			<div className={className}>
				{compact ? (
					<Button
						type='button'
						size='sm'
						variant='outline'
						className='rounded-full'
						onClick={onChooseFile}
						disabled={uploadingStatus}>
						{coverSrc ? t('account_cover_update') : t('account_cover_upload')}
						{uploadingStatus ? (
							<Loader2 className='size-4 animate-spin' />
						) : null}
					</Button>
				) : (
					<div className='flex flex-col items-end gap-3'>
						<div className='h-20 w-36 overflow-hidden rounded-2xl border border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_26%),radial-gradient(circle_at_85%_18%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(56,189,248,0.2),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(15,23,42,0.84))]'>
							{coverSrc ? (
								<img
									src={coverSrc}
									alt='profile cover'
									className='h-full w-full object-cover'
								/>
							) : null}
						</div>
						<Button
							className='text-xs'
							variant='link'
							onClick={onChooseFile}
							disabled={uploadingStatus}>
							{coverSrc
								? t('account_cover_update')
								: t('account_cover_upload')}
							{uploadingStatus ? (
								<Loader2 className='size-4 animate-spin' />
							) : null}
						</Button>
					</div>
				)}
			</div>
			<input
				type='file'
				accept='image/*'
				className='hidden'
				ref={fileInput}
				onChange={onUpload}
			/>
		</>
	);
};

export default CoverUpdate;
