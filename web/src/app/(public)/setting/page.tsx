'use client';

import { ModeToggle } from '@/components/app/mode-toggle';
import DailyReportStatus from '@/components/setting/daily-report-status';
import DailyReportTime from '@/components/setting/daily-report-time';
import DefaultDocumentParseEngineChange from '@/components/setting/default-document-parse-engine-change';
import DefaultWebsiteCrawlEngineChange from '@/components/setting/default-website-crawl-engine-change';
import DocumentSummaryModel from '@/components/setting/document-summary-model';
import LanguageChange from '@/components/setting/language-change';
import MCPServerManage from '@/components/setting/mcp-server-manage';
import ModelCollection from '@/components/setting/model-collection';
import RevornixAIModel from '@/components/setting/revornix-ai-model';
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
			<h2 className='text-xs text-muted-foreground p-3'>
				{t('setting_base_config')}
			</h2>
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
			<h2 className='text-xs text-muted-foreground p-3'>
				{t('setting_notification')}
			</h2>
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
			<h2 className='text-xs text-muted-foreground p-3'>
				{t('setting_model')}
			</h2>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_model_collection')}
						</Label>
						<div className='flex flex-col gap-2'>
							<ModelCollection />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_document_summary_model')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DocumentSummaryModel />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_website_craw_model')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DefaultWebsiteCrawlEngineChange />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_file_extract_model')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DefaultDocumentParseEngineChange />
						</div>
					</div>
				</CardContent>
			</Card>
			<h2 className='text-xs text-muted-foreground p-3'>
				{t('setting_revornix_ai')}
			</h2>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_revornix_model')}
						</Label>
						<div className='flex flex-col gap-2'>
							<RevornixAIModel />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('mcp_server_manage')}
						</Label>
						<div className='flex flex-col gap-2'>
							<MCPServerManage />
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
export default SettingPage;
