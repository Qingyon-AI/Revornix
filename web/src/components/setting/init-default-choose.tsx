import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Label } from '../ui/label';
import RevornixAIModel from './revornix-ai-model';
import { Separator } from '../ui/separator';
import DocumentSummaryModel from './document-summary-model';
import { useUserContext } from '@/provider/user-provider';
import DefaultWebsiteDocumentParseEngineChange from './default-website-document-parse-engine-change';
import DefaultFileDocumentParseEngineChange from './default-file-document-parse-engine-change';
import DefaultFileSystemChange from './default-file-system-change';
import {
	hasCompletedRequiredUserSettings,
	type RequiredUserSettingField,
} from '@/lib/required-user-settings';
import { useDefaultResourceAccess } from '@/hooks/use-default-resource-access';

const InitDefaultChoose = () => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const {
		documentReaderModel,
		revornixModel,
		websiteParseEngine,
		fileParseEngine,
	} = useDefaultResourceAccess();
	const inaccessibleRequiredSettingFields: RequiredUserSettingField[] = [];
	if (
		!revornixModel.loading &&
		revornixModel.configured &&
		!revornixModel.accessible
	) {
		inaccessibleRequiredSettingFields.push('default_revornix_model_id');
	}
	if (
		!documentReaderModel.loading &&
		documentReaderModel.configured &&
		!documentReaderModel.accessible
	) {
		inaccessibleRequiredSettingFields.push(
			'default_document_reader_model_id',
		);
	}
	if (
		!websiteParseEngine.loading &&
		websiteParseEngine.configured &&
		!websiteParseEngine.accessible
	) {
		inaccessibleRequiredSettingFields.push(
			'default_website_document_parse_user_engine_id',
		);
	}
	if (
		!fileParseEngine.loading &&
		fileParseEngine.configured &&
		!fileParseEngine.accessible
	) {
		inaccessibleRequiredSettingFields.push(
			'default_file_document_parse_user_engine_id',
		);
	}
	const initFinished = hasCompletedRequiredUserSettings(
		mainUserInfo,
		inaccessibleRequiredSettingFields,
	);
	return (
		<>
			{!initFinished && (
				<div className='space-y-5'>
					<div
						className='flex justify-between items-center'
						id='default_user_file_system_change'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_file_system_page_current_user_file_system')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DefaultFileSystemChange />
						</div>
					</div>
					<Separator />
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
					<Separator />
					<div
						className='flex justify-between items-center'
						id='default_website_markdown_parse_user_engine_choose'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_engine_page_current_user_website_engine')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DefaultWebsiteDocumentParseEngineChange />
						</div>
					</div>
					<Separator />
					<div
						className='flex justify-between items-center'
						id='default_file_markdown_parse_user_engine_choose'>
						<Label className='flex flex-col gap-2 items-start'>
							{t('setting_engine_page_current_user_file_engine')}
						</Label>
						<div className='flex flex-col gap-2'>
							<DefaultFileDocumentParseEngineChange />
						</div>
					</div>
				</div>
			)}
			{initFinished && (
				<div className='bg-muted rounded p-5 py-12 flex flex-col justify-center items-center gap-5'>
					<CircleCheck className='size-28 text-muted-foreground' />
					<p className='text-muted-foreground text-sm'>{t('init_done')}</p>
				</div>
			)}
		</>
	);
};

export default InitDefaultChoose;
