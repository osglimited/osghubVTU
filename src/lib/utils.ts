import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hashPin(pin: string): string {
  return btoa(pin);
}

export function verifyPin(pin: string, hash: string): boolean {
  return btoa(pin) === hash;
}
