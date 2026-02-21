# Component Patterns

> **React component structure and organization** - How to build consistent, maintainable components.

---

## Component File Structure

```
src/components/
├── ComponentName/
│   ├── index.ts              # Re-export
│   ├── ComponentName.tsx     # Main component
│   ├── ComponentName.test.tsx # Tests
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Component-specific utils (if needed)
```

### index.ts (Re-export)

```typescript
export { ComponentName } from './ComponentName';
export type { ComponentNameProps } from './types';
```

### types.ts

```typescript
export interface ComponentNameProps {
  /** Brief description of prop */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Callback when action occurs */
  onAction?: () => void;
}
```

---

## Standard Component Pattern

```tsx
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ComponentNameProps } from './types';

/**
 * @description Brief description of component purpose
 * @example
 * <ComponentName prop="value" />
 */
export function ComponentName({ 
  className,
  children,
  onAction,
  ...props 
}: ComponentNameProps) {
  // ============================================
  // 1. HOOKS FIRST (state, refs, custom hooks)
  // ============================================
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useCustomHook();
  
  // ============================================
  // 2. EFFECTS SECOND
  // ============================================
  useEffect(() => {
    // Side effects here
    return () => {
      // Cleanup
    };
  }, [dependencies]);
  
  // ============================================
  // 3. DERIVED STATE / COMPUTATIONS
  // ============================================
  const isDisabled = isLoading || !data;
  
  // ============================================
  // 4. EVENT HANDLERS
  // ============================================
  const handleClick = () => {
    setIsOpen(true);
    onAction?.();
  };
  
  // ============================================
  // 5. EARLY RETURNS (loading, error states)
  // ============================================
  if (isLoading) {
    return <Skeleton />;
  }
  
  // ============================================
  // 6. RENDER
  // ============================================
  return (
    <div className={cn('base-styles', className)} {...props}>
      {children}
    </div>
  );
}
```

---

## Props Patterns

### Required vs Optional Props

```typescript
interface ButtonProps {
  // Required - no default possible
  onClick: () => void;
  
  // Optional with defaults
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  
  // Optional without defaults
  icon?: React.ReactNode;
  className?: string;
}

// In component
export function Button({
  onClick,
  variant = 'primary',  // Default value
  size = 'md',
  disabled = false,
  icon,
  className,
}: ButtonProps) { ... }
```

### Extending HTML Elements

```typescript
// Extend native button props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  isLoading?: boolean;
}

export function Button({ 
  variant = 'primary',
  isLoading,
  children,
  disabled,
  ...props  // Spread remaining HTML attributes
}: ButtonProps) {
  return (
    <button 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : children}
    </button>
  );
}
```

### Polymorphic Components

```typescript
type AsProps<E extends React.ElementType> = {
  as?: E;
};

type PolymorphicProps<E extends React.ElementType> = AsProps<E> &
  Omit<React.ComponentPropsWithoutRef<E>, keyof AsProps<E>>;

export function Text<E extends React.ElementType = 'span'>({
  as,
  children,
  ...props
}: PolymorphicProps<E>) {
  const Component = as || 'span';
  return <Component {...props}>{children}</Component>;
}

// Usage
<Text as="h1">Heading</Text>
<Text as="p">Paragraph</Text>
<Text>Default span</Text>
```

---

## Composition Patterns

### Compound Components

```tsx
// Parent component with context
const CardContext = createContext<{ isHovered: boolean } | null>(null);

function Card({ children }: { children: React.ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <CardContext.Provider value={{ isHovered }}>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </div>
    </CardContext.Provider>
  );
}

// Sub-components
Card.Header = function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="card-header">{children}</div>;
};

Card.Body = function CardBody({ children }: { children: React.ReactNode }) {
  return <div className="card-body">{children}</div>;
};

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

### Render Props

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
}

function List<T>({ items, renderItem, renderEmpty }: ListProps<T>) {
  if (items.length === 0) {
    return renderEmpty?.() ?? <p>No items</p>;
  }
  
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}

// Usage
<List
  items={users}
  renderItem={(user) => <UserCard user={user} />}
  renderEmpty={() => <EmptyState />}
/>
```

---

## Anti-Patterns to Avoid

### DON'T: Prop Drilling

```tsx
// BAD: Passing props through many levels
<App user={user}>
  <Layout user={user}>
    <Sidebar user={user}>
      <UserMenu user={user} />
    </Sidebar>
  </Layout>
</App>

// GOOD: Use context
const UserContext = createContext<User | null>(null);

<UserContext.Provider value={user}>
  <App>
    <Layout>
      <Sidebar>
        <UserMenu /> {/* Uses useContext(UserContext) */}
      </Sidebar>
    </Layout>
  </App>
</UserContext.Provider>
```

### DON'T: Giant Components

```tsx
// BAD: 500+ line component
function Dashboard() {
  // 50 lines of hooks
  // 100 lines of handlers
  // 350 lines of JSX
}

// GOOD: Extract sub-components
function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardHeader />
      <DashboardMetrics />
      <DashboardCharts />
      <DashboardTable />
    </DashboardLayout>
  );
}
```

### DON'T: Business Logic in Components

```tsx
// BAD: Business logic mixed with UI
function UserProfile() {
  const calculateAge = (birthDate: Date) => { /* complex logic */ };
  const formatAddress = (address: Address) => { /* complex logic */ };
  // ...
}

// GOOD: Extract to utilities/hooks
import { calculateAge, formatAddress } from '@/utils/user';
// or
import { useUserDetails } from '@/hooks/useUserDetails';
```

---

[Back to Frontend](./index.md) | [Back to Patterns](../index.md)
