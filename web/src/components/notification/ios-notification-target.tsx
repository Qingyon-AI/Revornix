import { useCallback, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import QRCode from 'qrcode';
import Image from 'next/image';
import { useNotificationWSStore } from '@/store/notification-ws';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { generateUUID } from '@/lib/uuid';

type IOSBindStatus = 'waiting' | 'scanned' | 'confirm' | 'canceled';

const IOSNotificationTarget = ({ env }: { env: 'prod' | 'sandbox' }) => {
	const t = useTranslations();
	const [qrCode, setQrCode] = useState('');
	const [status, setStatus] = useState<IOSBindStatus>('waiting');
	const [codeUuid, setCodeUuid] = useState(() => generateUUID());
	const form = useFormContext();
	const currentEvent = useNotificationWSStore(
		(state) => state.iosBindEvents[codeUuid],
	);
	const removeIOSBindEvent = useNotificationWSStore(
		(state) => state.removeIOSBindEvent,
	);

	const generateQrCode = async (data: string) => {
		try {
			const dataUrl = await QRCode.toDataURL(data);
			setQrCode(dataUrl);
		} catch (err) {
			console.error(err);
		}
	};

	const regenerateQrCode = useCallback(() => {
		removeIOSBindEvent(codeUuid);
		setStatus('waiting');
		setCodeUuid(generateUUID());
	}, [codeUuid, removeIOSBindEvent]);

	useEffect(() => {
		setQrCode('');
		form.setValue('ios_target_form.device_token', '', {
			shouldValidate: true,
			shouldDirty: true,
		});
		const data = {
			action: 'bind_ios_notification_target',
			code: codeUuid,
		};
		void generateQrCode(JSON.stringify(data));
	}, [codeUuid, form]);

	useEffect(() => {
		if (!currentEvent) return;
		setStatus(currentEvent.status);
		if (currentEvent.status === 'confirm' && currentEvent.device_token) {
			form.setValue('ios_target_form.device_token', currentEvent.device_token, {
				shouldValidate: true,
				shouldDirty: true,
			});
			return;
		}
		if (currentEvent.status === 'canceled') {
			regenerateQrCode();
		}
	}, [currentEvent, form, regenerateQrCode]);

	useEffect(() => {
		return () => {
			removeIOSBindEvent(codeUuid);
		};
	}, [codeUuid, removeIOSBindEvent]);

	const renderStatusText = () => {
		if (status === 'waiting') return t('notification_ios_bind_status_waiting');
		if (status === 'scanned') return t('notification_ios_bind_status_scanned');
		if (status === 'confirm') return t('notification_ios_bind_status_confirm');
		return t('notification_ios_bind_status_canceled');
	};

	return (
		<div className='flex flex-col justify-center items-center'>
			{status !== 'confirm' &&
				(qrCode ? (
					<Image
						src={qrCode}
						alt='qr code'
						height={200}
						width={200}
						className='rounded-lg my-2 ring-ring ring-1'
					/>
				) : (
					<>
						{t('loading')}
						<Loader2 />
					</>
				))}

			<p className='text-muted-foreground text-xs'>
				{status === 'confirm'
					? t('notification_ios_bind_scan_done_tip')
					: t('notification_ios_bind_scan_tip')}
			</p>
			<p className='text-xs mt-1'>{renderStatusText()}</p>
		</div>
	);
};

export default IOSNotificationTarget;
