import PassWordUpdate from '@/components/user/password-update';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import EmailBind from '@/components/user/email-bind';
import AvatarUpdate from '@/components/user/avatar-update';
import NicknameUpdate from '@/components/user/nickname-update';
import SloganUpdate from '@/components/user/slogan-update';
import DeleteUserButton from '@/components/user/delete-user-button';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const AccountPage = async () => {
	return (
		<div className='px-5 pb-5'>
			<Card>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							头像
							<div className='text-[0.8rem] text-muted-foreground'>
								这可是你的头像哦
							</div>
						</Label>
						<div className='flex flex-col gap-2'>
							<AvatarUpdate />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							昵称
							<div className='text-[0.8rem] text-muted-foreground'>
								这可是你的昵称哦
							</div>
						</Label>
						<div className='flex flex-col gap-2'>
							<NicknameUpdate />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							个性签名
							<div className='text-[0.8rem] text-muted-foreground'>
								将会展示在你的主页
							</div>
						</Label>
						<div className='flex flex-col gap-2'>
							<SloganUpdate />
						</div>
					</div>
				</CardContent>
			</Card>
			<Card className='mt-5'>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							邮箱
							<div className='text-[0.8rem] text-muted-foreground'>
								可作为登录方式
							</div>
						</Label>
						<div className='flex flex-col gap-2'>
							<EmailBind />
						</div>
					</div>
					<Separator />
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							密码
							<div className='text-[0.8rem] text-muted-foreground'>
								可通过邮箱+密码的方式登录账号
							</div>
						</Label>
						<div className='flex flex-col gap-2'>
							<PassWordUpdate />
						</div>
					</div>
				</CardContent>
			</Card>
			<Card className='mt-5'>
				<CardContent className='space-y-5'>
					<div className='flex justify-between items-center'>
						<Label className='flex flex-col gap-2 items-start'>
							开发APIKey
							<div className='text-[0.8rem] text-muted-foreground'>
								通过APIKey来解锁平台个性化能力
							</div>
						</Label>
						<div className='flex flex-col gap-2'>
							<Link href={'/account/apikey'}>
								<Button variant={'outline'}>前往配置</Button>
							</Link>
						</div>
					</div>
				</CardContent>
			</Card>
			<div className='mt-5'>
				<DeleteUserButton />
			</div>
		</div>
	);
};

export default AccountPage;
