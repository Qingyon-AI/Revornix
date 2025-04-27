'use client';

import { ModeToggle } from '@/components/app/mode-toggle';
import DailyReportStatus from '@/components/setting/daily-report-status';
import DailyReportTime from '@/components/setting/daily-report-time';
import LanguageChange from '@/components/setting/language-change';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useUserContext } from '@/provider/user-provider';
import Link from 'next/link';

const SettingPage = () => {
	const { userInfo } = useUserContext();
	return (
		<div className='px-5 pb-5'>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>颜色风格</Label>
						<div className='flex flex-col gap-2'>
							<ModeToggle />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>语言</Label>
						<div className='flex flex-col gap-2'>
							<LanguageChange />
						</div>
					</div>
					{/* <Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>面板设计</Label>
						<div className='flex flex-col gap-2'>
							<Link href={'/setting/dashboard'}>
								<Button variant={'link'} className='text-xs'>
									前往修改
								</Button>
							</Link>
						</div>
					</div> */}
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							每日总结通知
						</Label>
						<div className='flex flex-col gap-2'>
							<DailyReportStatus />
						</div>
					</div>
					{userInfo?.daily_report_status && (
						<>
							<Separator />
							<div className='flex justify-between items-center'>
								<Label className='flex flex-col gap-2 items-start'>
									每日总结通知时间
								</Label>
								<div className='flex flex-col gap-2'>
									<DailyReportTime />
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
export default SettingPage;
