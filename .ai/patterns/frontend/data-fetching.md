# Data Fetching Patterns

> **React Query / TanStack Query patterns** - Hooks, caching, mutations.

---

## Query Key Convention

Centralize query keys for consistency and cache management:

```typescript
// src/hooks/use-entity.ts

export const entityKeys = {
  all: ['entities'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (filters: string) => [...entityKeys.lists(), filters] as const,
  details: () => [...entityKeys.all, 'detail'] as const,
  detail: (id: string) => [...entityKeys.details(), id] as const,
};

// Usage
queryKey: entityKeys.list(JSON.stringify(filters))
queryKey: entityKeys.detail(userId)
```

---

## Query Hooks

### Fetch All (List)

```typescript
import { useQuery } from '@tanstack/react-query';
import { entityApi } from '@/lib/api/entity';
import { entityKeys } from './keys';
import type { Entity, EntityFilters } from '@/types';

export function useEntities(filters?: EntityFilters) {
  return useQuery({
    queryKey: entityKeys.list(JSON.stringify(filters)),
    queryFn: () => entityApi.getAll(filters),
  });
}
```

### Fetch Single (Detail)

```typescript
export function useEntity(id: string) {
  return useQuery({
    queryKey: entityKeys.detail(id),
    queryFn: () => entityApi.getById(id),
    enabled: !!id,  // Don't fetch if no ID
  });
}
```

### With Placeholder Data

```typescript
export function useEntity(id: string) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: entityKeys.detail(id),
    queryFn: () => entityApi.getById(id),
    enabled: !!id,
    placeholderData: () => {
      // Try to find this entity in list cache
      const lists = queryClient.getQueryData<Entity[]>(entityKeys.lists());
      return lists?.find(entity => entity.id === id);
    },
  });
}
```

---

## Mutation Hooks

### Create Mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEntityInput) => entityApi.create(input),
    onSuccess: () => {
      // IMPORTANT: Always invalidate relevant queries after mutations
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
    onError: (error) => {
      console.error('Failed to create entity:', error);
      // Handle error (toast, etc.)
    },
  });
}
```

### Update Mutation

```typescript
export function useUpdateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEntityInput }) => 
      entityApi.update(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate both the specific item and lists
      queryClient.invalidateQueries({ queryKey: entityKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}
```

### Delete Mutation

```typescript
export function useDeleteEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => entityApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
    },
  });
}
```

---

## Optimistic Updates

For better UX, update the cache immediately:

```typescript
export function useUpdateEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => entityApi.update(id, data),
    
    // Optimistically update cache
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: entityKeys.detail(id) });
      
      // Snapshot previous value
      const previousEntity = queryClient.getQueryData(entityKeys.detail(id));
      
      // Optimistically update
      queryClient.setQueryData(entityKeys.detail(id), (old: Entity) => ({
        ...old,
        ...data,
      }));
      
      // Return snapshot for rollback
      return { previousEntity };
    },
    
    // Rollback on error
    onError: (err, { id }, context) => {
      queryClient.setQueryData(
        entityKeys.detail(id),
        context?.previousEntity
      );
    },
    
    // Refetch after settle
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: entityKeys.detail(id) });
    },
  });
}
```

---

## Loading & Error States

### In Components

```tsx
function EntityList() {
  const { data, isLoading, isError, error } = useEntities();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return <ErrorMessage error={error} />;
  }

  if (!data?.length) {
    return <EmptyState />;
  }

  return (
    <ul>
      {data.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </ul>
  );
}
```

### With Suspense (React 18+)

```tsx
// In QueryClient config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      suspense: true,
    },
  },
});

// In component
function EntityList() {
  const { data } = useEntities(); // Will suspend
  
  return (
    <ul>
      {data.map(entity => (
        <EntityCard key={entity.id} entity={entity} />
      ))}
    </ul>
  );
}

// In parent
<Suspense fallback={<LoadingSkeleton />}>
  <ErrorBoundary fallback={<ErrorMessage />}>
    <EntityList />
  </ErrorBoundary>
</Suspense>
```

---

## Infinite Queries (Pagination)

```typescript
export function useInfiniteEntities(filters?: EntityFilters) {
  return useInfiniteQuery({
    queryKey: entityKeys.list(JSON.stringify(filters)),
    queryFn: ({ pageParam = 0 }) => 
      entityApi.getAll({ ...filters, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
  });
}

// Usage
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteEntities();

// Flatten pages for rendering
const allEntities = data?.pages.flatMap(page => page) ?? [];
```

---

## Dependent Queries

When one query depends on another:

```typescript
// First query
const { data: user } = useUser(userId);

// Dependent query - only runs when user exists
const { data: orders } = useQuery({
  queryKey: ['orders', user?.id],
  queryFn: () => ordersApi.getByUserId(user!.id),
  enabled: !!user?.id,  // KEY: Only fetch when user exists
});
```

---

## Common Mistakes

### DON'T: Forget Cache Invalidation

```typescript
// BAD: Mutation doesn't update cache
useMutation({
  mutationFn: entityApi.create,
  // Missing onSuccess!
});

// GOOD: Always invalidate after mutations
useMutation({
  mutationFn: entityApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: entityKeys.lists() });
  },
});
```

### DON'T: Inline Query Keys

```typescript
// BAD: Keys scattered across codebase
useQuery({ queryKey: ['users', 'list', filters], ... });
useQuery({ queryKey: ['users', 'list', filters], ... }); // Typo risk!

// GOOD: Centralized keys
useQuery({ queryKey: userKeys.list(filters), ... });
```

### DON'T: Refetch on Every Render

```typescript
// BAD: Always refetching
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 0,  // Data always stale
  refetchOnMount: 'always',
});

// GOOD: Appropriate caching
useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  staleTime: 5 * 60 * 1000,  // 5 minutes
});
```

---

[Back to Frontend](./index.md) | [Back to Patterns](../index.md)
