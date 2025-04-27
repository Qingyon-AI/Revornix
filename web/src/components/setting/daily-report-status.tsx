import { useUserContext } from '@/provider/user-provider';
import { Switch } from '../ui/switch';
import { utils } from '@kinda/utils';
import { updateDailyReport } from '@/service/user';
import { toast } from 'sonner';

const DailyReportStatus = () => {
	const { userInfo, refreshUserInfo, tempUpdateUserInfo } = useUserContext();

	const handleUpdateDailyReportStatus = async (status: boolean) => {
		if (!userInfo) return;
		if (Notification.permission !== 'granted' && status) {
			Notification.requestPermission().then((permission) => {
				if (permission === 'granted') {
					console.log('用户允许通知');
				} else {
					toast.warning(
						'您未开启通知权限，在未浏览网页时将无法收到网站端每日报告'
					);
				}
			});
		}
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
