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
import InitDone from './init-done';

const InitSettingDialog = () => {
	const { userInfo } = useUserContext();
	const [needInitial, setNeedInitial] = useState(false);
	useEffect(() => {
		if (
			!userInfo?.default_document_reader_model_id ||
			!userInfo.default_file_document_parse_engine_id ||
			!userInfo.default_website_document_parse_engine_id ||
			!userInfo.default_revornix_model_id
		) {
			setNeedInitial(true);
		} else {
			setNeedInitial(false);
		}
	}, [userInfo]);

	const steps = [
		{ title: 'Step 1', description: '模型供应' },
		{ title: 'Step 2', description: '引擎安装' },
		{ title: 'Step 3', description: '完成配置' },
	];

	const [currentStep, setCurrentStep] = useState(0);

	return (
		<>
			{needInitial && (
				<Alert>
					<Info />
					<div className='flex justify-between h-full'>
						<div className='flex-1'>
							<AlertTitle>提醒</AlertTitle>
							<AlertDescription>
								<p>
									你还没有完成初始化设置哦，请完成设置才能正常使用所有功能。
								</p>
								<div className='flex flex-row gap-3'>
									<Badge variant='secondary'>
										{userInfo?.default_document_reader_model_id ? (
											<BadgeCheckIcon />
										) : (
											<Info className='text-red-500' />
										)}
										默认文档分析模型
									</Badge>
									<Badge variant='secondary'>
										{userInfo?.default_file_document_parse_engine_id ? (
											<BadgeCheckIcon />
										) : (
											<Info className='text-red-500' />
										)}
										默认文件文档转化引擎
									</Badge>
									<Badge variant='secondary'>
										{userInfo?.default_website_document_parse_engine_id ? (
											<BadgeCheckIcon />
										) : (
											<Info className='text-red-500' />
										)}
										默认网站文档转化引擎
									</Badge>
									<Badge variant='secondary'>
										{userInfo?.default_revornix_model_id ? (
											<BadgeCheckIcon />
										) : (
											<Info className='text-red-500' />
										)}
										默认RevornixAI对话模型
									</Badge>
								</div>
							</AlertDescription>
						</div>
						<div className='h-full flex justify-center items-center p-5'>
							<Drawer>
								<DrawerTrigger asChild>
									<Button>设置</Button>
								</DrawerTrigger>
								<DrawerContent className='pb-5'>
									<DrawerHeader>
										<DrawerTitle>初始化设置</DrawerTitle>
										<DrawerDescription>
											通过初始化设置，你可以快速的准备好开始使用本产品的一切配置。
										</DrawerDescription>
									</DrawerHeader>
									<Stepper
										steps={steps}
										currentStep={currentStep}
										onStepChange={setCurrentStep}
										className='mb-5'
									/>
									<div className='w-full max-w-3xl mx-auto'>
										{currentStep === 0 && (
											<div>
												<InitMineModel />
											</div>
										)}
										{currentStep === 1 && (
											<div>
												<InitEngine />
											</div>
										)}
										{currentStep === 2 && <InitDone />}
									</div>
								</DrawerContent>
							</Drawer>
						</div>
					</div>
				</Alert>
			)}
		</>
	);
};

export default InitSettingDialog;
