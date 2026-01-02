'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';

const CustomPlan = () => {
	const t = useTranslations();
	return (
		<>
			<Card className='flex flex-col'>
				<CardHeader>
					<CardTitle>{t('account_plan_custom_plan')}</CardTitle>
				</CardHeader>
				<CardContent className='flex flex-col gap-5 flex-1'>
					<div>
						<span className='font-bold text-2xl'>
							{t('account_plan_pay_price_custom')}
						</span>
						<span>/{t('account_plan_month')}</span>
					</div>
					<div>{t('account_plan_custom_plan_description')}</div>
				</CardContent>
				<CardFooter>
					<Dialog>
						<DialogTrigger asChild>
							<Button className='w-full'>
								{t('account_plan_custom_plan_contact_wechat_customer_service')}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{t(
										'account_plan_custom_plan_contact_wechat_customer_service'
									)}
								</DialogTitle>
							</DialogHeader>
							<img
								src={'/images/wechatCustomerServiceCode.jpg'}
								className='rounded mx-auto my-5'
								width={200}
								height={200}
								alt='wechatCustomerServiceCode'
							/>
							<p className='text-center text-sm'>
								{t(
									'account_plan_custom_plan_contact_wechat_customer_service_tips'
								)}
							</p>
						</DialogContent>
					</Dialog>
				</CardFooter>
			</Card>
		</>
	);
};

export default CustomPlan;
