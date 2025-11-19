import { UserSectionAuthority } from '@/enums/section';
import { getQueryClient } from '@/lib/get-query-client';
import { addSectionUser } from '@/service/section';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { searchUser } from '@/service/user';
import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useRouter } from 'nextjs-toploader/app';
import z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField } from '../ui/form';
import { Separator } from '../ui/separator';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import SectionMember from './section-member';
import SectionSubscriber from './section-subscriber';

const SectionShare = ({ section_id }: { section_id: number }) => {
	const t = useTranslations();
	const queryClient = getQueryClient();

	const formSchema = z.object({
		user_id: z.number(),
		section_id: z.number(),
		authority: z.number(),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			section_id: section_id,
			authority: UserSectionAuthority.READ_ONLY,
		},
	});

	const router = useRouter();

	const [keyword, setKeyword] = useState('');
	const [open, setOpen] = useState(false);

	const {
		data: userPages,
		isFetchingNextPage,
		isFetching,
		fetchNextPage,
		hasNextPage,
	} = useInfiniteQuery({
		queryKey: ['searchUser', keyword],
		queryFn: (pageParam) => searchUser({ ...pageParam.pageParam }),
		initialPageParam: {
			filter_name: 'nickname',
			filter_value: keyword,
			limit: 20,
		},
		getNextPageParam: (lastPage) => {
			return lastPage.has_more
				? {
						start: lastPage.next_start,
						limit: lastPage.limit,
						filter_value: keyword,
						filter_name: 'nickname',
				  }
				: undefined;
		},
		staleTime: 0, // ❌ 不认为缓存是新鲜的（始终重新请求）
	});

	const users = userPages?.pages.flatMap((page) => page.elements) ?? [];

	const mutateAddSectionUser = useMutation({
		mutationFn: addSectionUser,
		onError(error, variables, onMutateResult, context) {
			console.error(error, variables, onMutateResult, context);
			toast.error(error.message);
		},
		onSuccess(data, variables, onMutateResult, context) {
			toast.success(t('section_share_user_add_success'));
			form.reset();
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey[0] === 'getSectionMembers' &&
						query.queryKey[1] === section_id
					);
				},
			});
			queryClient.invalidateQueries({
				queryKey: ['getSectionDetail', section_id],
			});
		},
	});

	const onSubmitForm = async (event: React.FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onFormValidateSuccess, onFormValidateError)(event);
	};

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		mutateAddSectionUser.mutate(values);
	};

	const onFormValidateError = (error: any) => {
		toast.error(t('form_validate_failed'));
		console.error(error);
	};

	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					fetchNextPage();
				}
			},
			{
				rootMargin: '100px', // 提前100px加载
			}
		);

		if (loadMoreRef.current) {
			observer.observe(loadMoreRef.current);
		}

		return () => {
			if (loadMoreRef.current) {
				observer.unobserve(loadMoreRef.current);
			}
		};
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	return (
		<div className='flex flex-col gap-5 flex-1'>
			<Form {...form}>
				<form
					onSubmit={onSubmitForm}
					id='add-form'
					className='flex flex-row gap-2 items-center w-full relative'>
					<FormField
						name='user_id'
						control={form.control}
						render={({ field }) => {
							return (
								// 必须model={true} 防止dialog内部的popover被外层dialog锁住无法滚动
								<Popover open={open} onOpenChange={setOpen} modal={true}>
									<PopoverTrigger asChild>
										<Button
											variant='outline'
											role='combobox'
											className='flex flex-row justify-between flex-1 overflow-hidden'>
											<span
												className={cn('truncate flex-1 text-left', {
													'text-muted-foreground font-normal': !field.value,
												})}>
												{field.value
													? users.find((user) => user.id == field.value)
															?.nickname
													: t('section_share_user_search')}
											</span>
											<ChevronsUpDown className='opacity-50 flex-shrink-0 ml-2' />
										</Button>
									</PopoverTrigger>
									<PopoverContent align={'start'} className='p-0'>
										<Command shouldFilter={false}>
											<CommandInput
												placeholder={t('section_share_user_search_placeholder')}
												className='h-9'
												onValueChange={(value) => {
													setKeyword(value); // 直接更新输入框，不触发请求
												}}
											/>
											<CommandList>
												{isFetching && <Skeleton className='w-full h-12' />}
												{!isFetching && users && users.length === 0 && (
													<CommandEmpty>
														{t('section_share_user_search_empty')}
													</CommandEmpty>
												)}
												{!isFetching && users && users.length > 0 && (
													<>
														{users.map((user, index) => {
															const isLast = index === users.length - 1;
															return (
																<CommandItem
																	key={user.id}
																	ref={isLast ? loadMoreRef : null}
																	value={user.id.toString()}
																	onSelect={(currentValue) => {
																		field.onChange(Number(currentValue));
																		setOpen(false);
																	}}>
																	<Avatar
																		className='size-5'
																		title={user.nickname ?? 'unknow name'}
																		onClick={(e) => {
																			e.preventDefault();
																			e.stopPropagation();
																			router.push(`/user/detail/${user.id}`);
																		}}>
																		<AvatarImage
																			src={user.avatar}
																			alt='avatar'
																		/>
																		<AvatarFallback>
																			{user.nickname}
																		</AvatarFallback>
																	</Avatar>
																	<p className='text-xs ml-2'>
																		{user.nickname}
																	</p>
																	<Check
																		className={cn(
																			'ml-auto',
																			field.value == user.id
																				? 'opacity-100'
																				: 'opacity-0'
																		)}
																	/>
																</CommandItem>
															);
														})}

														{isFetchingNextPage && (
															<div className='p-3 text-center text-xs text-muted-foreground'>
																{t('loading')}...
															</div>
														)}
													</>
												)}
											</CommandList>
										</Command>
									</PopoverContent>
								</Popover>
							);
						}}
					/>

					<FormField
						name='authority'
						control={form.control}
						render={({ field }) => {
							return (
								<Select
									value={field.value.toString()}
									onValueChange={field.onChange}>
									<SelectTrigger>
										<SelectValue
											placeholder={t('section_share_user_authority')}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value='0'>
												{t('section_share_user_authority_full_access')}
											</SelectItem>
											<SelectItem value='1'>
												{t('section_share_user_authority_w_and_r')}
											</SelectItem>
											<SelectItem value='2'>
												{t('section_share_user_authority_r_only')}
											</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							);
						}}
					/>
					<Button form='add-form' type='submit'>
						{t('section_share_user_invite')}
					</Button>
				</form>
			</Form>
			<div>
				<Separator className='mb-5' />
				<SectionMember section_id={section_id} />
			</div>
			<div>
				<Separator className='mb-5' />
				<SectionSubscriber section_id={section_id} />
			</div>
		</div>
	);
};

export default SectionShare;
