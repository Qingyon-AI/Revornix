import UserContainer from '@/components/user/user-container';

type Params = Promise<{ id: string }>;

const UserDetailPage = async ({ params }: { params: Params }) => {
	const { id } = await params;
	return <UserContainer id={Number(id)} />;
};

export default UserDetailPage;
