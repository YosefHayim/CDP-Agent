# Styling Patterns

> **CSS and styling conventions** - Tailwind, design tokens, responsive design.

---

## Tailwind CSS Conventions

### Consistent Spacing Scale

```tsx
// DO: Use consistent spacing (4 = 1rem = 16px)
<div className="p-4 m-2 gap-4">

// DON'T: Use arbitrary values without reason
<div className="p-[13px]">  // Why 13px specifically?
```

### Design System Colors

```tsx
// DO: Use semantic color names
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// DON'T: Use raw color values
<button className="bg-blue-500 text-white">
```

### Extract Repeated Patterns

```tsx
// DO: Create reusable style variables
const cardStyles = "rounded-lg border bg-card p-6 shadow-sm";
const buttonBase = "inline-flex items-center justify-center rounded-md text-sm font-medium";

// DON'T: Repeat long class strings
<div className="rounded-lg border bg-card p-6 shadow-sm">
<div className="rounded-lg border bg-card p-6 shadow-sm">
<div className="rounded-lg border bg-card p-6 shadow-sm">
```

---

## Class Merging with cn()

Use the `cn()` utility for conditional and merged classes:

```tsx
import { cn } from '@/lib/utils';

// Basic usage
<div className={cn('base-class', className)}>

// Conditional classes
<button className={cn(
  'base-button-styles',
  isActive && 'bg-primary',
  isDisabled && 'opacity-50 cursor-not-allowed',
  className
)}>

// Variant handling
<div className={cn(
  'base-styles',
  {
    'text-sm': size === 'sm',
    'text-base': size === 'md',
    'text-lg': size === 'lg',
  },
  className
)}>
```

### cn() Implementation

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Responsive Design

### Mobile-First Approach

```tsx
// DO: Start with mobile, add larger breakpoints
<div className="p-2 md:p-4 lg:p-6">
<div className="flex-col md:flex-row">
<div className="text-sm md:text-base lg:text-lg">

// DON'T: Desktop-first then override
<div className="p-6 sm:p-2">  // Confusing
```

### Breakpoint Reference

| Prefix | Min Width | Use Case |
|--------|-----------|----------|
| (none) | 0px | Mobile (default) |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large screens |

### Common Responsive Patterns

```tsx
// Grid that adapts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Hide/show elements
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>

// Flexible layouts
<div className="flex flex-col md:flex-row">
```

---

## Component Variants with CVA

Use Class Variance Authority for complex variant logic:

```typescript
// src/components/Button/variants.ts
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles (always applied)
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4 py-2',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

```tsx
// src/components/Button/Button.tsx
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonVariants } from './variants';

interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  isLoading?: boolean;
}

export function Button({ 
  className, 
  variant, 
  size, 
  isLoading,
  children,
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
}
```

---

## Dark Mode

### Using CSS Variables

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
}
```

### Theme Toggle

```tsx
// Use next-themes or similar
import { useTheme } from 'next-themes';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle theme
    </button>
  );
}
```

---

## Anti-Patterns

### DON'T: Mix Styling Approaches

```tsx
// BAD: Mixing Tailwind with inline styles
<div className="p-4" style={{ margin: '8px' }}>

// GOOD: Pick one approach
<div className="p-4 m-2">
```

### DON'T: Use !important

```tsx
// BAD: Fighting specificity
<div className="!bg-red-500">

// GOOD: Fix the cascade properly or use cn()
<div className={cn('bg-red-500', otherClasses)}>
```

### DON'T: Presentational Class Names

```tsx
// BAD: Names describe appearance
<button className={styles.blueButton}>

// GOOD: Names describe purpose
<button className={styles.primaryAction}>
```

---

[Back to Frontend](./index.md) | [Back to Patterns](../index.md)
