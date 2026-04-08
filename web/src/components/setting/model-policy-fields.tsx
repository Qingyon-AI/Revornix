'use client';

import { AccessPlanLevel } from '@/enums/product';
import { getPlanLevelTranslationKey } from '@/lib/subscription';
import { useTranslations } from 'next-intl';
import { FormField } from '../ui/form';
import { Input } from '../ui/input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { Switch } from '../ui/switch';

const ModelPolicyFields = ({
	form,
	disabled = false,
}: {
	form: any;
	disabled?: boolean;
}) => {
	const t = useTranslations();
	const officialHosted = Boolean(form.watch('is_official_hosted'));
	const computePointMultiplier = Number(
		form.watch('compute_point_multiplier') ?? 1,
	);

	return (
		<div className='space-y-3'>
			<FormField
				name='required_plan_level'
				control={form.control}
				render={({ field }) => (
					<div className='flex flex-row justify-between items-center gap-4 rounded-xl border border-input/70 bg-background/60 p-4'>
						<div className='min-w-0 space-y-1'>
							<div className='text-sm font-medium'>
								{t('setting_required_plan_level_label')}
							</div>
							<p className='text-xs text-muted-foreground'>
								{t('setting_required_plan_level_tips')}
							</p>
						</div>
						<Select
							disabled={disabled}
							value={String(field.value ?? AccessPlanLevel.FREE)}
							onValueChange={(value) => field.onChange(Number(value))}>
							<SelectTrigger className='min-w-0 w-fit'>
								<SelectValue
									placeholder={t('setting_required_plan_level_placeholder')}
								/>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{[
										AccessPlanLevel.FREE,
										AccessPlanLevel.PRO,
										AccessPlanLevel.MAX,
									].map((level) => (
										<SelectItem key={level} value={String(level)}>
											{t(getPlanLevelTranslationKey(level))}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				)}
			/>
			<div className='space-y-3 rounded-xl border border-input/70 bg-background/60 p-4'>
				<FormField
					name='is_official_hosted'
					control={form.control}
					render={({ field }) => (
						<div className='flex flex-row justify-between gap-4 items-center'>
							<div className='min-w-0 space-y-1'>
								<div className='text-sm font-medium'>
									{t('setting_official_hosted_label')}
								</div>
								<p className='text-xs text-muted-foreground'>
									{t('setting_official_hosted_tips')}
								</p>
							</div>
							<Switch
								disabled={disabled}
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						</div>
					)}
				/>
				{officialHosted && (
					<div className='flex flex-row justify-between gap-4 items-center'>
						<div className='min-w-0 space-y-1'>
							<div className='text-sm font-medium'>
								{t('setting_compute_point_multiplier_label')}
							</div>
							<p className='text-xs text-muted-foreground'>
								{t('setting_compute_point_multiplier_tips')}
							</p>
						</div>
						<FormField
							name='compute_point_multiplier'
							control={form.control}
							render={({ field }) => (
								<Input
									disabled={disabled}
									type='number'
									min='0.1'
									step='0.1'
									className='min-w-0 w-fit'
									value={field.value ?? 1}
									onChange={(e) => field.onChange(Number(e.target.value || 1))}
									placeholder={t(
										'setting_compute_point_multiplier_placeholder',
									)}
								/>
							)}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default ModelPolicyFields;
