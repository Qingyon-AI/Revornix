import { useUserContext } from '@/provider/user-provider';
import { Switch } from '../ui/switch';
import { utils } from '@kinda/utils';
import { updateDailyReport } from '@/service/user';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

const DailyReportStatus = () => {
	const { userInfo, refreshUserInfo, tempUpdateUserInfo } = useUserContext();

	const handleUpdateDailyReportStatus = async (status: boolean) => {
		if (!userInfo) return;
		tempUpdateUserInfo({
			...userInfo,
			daily_report_status: status,
		});
		const [res, err] = await utils.to(
			updateDailyReport({
				status,
				run_time: status ? '20:00:00' : null,
			})
		);
		if (err) {
			toast.error(err.message);
			return;
		}
		refreshUserInfo();
	};

	const mutate = useMutation({
		mutationFn: handleUpdateDailyReportStatus,
		onMutate(variables) {},
		onError(error, variables, context) {},
	});

	return (
		<>
			{userInfo && (
				<Switch
					// @ts-ignore
					checked={userInfo.daily_report_status}
					onCheckedChange={(e) => {
						handleUpdateDailyReportStatus(e);
					}}
				/>
			)}
		</>
	);
};

export default DailyReportStatus;
