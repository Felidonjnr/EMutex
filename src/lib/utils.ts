import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(name: string): string {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')    // Replace any non-alphanumeric character with a hyphen
    .replace(/-+/g, '-')             // Replace multiple hyphens with a single hyphen
    .replace(/^-+/, '')              // Remove leading hyphens
    .replace(/-+$/, '');             // Remove trailing hyphens
}

export function formatDate(date: Date | string | number) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function getWhatsAppUrl(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}/?text=${encodedMessage}`;
}
