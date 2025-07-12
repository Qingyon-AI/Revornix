'use client';

import { ModeToggle } from '@/components/app/mode-toggle';
import NotificationTaskManage from '@/components/notification/notification-task-manage';
import NotificationSourceManage from '@/components/notification/notification-source-manage';
import NotificationTargetManage from '@/components/notification/notification-target-manage';
import DefaultDocumentParseEngineChange from '@/components/setting/default-document-parse-engine-change';
import DocumentSummaryModel from '@/components/setting/document-summary-model';
import EngineManager from '@/components/setting/engine-manager';
import LanguageChange from '@/components/setting/language-change';
import MCPServerManage from '@/components/setting/mcp-server-manage';
import ModelCollection from '@/components/setting/model-collection';
import RevornixAIModel from '@/components/setting/revornix-ai-model';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useUserContext } from '@/provider/user-provider';
import { useTranslations } from 'next-intl';
import DefaultDocumentReadMarkReasonChoose from '@/components/setting/default-document-read-mark-reason-choose';

const SettingPage = () => {
	const t = useTranslations();
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
				{t('setting_document')}
			</h2>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_document_default_document_read_mark_reason')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DefaultDocumentReadMarkReasonChoose />
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
							{t('setting_notification_task_manage')}
						</Label>
						<div className='flex flex-col gap-2'>
							<NotificationTaskManage />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_notification_source_manage')}
						</Label>
						<div className='flex flex-col gap-2'>
							<NotificationSourceManage />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_notification_target_manage')}
						</Label>
						<div className='flex flex-col gap-2'>
							<NotificationTargetManage />
						</div>
					</div>
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
					<div
						className='flex justify-between items-center'
						id='default_document_summary_model_choose'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_document_summary_model')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DocumentSummaryModel />
						</div>
					</div>
				</CardContent>
			</Card>
			<h2 className='text-xs text-muted-foreground p-3'>
				{t('setting_engine_label')}
			</h2>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_engine_manage')}
						</Label>
						<div className='flex flex-col gap-2'>
							<EngineManager />
						</div>
					</div>
					<Separator />
					<div
						className='flex justify-between items-center'
						id='default_markdown_parse_engine_choose'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_default_markdown_parse_engine')}
							<p className='text-muted-foreground text-xs'>
								{t('setting_engine_tip')}
							</p>
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
					<div
						className='flex justify-between items-center'
						id='default_revornix_ai_model_choose'>
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
