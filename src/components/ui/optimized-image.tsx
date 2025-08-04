"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "./loading-skeleton";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  sizes?: string;
  fill?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  fallbackSrc = "/images/placeholder.png",
  priority = false,
  quality = 75,
  placeholder = "empty",
  blurDataURL,
  sizes,
  fill = false,
  objectFit = "cover",
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
    onError?.();
  }, [currentSrc, fallbackSrc, onError]);

  const imageProps = {
    src: currentSrc,
    alt,
    onLoad: handleLoad,
    onError: handleError,
    priority,
    quality,
    placeholder,
    blurDataURL,
    sizes,
    className: cn(
      "transition-opacity duration-300",
      isLoading ? "opacity-0" : "opacity-100",
      className
    ),
    style: {
      objectFit,
    },
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <Skeleton 
          className={cn(
            "absolute inset-0 z-10",
            fill ? "w-full h-full" : "",
            width && height ? `w-[${width}px] h-[${height}px]` : ""
          )} 
        />
      )}
      
      {fill ? (
        <Image
          {...imageProps}
          fill
        />
      ) : (
        <Image
          {...imageProps}
          width={width}
          height={height}
        />
      )}
      
      {hasError && currentSrc === fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg
              className="w-8 h-8 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">Image not available</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Avatar component with optimized image loading
interface AvatarProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
  className?: string;
}

export function Avatar({ 
  src, 
  alt, 
  size = "md", 
  fallback, 
  className 
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const sizePx = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  if (!src) {
    return (
      <div className={cn(
        "rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium",
        sizeClasses[size],
        className
      )}>
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={cn("rounded-full overflow-hidden", sizeClasses[size], className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={sizePx[size]}
        height={sizePx[size]}
        className="rounded-full"
        objectFit="cover"
        fallbackSrc="/images/default-avatar.png"
      />
    </div>
  );
}

// Logo component with optimized loading
interface LogoProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export function Logo({ 
  src, 
  alt, 
  width = 120, 
  height = 40, 
  className,
  priority = false 
}: LogoProps) {
  if (!src) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded",
        className
      )} style={{ width, height }}>
        {alt.split(' ').map(word => word.charAt(0)).join('').toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={90}
      objectFit="contain"
    />
  );
}

// Utility function to generate blur data URL
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Create a simple gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL();
}

// Image upload component with optimization
interface ImageUploadProps {
  onUpload: (file: File) => void;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
  children?: React.ReactNode;
}

export function ImageUpload({
  onUpload,
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className,
  children
}: ImageUploadProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      alert(`Please select a valid image file (${acceptedTypes.join(', ')})`);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    onUpload(file);
  };

  return (
    <label className={cn("cursor-pointer", className)}>
      <input
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      {children || (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <svg
            className="w-8 h-8 mx-auto mb-2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600">Click to upload image</p>
          <p className="text-xs text-gray-400">Max {maxSize}MB</p>
        </div>
      )}
    </label>
  );
}