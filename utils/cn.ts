/**
 * Utility - Class Names
 * Helper for conditional class names
 */

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes
    .filter(Boolean)
    .join(' ');
}

export type ClassNameValue = string | boolean | undefined | null | ClassNameValue[];
export type ClassNames = Record<string, ClassNameValue>;

export function classNames(...classes: ClassNameValue[]): string;
export function classNames(classes: ClassNames): string;
export function classNames(...args: any[]): string {
  if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
    // Object form: { 'class': true, 'class-2': false }
    const classes: ClassNames = args[0];
    return Object.entries(classes)
      .filter(([_, value]) => Boolean(value))
      .map(([key]) => key)
      .join(' ');
  }
  
  // Array form
  return cn(...args);
}
