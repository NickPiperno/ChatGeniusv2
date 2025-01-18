'use client'

import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ColoredAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function ColoredAvatar({ name, size = 'md' }: ColoredAvatarProps) {
  const color = stringToColor(name);
  const initials = getInitials(name);
  
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white',
        sizeClasses[size]
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
} 