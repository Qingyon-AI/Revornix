import { cn } from '@/lib/utils';
import React from 'react';

const CalendarRecord = () => {
	const getMonthInfo = (year: number, month: number) => {
		// 创建一个 Date 对象
		const firstDay = new Date(year, month - 1, 1); // 月份从0开始，所以需要减1
		const daysInMonth = new Date(year, month, 0).getDate(); // 获取本月总天数
		const weekDay = firstDay.getDay(); // 获取本月第一天是周几 (0=周日, 1=周一, ..., 6=周六)

		return { daysInMonth, weekDay };
	};
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	// 获取当月信息
	const { daysInMonth, weekDay } = getMonthInfo(currentYear, currentMonth);

	// 创建日期数组（包括前面的空格占位）
	const dates: (number | null)[] = Array(weekDay)
		.fill(null)
		.concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

	// 每行显示 7 天
	const rows = [];
	for (let i = 0; i < dates.length; i += 7) {
		rows.push(dates.slice(i, i + 7));
	}

	const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	return (
		<div className='w-full h-full flex flex-col'>
			<div className='grid grid-cols-7'>
				{weekDays.map((day) => (
					<div key={day} className='p-2 text-center font-semibold'>
						{day}
					</div>
				))}
			</div>
			<div className="flex-1 grid grid-cols-7">
				{rows.map((week, rowIndex) => (
					<React.Fragment key={rowIndex}>
						{week.map((date, index) => (
							<div
								key={index}
								className={`rounded flex justify-center items-center ${
									date ? 'hover:bg-primary-foreground cursor-pointer' : ''
								}`}>
								{date}
							</div>
						))}
					</React.Fragment>
				))}
			</div>
		</div>
	);
};

export default CalendarRecord;
