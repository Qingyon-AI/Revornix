import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useUserContext } from '@/provider/user-provider';
import { updateUserDefaultReadMarkReason } from '@/service/user';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const DefaultDocumentReadMarkReasonChoose = () => {
	const t = useTranslations();
	const { userInfo, refreshUserInfo } = useUserContext();
	const reasons = [
		{ id: 0, name: t('setting_document_read_mark_reason_0') },
		{ id: 1, name: t('setting_document_read_mark_reason_1') },
		{ id: 2, name: t('setting_document_read_mark_reason_2') },
	];
	const handleUpdateDocumentDefaultReadMarkReason = async (
		reason_id: number
	) => {
		const [res, err] = await utils.to(
			updateUserDefaultReadMarkReason({
				default_read_mark_reason: reason_id,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshUserInfo();
		toast.success(
			t('setting_document_default_read_mark_reason_update_successful')
		);
	};
	return (
		<>
			<Select
				value={
					userInfo?.default_read_mark_reason
						? String(userInfo?.default_read_mark_reason)
						: userInfo?.default_read_mark_reason === 0
						? '0'
						: undefined
				}
				onValueChange={(e) => {
					handleUpdateDocumentDefaultReadMarkReason(Number(e));
				}}>
				<SelectTrigger className='w-[180px]'>
					<SelectValue
						placeholder={t('setting_default_document_read_mark_reason_select')}
					/>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{reasons.map((reason, index) => (
							<SelectItem key={index} value={String(reason.id)}>
								{reason.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</>
	);
};

export default DefaultDocumentReadMarkReasonChoose;
