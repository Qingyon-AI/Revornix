'use client';

import { utils } from '@kinda/utils';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { FileService } from '@/lib/file';
import { useUserContext } from '@/provider/user-provider';
import { getUserFileSystemDetail } from '@/service/file-system';

export type AIImageAttachment = {
	path: string;
	name: string;
};

const toAttachment = (path: string): AIImageAttachment => ({
	path,
	name: path.split('/').pop() || path,
});

export const useAIImageAttachments = () => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [attachments, setAttachments] = useState<AIImageAttachment[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

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

	const openPicker = () => {
		inputRef.current?.click();
	};

	const clearInput = () => {
		if (inputRef.current) {
			inputRef.current.value = '';
		}
	};

	const removeAttachment = (path: string) => {
		setAttachments((current) => current.filter((item) => item.path !== path));
		clearInput();
	};

	const clearAttachments = () => {
		setAttachments([]);
		clearInput();
	};

	const uploadFiles = async (files: FileList | File[]) => {
		if (!mainUserInfo?.default_user_file_system) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}
		if (!userFileSystemDetail?.file_system_id) {
			toast.error(t('error_default_file_system_not_found'));
			return;
		}

		const fileList = Array.from(files);
		if (fileList.length === 0) {
			return;
		}

		setIsUploading(true);
		const fileService = new FileService(userFileSystemDetail.file_system_id);
		const nextAttachments: AIImageAttachment[] = [];

		for (const file of fileList) {
			if (!file.type.startsWith('image/')) {
				continue;
			}

			const suffix = file.name.split('.').pop();
			const filePath = suffix
				? `images/ai/${crypto.randomUUID()}.${suffix}`
				: `images/ai/${crypto.randomUUID()}`;

			const [, error] = await utils.to(fileService.uploadFile(filePath, file));
			if (error) {
				toast.error(t('error_upload_image_failed'));
				continue;
			}

			nextAttachments.push({
				path: filePath,
				name: file.name,
			});
		}

		if (nextAttachments.length > 0) {
			setAttachments((current) => [...current, ...nextAttachments]);
		}
		setIsUploading(false);
		clearInput();
	};

	const handleFileChange = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		if (!event.target.files || event.target.files.length === 0) {
			return;
		}
		await uploadFiles(event.target.files);
	};

	const hydrateAttachments = (paths?: string[]) => {
		setAttachments((paths ?? []).map(toAttachment));
	};

	return {
		attachments,
		imagePaths: attachments.map((item) => item.path),
		isUploading,
		inputRef,
		openPicker,
		handleFileChange,
		removeAttachment,
		clearAttachments,
		hydrateAttachments,
	};
};
