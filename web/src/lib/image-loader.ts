export const customImageLoader = ({ src, width, quality }: { src: string | File, width?: number, quality?: number }) => {
    return `${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${src}`
}