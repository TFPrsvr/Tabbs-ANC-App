import Image from 'next/image';

interface CustomIconProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function CustomIcon({
  src,
  alt,
  className = '',
  width = 24,
  height = 24
}: CustomIconProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ width: 'auto', height: 'auto' }}
    />
  );
}
