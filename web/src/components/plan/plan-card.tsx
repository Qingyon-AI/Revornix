'use client';

import { BadgeCheck, Info, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import QRCode from 'qrcode';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import {
	Dialog,
	DialogHeader,
	DialogTitle,
	DialogContent,
} from '@/components/ui/dialog';
import Image from 'next/image';
import WechatIcon from '@/components/icons/wechat-icon';
import AlipayIcon from '@/components/icons/alipay-icon';
import { DialogDescription } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { prePayProduct, getProductDetail } from '@/service/product';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { utils } from '@kinda/utils';
import { getOrderStatus } from '@/service/order';
import { useUserContext } from '@/provider/user-provider';
import { useCountDown, useInterval } from 'ahooks';
import { useGetSet } from 'react-use';
import { useQuery } from '@tanstack/react-query';
import { PayWay } from '@/enums/product';
import { useLocale, useTranslations } from 'next-intl';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '@/lib/utils';
import { PrePayProductResponseDTO } from '@/generated-pay';

export type IntroduceAbility = {
	name: string;
	name_zh: string;
	tag?: string;
};

const PlanCard = ({
	product_uuid,
	badge,
	introduction_abilities,
}: {
	product_uuid: string;
	badge?: string;
	introduction_abilities?: IntroduceAbility[];
}) => {
	const t = useTranslations();

	const [prepayBackData, setPrepayBackData] =
		useState<PrePayProductResponseDTO>();
	const [payWay, setPayWay] = useState<PayWay>();
	const [orderNo, setOrderNo] = useGetSet<string | null>(null);
	const [intervalTime, setIntervalTime] = useState<number>();
	const [targetTime, setTargetTime] = useState<number>();
	const [countdown] = useCountDown({
		targetDate: targetTime,
	});
	const alipayIframeBox = useRef<HTMLIFrameElement>(null);
	const [showPayDialog, setShowPayDialog] = useState(false);
	const [showScanCode, setShowScanCode] = useState(false);
	const { refreshMainUserInfo, mainUserInfo, refreshPaySystemInfo } =
		useUserContext();

	const locale = useLocale();

	const clean = useInterval(
		async () => {
			if (!orderNo()) return;
			const [res, err] = await utils.to(
				getOrderStatus({ order_no: orderNo()! })
			);
			if (err) {
				console.error(err);
				return;
			}
			if (res && res.status === 0) {
				clean();
				toast.success(t('account_plan_pay_success'));
				await utils.sleep(1000);
				await refreshMainUserInfo();
				await refreshPaySystemInfo();
				setShowPayDialog(false);
				setShowScanCode(false);
				setPrepayBackData(undefined);
				setPayWay(undefined);
				setTargetTime(undefined);
				setIntervalTime(undefined);
			}
		},
		intervalTime,
		{ immediate: false }
	);

	const { data: productDetail } = useQuery({
		queryKey: ['getProductDetail', product_uuid],
		queryFn: () => getProductDetail({ product_uuid }),
	});

	const generateQrCode = async (code: string) => {
		try {
			const dataUrl = await QRCode.toDataURL(code, {
				width: 200,
				margin: 1,
			});
			return { url: dataUrl };
		} catch (err) {
			console.error(err);
			toast.error(t('account_plan_code_generate_failed'));
			return { url: '' };
		}
	};

	const handlePrePayProduct = async (product_uuid: string, pay_way: number) => {
		setPayWay(pay_way);
		setShowScanCode(true);
		const [res, err] = await utils.to(
			prePayProduct({ product_uuid, pay_way, category: 'plan_subscribe' })
		);
		if (err || !res) {
			console.error(err);
			toast.error(err.message);
			setShowScanCode(false);
			setShowPayDialog(false);
			setPayWay(undefined);
			return;
		}
		setOrderNo(res.out_trade_no);
		if (pay_way === PayWay.WECHAT) {
			const qrCodeImageData = await generateQrCode(res.code);
			res.code = qrCodeImageData.url;
			setPrepayBackData(res);
			setTargetTime(Date.now() + 600000);
			setIntervalTime(1000);
		} else if (pay_way === PayWay.ALIPAY) {
			setPrepayBackData(res);
			await utils.sleep(100);
			if (alipayIframeBox.current) {
				alipayIframeBox.current.srcdoc = res.code;
			}
			setTargetTime(Date.now() + 600000);
			setIntervalTime(1000);
		}
	};
	return (
		<>
			<Dialog
				open={showScanCode}
				onOpenChange={(e) => {
					if (!e) {
						setShowScanCode(false);
						setPrepayBackData(undefined);
						setPayWay(undefined);
						setTargetTime(undefined);
						setIntervalTime(undefined);
					}
				}}>
				<DialogContent className='max-h-[80vh] overflow-auto'>
					<DialogHeader>
						<DialogTitle>{t('account_plan_pay_qr_code')}</DialogTitle>
						<DialogDescription className='text-muted-foreground text-sm'>
							{countdown != null && countdown !== 0 && (
								<>
									<span>{t('account_plan_pay_qr_code_description') + ' '}</span>
									<span className='font-bold'>
										{Math.round(countdown / 1000)}
									</span>
									<span>s</span>
								</>
							)}
						</DialogDescription>
					</DialogHeader>
					<div className='relative w-full'>
						{!prepayBackData && (
							<div className='flex flex-row justify-center items-center h-[200px]'>
								<Loader2 className='size-4 animate-spin' />
								<p>{t('account_plan_pay_qr_code_generating')}...</p>
							</div>
						)}
						{payWay == PayWay.WECHAT && prepayBackData && (
							<div className='size-[200px] relative rounded overflow-hidden shrink-0 mx-auto my-5'>
								<Image src={prepayBackData?.code} alt='qr code' fill />
							</div>
						)}
						{payWay == PayWay.ALIPAY && prepayBackData && (
							<iframe
								className='size-[200px] relative rounded overflow-hidden shrink-0 mx-auto my-5'
								ref={alipayIframeBox}></iframe>
						)}
						{prepayBackData && (
							<Table>
								<TableBody>
									<TableRow>
										<TableCell className='font-bold'>
											{t('account_plan_pay_subscribe_user')}
										</TableCell>
										<TableCell>{mainUserInfo?.nickname}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell className='font-bold'>
											{t('account_plan_pay_product')}
										</TableCell>
										<TableCell>{prepayBackData?.product_name}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell className='font-bold'>
											{t('account_plan_pay_price')}
										</TableCell>
										<TableCell>
											{'¥'}{' '}
											{prepayBackData?.price
												? (prepayBackData.price / 100).toFixed(2)
												: 'Loading...'}
										</TableCell>
									</TableRow>
								</TableBody>
							</Table>
						)}
						<Alert className='my-5 bg-amber-600/10 dark:bg-amber-600/15 text-amber-500 border-amber-500/50 dark:border-amber-600/50'>
							<ShieldAlert className='size-4' />
							<AlertDescription>
								{t('account_plan_pay_warning')}
							</AlertDescription>
						</Alert>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('account_plan_subscribe_plan')}</DialogTitle>
						<DialogDescription className='text-muted-foreground text-sm'>
							{t('account_plan_pay_way_choose_description')}
						</DialogDescription>
					</DialogHeader>
					<div className='w-full grid grid-cols-1 md:grid-cols-2 gap-5'>
						<Button
							className='relative'
							onClick={() => {
								if (productDetail?.id) {
									handlePrePayProduct(productDetail.uuid, PayWay.WECHAT);
								}
							}}>
							{t('account_plan_pay_way_wechat')}
							<Sparkles className='absolute top-0 right-0' />
							<WechatIcon />
						</Button>
						<Button
							onClick={() => {
								if (productDetail?.id) {
									handlePrePayProduct(productDetail.uuid, PayWay.ALIPAY);
								}
							}}>
							{t('account_plan_pay_way_alipay')}
							<AlipayIcon />
						</Button>
					</div>
					<div className='text-muted-foreground text-xs flex flex-row gap-1'>
						<Info size={15} />
						{t('account_plan_pay_way_choose_advice')}
					</div>
				</DialogContent>
			</Dialog>

			<Card
				className={cn(
					'flex flex-col relative',
					badge
						? 'ring-2 ring-indigo-500 bg-white dark:bg-zinc-900 shadow-lg transition'
						: ''
				)}>
				{badge && (
					<div className='absolute -top-3 right-4 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white shadow'>
						{badge}
					</div>
				)}
				<CardHeader>
					<CardTitle>
						{locale === 'zh' ? productDetail?.name_zh : productDetail?.name}
					</CardTitle>
				</CardHeader>
				<CardContent className='flex flex-col gap-5 flex-1'>
					<div>
						<span className='font-bold text-2xl'>
							{'¥'}{' '}
							{productDetail?.price
								? (productDetail.price / 100).toFixed(2)
								: t('account_plan_free')}
						</span>
						<span>/{t('account_plan_month')}</span>
					</div>
					<div className='flex flex-col gap-2 text-sm'>
						{introduction_abilities &&
							introduction_abilities.map((item, index) => {
								return (
									<div key={index} className='flex flex-row gap-1 items-center'>
										<BadgeCheck size={15} className='shrink-0' />
										{locale === 'zh' ? item.name_zh : item.name}
										{item.tag && <Badge variant={'outline'}>{item.tag}</Badge>}
									</div>
								);
							})}
					</div>
				</CardContent>
				<CardFooter>
					<Button
						className='w-full'
						disabled={!productDetail?.price}
						onClick={() => {
							setShowPayDialog(true);
						}}>
						{productDetail?.price
							? t('account_plan_subscribe')
							: t('account_plan_free')}
					</Button>
				</CardFooter>
			</Card>
		</>
	);
};

export default PlanCard;
