const NotFound = () => {
	return (
		<div className='flex flex-col items-center justify-center h-screen'>
			<h1 className='text-2xl font-bold'>Document not found</h1>
			<p className='text-gray-500'>
				The document you are looking for does not exist.
			</p>
			<a href='/' className='mt-4 text-blue-500 hover:underline'>
				Go back to home
			</a>
		</div>
	);
};

export default NotFound;
