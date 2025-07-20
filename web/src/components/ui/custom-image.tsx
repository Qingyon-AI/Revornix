import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getFileSystemDetail } from '@/service/file_system';
import { utils } from '@kinda/utils';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface Props extends React.HTMLAttributes<HTMLImageElement> {
	src?: string | Blob;
	alt?: string;
	className?: string;
	errorPlaceHolder?: React.ReactNode;
	loadingPlaceholder?: React.ReactNode;
}

const CustomImage = (props: Props) => {
	const { src, alt, className, errorPlaceHolder, loadingPlaceholder, ...rest } =
		props;

	const { userInfo } = useUserContext();

	const [isLoaded, setIsLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [finalSrc, setFinalSrc] = useState<string | Blob | undefined>(src);

	const handleGetFinalSrc = async () => {
		if (!userInfo) {
			return;
		}
		if (!userInfo.default_file_system) {
			toast.error('请先设置默认文件系统');
			return;
		}
		switch (userInfo.default_file_system) {
			case 1:
				setFinalSrc(
					`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${src}`
				);
				break;
			case 2:
				const [res_file_system_config, err_file_system_config] = await utils.to(
					getFileSystemDetail({ file_system_id: userInfo.default_file_system })
				);
				if (err_file_system_config || !res_file_system_config) {
					toast.error('获取文件系统信息失败');
					return;
				}
				if (!res_file_system_config?.config_json) {
					toast.error('文件系统配置信息不存在');
					return;
				}
				const config_json = JSON.parse(res_file_system_config?.config_json);
				setFinalSrc(`${config_json.url_prefix}/${src}`);
			default:
				break;
		}
	};

	useEffect(() => {
		setIsLoaded(false);
		setHasError(false);
		handleGetFinalSrc();
	}, [src, userInfo]);

	if (hasError && errorPlaceHolder) {
		return <>{errorPlaceHolder}</>;
	}

	return (
		<div className={cn('relative overflow-hidden', className)}>
			{/* 占位元素（加载中） */}
			{!isLoaded && !hasError && (
				<div className='absolute inset-0'>
					{loadingPlaceholder ?? (
						<div className='w-full h-full bg-gray-100 animate-pulse rounded' />
					)}
				</div>
			)}

			{/* 图片元素 */}
			<img
				src={finalSrc}
				alt={alt}
				className={cn(
					'w-full h-full object-cover',
					!isLoaded && 'opacity-0',
					isLoaded && !hasError && 'opacity-100 transition-opacity duration-300'
				)}
				onLoad={() => setIsLoaded(true)}
				onError={() => setHasError(true)}
				{...rest}
			/>
		</div>
	);
};

export default CustomImage;
