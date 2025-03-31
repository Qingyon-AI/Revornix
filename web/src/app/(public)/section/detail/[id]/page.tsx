import SectionContainer from '@/components/section/section-container';
import { notFound } from 'next/navigation';

type Params = Promise<{
	id: string;
}>;

const SectionDetailPage = async ({ params }: { params: Params }) => {
	const { id } = await params;
	if (!id) return notFound();

	return <SectionContainer id={id} />;
};
export default SectionDetailPage;
