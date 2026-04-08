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
	DialogFooter,
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
					<div className='text-sm leading-6 text-muted-foreground'>
						{t('account_plan_custom_plan_description')}
					</div>
				</CardContent>
				<CardFooter>
					<Dialog>
						<DialogTrigger asChild>
							<Button className='w-full'>
								{t('account_plan_custom_plan_contact_wechat_customer_service')}
							</Button>
						</DialogTrigger>
						<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-md'>
							<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
								<DialogTitle>
									{t(
										'account_plan_custom_plan_contact_wechat_customer_service'
									)}
								</DialogTitle>
							</DialogHeader>
							<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
								<img
									src={'/images/wechatCustomerServiceCode.jpg'}
									className='mx-auto my-5 rounded'
									width={200}
									height={200}
									alt='wechatCustomerServiceCode'
								/>
								<p className='text-center text-sm'>
									{t(
										'account_plan_custom_plan_contact_wechat_customer_service_tips'
									)}
								</p>
							</div>
							<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4' />
						</DialogContent>
					</Dialog>
				</CardFooter>
			</Card>
		</>
	);
};

export default CustomPlan;
