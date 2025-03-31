export interface PaginationData<T> {
    total_elements: number;
    current_page_elements: number;
    total_pages: number;
    page_num: number;
    page_size: number;
    elements: T[];
};