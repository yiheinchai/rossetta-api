# @rossetta-api/tanstack-router

Tanstack Router integration for Rossetta API. Zero-config network request obfuscation with route loaders and mutations.

## Features

- 🚀 **Route Loaders**: Fetch encrypted data in route loaders
- 🔄 **Auto-Refetch**: Optional automatic refetching in loaders
- 🎯 **Type-Safe**: Works with Tanstack Router's type system
- 🪝 **React Hooks**: Use Rossetta client in route components
- 🔐 **Fully Encrypted**: All requests are obfuscated and encrypted
- ⚡ **Zero-Config**: Minimal setup required

## Installation

```bash
npm install @rossetta-api/tanstack-router @rossetta-api/client @tanstack/react-router react
```

## Quick Start

### 1. Set up router context with Rossetta

```typescript
// router.tsx
import { createRouter } from '@tanstack/react-router';
import { createRouterContextWithRossetta } from '@rossetta-api/tanstack-router';

const routerContext = createRouterContextWithRossetta('http://localhost:3000');

export const router = createRouter({
  routeTree,
  context: routerContext
});
```

### 2. Create routes with Rossetta loaders

```typescript
// routes/todos.tsx
import { createRoute } from '@tanstack/react-router';
import { createRossettaLoader } from '@rossetta-api/tanstack-router';
import { rootRoute } from './root';

export const todosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/todos',
  loader: createRossettaLoader('/todos')
});

function TodosComponent() {
  const todos = todosRoute.useLoaderData();
  
  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>{todo.text}</div>
      ))}
    </div>
  );
}
```

### 3. Use dynamic parameters

```typescript
// routes/todos/$todoId.tsx
import { createRoute } from '@tanstack/react-router';
import { createRossettaLoader } from '@rossetta-api/tanstack-router';
import { todosRoute } from './todos';

export const todoDetailRoute = createRoute({
  getParentRoute: () => todosRoute,
  path: '$todoId',
  loader: createRossettaLoader('/todos/:todoId') // :todoId will be replaced with actual ID
});

function TodoDetail() {
  const todo = todoDetailRoute.useLoaderData();
  
  return <div>{todo.text}</div>;
}
```

## API Reference

### Functions

#### `createRouterContextWithRossetta(baseURL, options)`

Creates a router context with Rossetta client.

**Parameters:**
- `baseURL` (string): Base URL of your API
- `options` (object, optional): Options for RossettaClient

**Returns:** Router context object with `rossettaClient`

```typescript
const context = createRouterContextWithRossetta('http://localhost:3000');

const router = createRouter({
  routeTree,
  context
});
```

#### `createRossettaLoader(endpoint, options)`

Creates a loader function for Tanstack Router.

**Parameters:**
- `endpoint` (string): API endpoint (supports `:param` and `$param` placeholders)
- `options` (object, optional):
  - `method` (string): HTTP method (default: 'GET')
  - `transform` (function): Transform function for response data

**Returns:** Loader function

```typescript
// Simple loader
const loader = createRossettaLoader('/todos');

// With transform
const loader = createRossettaLoader('/todos', {
  transform: (data) => data.filter(todo => !todo.completed)
});

// POST loader
const loader = createRossettaLoader('/todos', { method: 'POST' });
```

#### `createRossettaLoaderWithDeps(loaderFn)`

Creates a custom loader with access to Rossetta client.

**Parameters:**
- `loaderFn` (function): Async function receiving loader context + `rossettaClient`

**Returns:** Loader function

```typescript
const loader = createRossettaLoaderWithDeps(async ({ params, rossettaClient }) => {
  const todo = await rossettaClient.get(`/todos/${params.todoId}`);
  const comments = await rossettaClient.get(`/todos/${params.todoId}/comments`);
  
  return { todo, comments };
});
```

#### `createRossettaMutation(endpoint, method)`

Creates a mutation function for use in actions.

**Parameters:**
- `endpoint` (string): API endpoint
- `method` (string): HTTP method (default: 'POST')

**Returns:** Mutation function

```typescript
const createTodo = createRossettaMutation('/todos', 'POST');

const todoRoute = createRoute({
  path: '/todos',
  action: async ({ data, context }) => {
    return createTodo(data, context);
  }
});
```

#### `createRefetchableLoader(endpoint, options)`

Creates a loader with automatic refetching.

**Parameters:**
- `endpoint` (string): API endpoint
- `options` (object):
  - `method` (string): HTTP method
  - `refetchInterval` (number): Refetch interval in milliseconds

**Returns:** Loader function

```typescript
const loader = createRefetchableLoader('/stats', {
  refetchInterval: 10000 // Refetch every 10 seconds
});
```

### Hooks

#### `useRossettaRouterClient()`

Access Rossetta client in route components.

```typescript
import { useRossettaRouterClient } from '@rossetta-api/tanstack-router';

function TodoComponent() {
  const client = useRossettaRouterClient();
  
  const handleCreate = async () => {
    await client.post('/todos', { text: 'New todo' });
  };
  
  return <button onClick={handleCreate}>Add</button>;
}
```

#### `useRossettaRequest(endpoint, method)`

Create a request function in components.

```typescript
import { useRossettaRequest } from '@rossetta-api/tanstack-router';

function TodoForm() {
  const createTodo = useRossettaRequest('/todos', 'POST');
  
  const handleSubmit = async (text) => {
    await createTodo({ text });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Context Integration

#### `createRossettaRouterContext(baseURL, options)`

Alternative context creation with provider component.

```typescript
const { RossettaRouterProvider, useRossettaClient } = 
  createRossettaRouterContext('http://localhost:3000');

function App() {
  return (
    <RossettaRouterProvider>
      <RouterProvider router={router} />
    </RossettaRouterProvider>
  );
}
```

## Examples

### Basic Route with Loader

```typescript
import { createRoute } from '@tanstack/react-router';
import { createRossettaLoader } from '@rossetta-api/tanstack-router';

const todosRoute = createRoute({
  path: '/todos',
  loader: createRossettaLoader('/todos')
});

export function Todos() {
  const todos = todosRoute.useLoaderData();
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

### Dynamic Route with Parameters

```typescript
const todoRoute = createRoute({
  path: '/todos/$todoId',
  loader: createRossettaLoader('/todos/:todoId')
});

export function TodoDetail() {
  const todo = todoRoute.useLoaderData();
  return <div>{todo.text}</div>;
}
```

### Complex Loader with Multiple Requests

```typescript
import { createRossettaLoaderWithDeps } from '@rossetta-api/tanstack-router';

const userRoute = createRoute({
  path: '/users/$userId',
  loader: createRossettaLoaderWithDeps(async ({ params, rossettaClient }) => {
    const [user, posts, followers] = await Promise.all([
      rossettaClient.get(`/users/${params.userId}`),
      rossettaClient.get(`/users/${params.userId}/posts`),
      rossettaClient.get(`/users/${params.userId}/followers`)
    ]);
    
    return { user, posts, followers };
  })
});
```

### Route with Action (Form Submission)

```typescript
import { createRossettaMutation } from '@rossetta-api/tanstack-router';

const createTodo = createRossettaMutation('/todos', 'POST');

const todosRoute = createRoute({
  path: '/todos',
  loader: createRossettaLoader('/todos'),
  action: async ({ data, context }) => {
    const newTodo = await createTodo(data, context);
    return { success: true, todo: newTodo };
  }
});

export function TodoForm() {
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    await todosRoute.action({
      data: { text: formData.get('text') }
    });
    
    navigate({ to: '/todos' });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="text" required />
      <button type="submit">Add Todo</button>
    </form>
  );
}
```

### Auto-Refreshing Dashboard

```typescript
import { createRefetchableLoader } from '@rossetta-api/tanstack-router';

const dashboardRoute = createRoute({
  path: '/dashboard',
  loader: createRefetchableLoader('/stats', {
    refetchInterval: 5000 // Update every 5 seconds
  })
});

export function Dashboard() {
  const stats = dashboardRoute.useLoaderData();
  
  return (
    <div>
      <h1>Live Stats</h1>
      <p>Active Users: {stats.activeUsers}</p>
      <p>Total Sales: ${stats.totalSales}</p>
    </div>
  );
}
```

### Using Client in Components

```typescript
import { useRossettaRouterClient } from '@rossetta-api/tanstack-router';

export function TodoActions({ todoId }) {
  const client = useRossettaRouterClient();
  
  const handleDelete = async () => {
    await client.delete(`/todos/${todoId}`);
    // Invalidate or refetch
  };
  
  const handleToggle = async () => {
    await client.post(`/todos/${todoId}/toggle`);
  };
  
  return (
    <div>
      <button onClick={handleToggle}>Toggle</button>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

### Conditional Data Loading

```typescript
import { createRossettaLoaderWithDeps } from '@rossetta-api/tanstack-router';

const route = createRoute({
  path: '/profile',
  loader: createRossettaLoaderWithDeps(async ({ search, rossettaClient }) => {
    const userId = search.userId;
    
    if (!userId) {
      return { user: null };
    }
    
    const user = await rossettaClient.get(`/users/${userId}`);
    return { user };
  })
});
```

## Integration with Backend

Works with any Rossetta-enabled backend:

- [@rossetta-api/nextjs](https://www.npmjs.com/package/@rossetta-api/nextjs)
- [@rossetta-api/express](https://www.npmjs.com/package/@rossetta-api/express)
- [rossetta-fastapi](https://pypi.org/project/rossetta-fastapi/)
- [rossetta-django](https://pypi.org/project/rossetta-django/)

## TypeScript Support

Full TypeScript support when used with Tanstack Router's type system:

```typescript
type TodosLoaderData = Array<{
  id: number;
  text: string;
  completed: boolean;
}>;

const todosRoute = createRoute({
  path: '/todos',
  loader: createRossettaLoader('/todos')
}) satisfies RouteDefinition;
```

## Best Practices

1. **Initialize Once**: Create router context once at app initialization
2. **Use Loaders**: Prefer loaders over useEffect for data fetching
3. **Parallel Requests**: Use `Promise.all()` in complex loaders
4. **Error Handling**: Handle loader errors with error boundaries
5. **Cache Invalidation**: Implement proper cache invalidation after mutations

## Compatibility

- @tanstack/react-router 1.0.0 or higher
- React 16.8.0 or higher
- Works with all Rossetta backends

## License

MIT

## Links

- [GitHub Repository](https://github.com/yiheinchai/rossetta-api)
- [Issue Tracker](https://github.com/yiheinchai/rossetta-api/issues)
- [Tanstack Router Docs](https://tanstack.com/router)
