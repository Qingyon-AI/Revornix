'use client';

import { getOrderDetailByPaypalOrder } from '@/service/order';
import { useQuery } from '@tanstack/react-query';
import { CircleXIcon } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useTranslations } from 'next-intl';

const PayPalCancelPage = () => {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const token = searchParams.get('token');

	const { data: orderDetail } = useQuery({
		queryKey: ['getOrderDetailByPaypalOrder', token],
		queryFn: async () => {
			if (!token) return;
			return await getOrderDetailByPaypalOrder({
				paypal_order_id: token,
			});
		},
		enabled: !!token,
	});

	return (
		<div className='px-5 flex h-full justify-center items-center flex-col'>
			<div className='flex justify-center items-center gap-5 flex-col mb-5'>
				<CircleXIcon className='size-20' />
				{t('paypal_order_callback_cancel')}
			</div>
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
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default PayPalCancelPage;
