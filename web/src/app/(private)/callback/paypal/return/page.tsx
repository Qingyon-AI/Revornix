'use client';

import { Card, CardContent } from '@/components/ui/card';
import { PayStatus } from '@/enums/order';
import { useUserContext } from '@/provider/user-provider';
import { getOrderDetailByPaypalOrder, getOrderStatus } from '@/service/order';
import { utils } from '@kinda/utils';
import { useQuery } from '@tanstack/react-query';
import { useInterval } from 'ahooks';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { CircleCheckIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

const PayPalReturnPage = () => {
	const searchParams = useSearchParams();
	const token = searchParams.get('token');

	const t = useTranslations();

	const [intervalTime, setIntervalTime] = useState<number | undefined>(1000);

	const { refreshMainUserInfo, mainUserInfo, refreshPaySystemInfo } =
		useUserContext();

	const { data: orderDetail, refetch } = useQuery({
		queryKey: ['getOrderDetailByPaypalOrder', token],
		queryFn: async () => {
			if (!token) return;
			return await getOrderDetailByPaypalOrder({
				paypal_order_id: token,
			});
		},
		enabled: !!token,
	});

	const clean = useInterval(
		async () => {
			if (!orderDetail) return;
			const [res_order_status, err_order_status] = await utils.to(
				getOrderStatus({ order_no: orderDetail.order_no })
			);
			if (err_order_status || !res_order_status) {
				console.error(err_order_status);
				return;
			}
			if (
				(res_order_status && res_order_status.status === PayStatus.COMPLETED) ||
				res_order_status.status === PayStatus.SUCCESS
			) {
				clean();
				refetch();
				await refreshMainUserInfo();
				await refreshPaySystemInfo();
				setIntervalTime(undefined);
			}
		},
		intervalTime,
		{ immediate: false }
	);

	return (
		<div className='px-5 flex flex-col h-full justify-center items-center gap-5'>
			{orderDetail?.status !== PayStatus.COMPLETED && (
				<div>{t('paypal_order_result_checking')}...</div>
			)}
			{orderDetail && orderDetail?.status === PayStatus.COMPLETED && (
				<div className='flex justify-center items-center gap-5 flex-col'>
					<CircleCheckIcon className='size-20' />
					{orderDetail?.status === PayStatus.COMPLETED &&
						t('paypal_order_result_success')}
				</div>
			)}
			{orderDetail && (
				<Card className='rounded-lg bg-muted shadow-none'>
					<CardContent>
						<Table>
							<TableBody>
								<TableRow>
									<TableCell className='font-bold'>{t('order_no')}</TableCell>
									<TableCell align='right'>{orderDetail?.order_no}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className='font-bold'>
										{t('product_name')}
									</TableCell>
									<TableCell align='right'>
										{orderDetail?.product.name}
									</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className='font-bold'>{t('pay_price')}</TableCell>
									<TableCell align='right'>
										{orderDetail.price.currency_code} {orderDetail.price.price}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default PayPalReturnPage;
