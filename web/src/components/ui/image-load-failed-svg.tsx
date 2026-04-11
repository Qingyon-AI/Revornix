'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

const drawRoundedRect = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) => {
	const r = Math.min(radius, width / 2, height / 2);
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + width, y, x + width, y + height, r);
	ctx.arcTo(x + width, y + height, x, y + height, r);
	ctx.arcTo(x, y + height, x, y, r);
	ctx.arcTo(x, y, x + width, y, r);
	ctx.closePath();
};

const ImageLoadFailedSvg = ({
	className,
	title = 'Image failed to load',
}: {
	className?: string;
	title?: string;
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const dpr = window.devicePixelRatio || 1;
		const width = 220;
		const height = 160;

		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.scale(dpr, dpr);
		ctx.clearRect(0, 0, width, height);
		ctx.strokeStyle = 'rgba(115,115,115,0.68)';
		ctx.lineWidth = 6;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		drawRoundedRect(ctx, 64, 28, 88, 104, 18);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(117, 28);
		ctx.lineTo(152, 63);
		ctx.moveTo(117, 28);
		ctx.lineTo(117, 52);
		ctx.arcTo(117, 63, 128, 63, 11);
		ctx.lineTo(152, 63);
		ctx.stroke();

		ctx.strokeStyle = 'rgba(115,115,115,0.22)';
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.moveTo(78, 110);
		ctx.lineTo(95, 93);
		ctx.lineTo(107, 105);
		ctx.lineTo(130, 82);
		ctx.stroke();

		ctx.fillStyle = 'rgba(115,115,115,0.18)';
		ctx.beginPath();
		ctx.arc(89, 66, 7, 0, Math.PI * 2);
		ctx.fill();

		ctx.strokeStyle = 'rgba(115,115,115,0.72)';
		ctx.lineWidth = 7;
		ctx.beginPath();
		ctx.moveTo(58, 36);
		ctx.lineTo(158, 136);
		ctx.stroke();
	}, []);

	return (
		<canvas
			ref={canvasRef}
			role='img'
			aria-label={title}
			className={cn('block h-auto w-full max-w-[220px]', className)}
		/>
	);
};

export default ImageLoadFailedSvg;
