'use client';

import {
	EngineBillingMode,
	EngineBillingModeList,
} from '@/enums/engine-billing';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';
import { FormField } from '../ui/form';
import { Input } from '../ui/input';
import { useTranslations } from 'next-intl';

const EngineBillingPolicyFields = ({
	form,
	disabled = false,
}: {
	form: any;
	disabled?: boolean;
}) => {
	const t = useTranslations();
	const isOfficialHosted = Boolean(form.watch('is_official_hosted'));
	const billingMode = Number(
		form.watch('billing_mode') ?? EngineBillingMode.TOKEN,
	) as EngineBillingMode;
	const billingUnitPrice = Number(form.watch('billing_unit_price') ?? 1);
	const computePointMultiplier = Number(
		form.watch('compute_point_multiplier') ?? 1,
	);

	return (
		<div className='rounded-xl border border-input/70 bg-background/60 p-4'>
			<FormField
				name='is_official_hosted'
				control={form.control}
				render={({ field }) => (
					<div className='flex flex-row justify-between gap-3 items-center'>
						<div className='space-y-1'>
							<div className='text-sm font-medium'>
								{t('setting_official_hosted_label')}
							</div>
							<p className='text-xs text-muted-foreground'>
								{t('setting_official_hosted_tips')}
							</p>
						</div>
						<div className='flex justify-start md:justify-end'>
							<Switch
								disabled={disabled}
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						</div>
					</div>
				)}
			/>
			{isOfficialHosted && (
				<div className='mt-4 space-y-4 border-t border-input/70 pt-4'>
					<FormField
						name='billing_mode'
						control={form.control}
						render={({ field }) => (
							<div className='flex flex-row justify-between items-center gap-3'>
								<div className='space-y-1'>
									<div className='text-sm font-medium'>
										{t('setting_engine_billing_mode_label')}
									</div>
									<p className='text-xs text-muted-foreground'>
										{t(
											`setting_engine_billing_mode_${billingMode}_description`,
										)}
									</p>
								</div>
								<Select
									disabled={disabled}
									value={String(field.value ?? EngineBillingMode.TOKEN)}
									onValueChange={(value) => field.onChange(Number(value))}>
									<SelectTrigger className='w-fit'>
										<SelectValue
											placeholder={t('setting_engine_billing_mode_placeholder')}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{EngineBillingModeList.map((mode) => (
												<SelectItem key={mode} value={String(mode)}>
													{t(`setting_engine_billing_mode_${mode}`)}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
						)}
					/>
					<div className='border-t border-input/70' />
					<FormField
						name='billing_unit_price'
						control={form.control}
						render={({ field }) => (
							<div className='flex flex-row justify-between gap-3 items-center'>
								<div className='space-y-1'>
									<div className='text-sm font-medium'>
										{t('setting_engine_billing_unit_price_label')}
									</div>
									<p className='text-xs text-muted-foreground'>
										{t('setting_engine_billing_unit_price_hint', {
											unit: t(
												`setting_engine_billing_mode_${billingMode}_unit`,
											),
										})}
									</p>
								</div>
								<Input
									className='w-fit'
									disabled={disabled}
									type='number'
									min='0.1'
									step='0.1'
									value={field.value ?? 1}
									onChange={(e) => field.onChange(Number(e.target.value || 1))}
									placeholder={t(
										'setting_engine_billing_unit_price_placeholder',
									)}
								/>
							</div>
						)}
					/>
					<div className='border-t border-input/70' />
					<FormField
						name='compute_point_multiplier'
						control={form.control}
						render={({ field }) => (
							<div className='flex flex-row justify-between gap-3 items-center'>
								<div className='space-y-1'>
									<div className='text-sm font-medium'>
										{t('setting_compute_point_multiplier_label')}
									</div>
									<p className='text-xs text-muted-foreground'>
										{t('setting_compute_point_multiplier_tips')}
									</p>
								</div>
								<Input
									className='w-fit'
									disabled={disabled}
									type='number'
									min='0.1'
									step='0.1'
									value={field.value ?? 1}
									onChange={(e) => field.onChange(Number(e.target.value || 1))}
									placeholder={t(
										'setting_compute_point_multiplier_placeholder',
									)}
								/>
							</div>
						)}
					/>
					<div className='border-t border-input/70' />
					<div className='flex flex-row justify-between gap-3 rounded-lg border border-dashed border-input/70 bg-muted/40 p-3 items-start'>
						<div className='space-y-1'>
							<div className='text-sm font-medium'>
								{t('setting_engine_billing_preview_label')}
							</div>
							<p className='text-xs leading-5 text-muted-foreground'>
								{t('setting_engine_billing_preview_formula', {
									unit_price: billingUnitPrice || 1,
									unit: t(`setting_engine_billing_mode_${billingMode}_unit`),
									multiplier: computePointMultiplier || 1,
								})}
							</p>
						</div>
						<div className='rounded-xl border border-input/70 bg-background/80 px-4 py-3 text-sm font-medium md:text-right'>
							{t('setting_engine_billing_preview_compact', {
								unit_price: billingUnitPrice || 1,
								unit: t(`setting_engine_billing_mode_${billingMode}_unit`),
								multiplier: computePointMultiplier || 1,
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default EngineBillingPolicyFields;
