'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';

interface ModelConfig {
	api_key: string;
	provider: string;
	description: string;
	is_active: boolean;
	api_base: string;
}

const formSchema = z.object({
	api_key: z.string().min(1, 'API Key is required'),
	provider: z.string().min(1, 'Provider is required'),
	description: z.string().min(1, 'Description is required'),
	is_active: z.boolean(),
	api_base: z.string().optional(),
});

const ModelSettingPage = () => {
	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			api_key: '',
			provider: '',
			description: '',
			is_active: false,
			api_base: '',
		},
	});
	const [showModelConfigDialog, setShowModelConfigDialog] = useState(false);
	const [currentConfig, setCurrentConfig] = useState<ModelConfig | null>(null);
	return (
		<>
			<Dialog
				open={showModelConfigDialog}
				onOpenChange={setShowModelConfigDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{currentConfig?.provider}</DialogTitle>
						<DialogDescription>{currentConfig?.description}</DialogDescription>
					</DialogHeader>
					<div>
						<Form {...form}>
							<form className='flex flex-col gap-5'>
								<FormField
									control={form.control}
									name='api_key'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-2'>API Key</FormLabel>
												<Input
													type='password'
													className='col-span-10'
													placeholder='API Key'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='api_base'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-2'>API Base</FormLabel>
												<Input
													className='col-span-10'
													placeholder='API Base'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='is_active'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-2'>是否激活</FormLabel>
												<div className='col-span-10 flex justify-end space-x-2'>
													<Switch
														className='mr-0'
														checked={field.value}
														onCheckedChange={field.onChange}
													/>
												</div>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type='submit'>保存</Button>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>
			<div className='px-5 pb-5'>
				<Card className='flex gap-5 flex-col px-5'>
					<div className='flex justify-between items-center'>
						<h2 className='font-bold'>Open AI</h2>
						<Button
							onClick={() => {
								setCurrentConfig({
									api_key: '',
									provider: 'Open AI',
									description: 'Open AI',
									is_active: true,
									api_base: '',
								});
								setShowModelConfigDialog(true);
							}}>
							APIKEY配置
						</Button>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<h2 className='font-bold'>Moonshot</h2>
						<Button>APIKEY配置</Button>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<h2 className='font-bold'>Ollama</h2>
						<Button>APIKEY配置</Button>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<h2 className='font-bold'>DeepSeek</h2>
						<Button>APIKEY配置</Button>
					</div>
				</Card>
			</div>
		</>
	);
};

export default ModelSettingPage;
