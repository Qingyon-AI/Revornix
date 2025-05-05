'use client';

import { ModeToggle } from '@/components/app/mode-toggle';
import DailyReportStatus from '@/components/setting/daily-report-status';
import DailyReportTime from '@/components/setting/daily-report-time';
import LanguageChange from '@/components/setting/language-change';
import ModelCollection from '@/components/setting/model-collection';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';

const SettingPage = () => {
	const t = useTranslations();
	const { userInfo } = useUserContext();
	return (
		<div className='px-5 pb-5'>
			<h2 className='text-xs text-muted-foreground p-3'>基础配置</h2>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_color')}
						</Label>
						<div className='flex flex-col gap-2'>
							<ModeToggle />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_language_choose')}
						</Label>
						<div className='flex flex-col gap-2'>
							<LanguageChange />
						</div>
					</div>
				</CardContent>
			</Card>
			<h2 className='text-xs text-muted-foreground p-3'>通知配置</h2>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_daily_notification')}
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
									{t('setting_daily_notification_time')}
								</Label>
								<div className='flex flex-col gap-2'>
									<DailyReportTime />
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>
			<h2 className='text-xs text-muted-foreground p-3'>模型配置</h2>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>模型集成</Label>
						<div className='flex flex-col gap-2'>
							<ModelCollection />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							Revornix AI应答模型
						</Label>
						<div className='flex flex-col gap-2'>
							DeepSeek
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							文章内容总结模型
						</Label>
						<div className='flex flex-col gap-2'>
							Kimi
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							网站爬取引擎
						</Label>
						<div className='flex flex-col gap-2'>
							Jina
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							文档内容解析引擎
						</Label>
						<div className='flex flex-col gap-2'>MinerU</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
export default SettingPage;
