'use client';

import { BadgeCheckIcon, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useUserContext } from '@/provider/user-provider';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { Stepper } from '../ui/stepper';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@/components/ui/drawer';
import InitMineModel from './init-mine-model';
import InitEngine from './init-engine';
import InitDefaultChoose from './init-default-choose';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const InitSettingDialog = () => {
	const t = useTranslations();
	const { userInfo } = useUserContext();
	const [showDialog, setShowDialog] = useState(false);
	const [needInitial, setNeedInitial] = useState(false);
	useEffect(() => {
		if (
			!userInfo?.default_document_reader_model_id ||
			!userInfo.default_file_document_parse_user_engine_id ||
			!userInfo.default_website_document_parse_user_engine_id ||
			!userInfo.default_revornix_model_id
		) {
			setNeedInitial(true);
		} else {
			setNeedInitial(false);
		}
	}, [userInfo]);

	const steps = [
		{ title: 'Step 1', description: t('init_setting_quick_set_step_1') },
		{ title: 'Step 2', description: t('init_setting_quick_set_step_2') },
	];

	const [currentStep, setCurrentStep] = useState(0);

	return (
		<>
			{needInitial && (
				<Alert>
					<Info />
					<div className='flex justify-between h-full'>
						<div className='flex-1'>
							<AlertTitle>{t('tip')}</AlertTitle>
							<AlertDescription>
								<p>{t('init_setting_alert')}</p>
								<div className='flex flex-row gap-3 flex-wrap'>
									<Link href={'/setting#default_file_markdown_parse_user_engine_choose'}>
										<Badge variant='secondary'>
											{userInfo?.default_file_document_parse_user_engine_id ? (
												<BadgeCheckIcon />
											) : (
												<Info className='text-red-500' />
											)}
											<span
												className={
													userInfo?.default_file_document_parse_user_engine_id
														? ''
														: 'text-red-500'
												}>
												{t('init_setting_file_convert_engine')}
											</span>
										</Badge>
									</Link>
									<Link href={'/setting#default_website_markdown_parse_user_engine_choose'}>
										<Badge variant='secondary'>
											{userInfo?.default_website_document_parse_user_engine_id ? (
												<BadgeCheckIcon />
											) : (
												<Info className='text-red-500' />
											)}
											<span
												className={
													userInfo?.default_website_document_parse_user_engine_id
														? ''
														: 'text-red-500'
												}>
												{t('init_setting_website_convert_engine')}
											</span>
										</Badge>
									</Link>
									<Link href={'/setting#default_document_summary_model_choose'}>
										<Badge variant='secondary'>
											{userInfo?.default_document_reader_model_id ? (
												<BadgeCheckIcon />
											) : (
												<Info className='text-red-500' />
											)}
											<span
												className={
													userInfo?.default_document_reader_model_id
														? ''
														: 'text-red-500'
												}>
												{t('init_setting_document_summary_model')}
											</span>
										</Badge>
									</Link>
									<Link href={'/setting#default_revornix_ai_model_choose'}>
										<Badge variant='secondary'>
											{userInfo?.default_revornix_model_id ? (
												<BadgeCheckIcon />
											) : (
												<Info className='text-red-500' />
											)}
											<span
												className={
													userInfo?.default_revornix_model_id
														? ''
														: 'text-red-500'
												}>
												{t('init_setting_revornix_ai_model')}
											</span>
										</Badge>
									</Link>
									<Link href={'/setting#default_user_file_system'}>
										<Badge variant='secondary'>
											{userInfo?.default_user_file_system ? (
												<BadgeCheckIcon />
											) : (
												<Info className='text-red-500' />
											)}
											<span
												className={
													userInfo?.default_user_file_system ? '' : 'text-red-500'
												}>
												{t('init_setting_default_file_system')}
											</span>
										</Badge>
									</Link>
								</div>
							</AlertDescription>
						</div>
						<div className='h-full flex justify-center items-center p-5'>
							<Button onClick={() => setShowDialog(true)}>
								{t('init_setting_quick_set')}
							</Button>
						</div>
					</div>
				</Alert>
			)}
			<Drawer open={showDialog} onOpenChange={setShowDialog}>
				<DrawerTrigger asChild></DrawerTrigger>
				<DrawerContent className='pb-5 min-h-[75vh]'>
					<DrawerHeader>
						<DrawerTitle>{t('init_setting_dialog_title')}</DrawerTitle>
						<DrawerDescription>
							{t('init_setting_dialog_description')}
						</DrawerDescription>
					</DrawerHeader>
					<Stepper
						steps={steps}
						currentStep={currentStep}
						onStepChange={(step) => {
							if (step === steps.length) {
								setShowDialog(false);
							} else {
								setCurrentStep(step);
							}
						}}
						className='mb-5'
					/>
					<div className='w-full max-w-3xl mx-auto'>
						{currentStep === 0 && (
							<div>
								<InitMineModel />
							</div>
						)}
						{currentStep === 1 && <InitDefaultChoose />}
					</div>
				</DrawerContent>
			</Drawer>
		</>
	);
};

export default InitSettingDialog;
