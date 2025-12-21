# @rossetta-api/react

React hooks and components for Rossetta API. Zero-config network request obfuscation with React integration.

## Features

- 🪝 **React Hooks**: `useRossettaGet`, `useRossettaPost`, `useRossettaMutation`, and more
- 🎯 **Context Provider**: Global Rossetta client with React Context
- ⚡ **Auto-Refetch**: Built-in polling and refetch on focus
- 🔄 **Mutation Helpers**: Easy POST/PUT/DELETE operations
- 🎨 **TypeScript Ready**: JSDoc comments for IntelliSense
- 🔒 **Fully Encrypted**: All the security of Rossetta API with React convenience

## Installation

```bash
npm install @rossetta-api/react @rossetta-api/client react
```

## Quick Start

### 1. Wrap your app with RossettaProvider

```jsx
import { RossettaProvider } from '@rossetta-api/react';

function App() {
  return (
    <RossettaProvider baseURL="http://localhost:3000">
      <YourApp />
    </RossettaProvider>
  );
}
```

### 2. Use hooks in your components

```jsx
import { useRossettaGet, useRossettaPost } from '@rossetta-api/react';

function TodoList() {
  // GET request with auto-fetch
  const { data: todos, loading, error, refetch } = useRossettaGet('/todos');
  
  // POST mutation
  const { post, loading: posting } = useRossettaPost('/todos');
  
  const handleAddTodo = async () => {
    await post({ text: 'New todo' });
    refetch(); // Refetch the list
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {todos.map(todo => (
        <div key={todo.id}>{todo.text}</div>
      ))}
      <button onClick={handleAddTodo} disabled={posting}>
        Add Todo
      </button>
    </div>
  );
}
```

## API Reference

### Components

#### `<RossettaProvider>`

Provides Rossetta client to all child components.

**Props:**
- `baseURL` (string, required): Base URL of your API
- `options` (object, optional): Options to pass to RossettaClient

```jsx
<RossettaProvider 
  baseURL="http://localhost:3000"
  options={{ /* client options */ }}
>
  <App />
</RossettaProvider>
```

### Hooks

#### `useRossetta()`

Access the Rossetta client and initialization state.

```jsx
const { client, isInitialized, error } = useRossetta();
```

**Returns:**
- `client`: RossettaClient instance
- `isInitialized`: Boolean indicating if session is ready
- `error`: Any initialization error

#### `useRossettaGet(endpoint, options)`

Fetch data with GET request. Auto-fetches on mount.

**Parameters:**
- `endpoint` (string): API endpoint
- `options` (object):
  - `enabled` (boolean): Enable/disable auto-fetch (default: true)
  - `refetchInterval` (number): Auto-refetch interval in ms

```jsx
const { data, loading, error, refetch } = useRossettaGet('/todos', {
  enabled: true,
  refetchInterval: 5000 // Refetch every 5 seconds
});
```

**Returns:**
- `data`: Response data
- `loading`: Loading state
- `error`: Error object if request failed
- `refetch`: Function to manually refetch

#### `useRossettaPost(endpoint)`

Create a POST mutation.

```jsx
const { post, loading, error } = useRossettaPost('/todos');

await post({ text: 'Buy milk' });
```

**Returns:**
- `post`: Function to make POST request
- `loading`: Loading state
- `error`: Error object if request failed

#### `useRossettaPut(endpoint)`

Create a PUT mutation.

```jsx
const { put, loading, error } = useRossettaPut('/todos/1');

await put({ text: 'Updated text' });
```

**Returns:**
- `put`: Function to make PUT request
- `loading`: Loading state
- `error`: Error object if request failed

#### `useRossettaDelete(endpoint)`

Create a DELETE mutation.

```jsx
const { delete: deleteTodo, loading, error } = useRossettaDelete('/todos/1');

await deleteTodo();
```

**Returns:**
- `delete`: Function to make DELETE request
- `loading`: Loading state
- `error`: Error object if request failed

#### `useRossettaMutation(endpoint, method)`

Generic mutation hook for POST/PUT/DELETE.

```jsx
const { mutate, data, loading, error, reset } = useRossettaMutation('/todos', 'POST');

await mutate({ text: 'New todo' });
reset(); // Clear mutation state
```

**Parameters:**
- `endpoint` (string): API endpoint
- `method` (string): HTTP method ('POST', 'PUT', or 'DELETE')

**Returns:**
- `mutate`: Function to trigger mutation
- `data`: Response data from last mutation
- `loading`: Loading state
- `error`: Error object if request failed
- `reset`: Function to reset mutation state

#### `useRossettaQuery(endpoint, options)`

Advanced query hook with more options.

```jsx
const { data, loading, error, refetch } = useRossettaQuery('/todos', {
  method: 'GET',
  enabled: true,
  refetchInterval: 5000,
  refetchOnWindowFocus: true,
  onSuccess: (data) => console.log('Success!', data),
  onError: (error) => console.error('Error!', error)
});
```

**Options:**
- `method` (string): HTTP method (default: 'GET')
- `enabled` (boolean): Enable/disable query
- `refetchInterval` (number): Auto-refetch interval in ms
- `refetchOnWindowFocus` (boolean): Refetch when window gains focus
- `onSuccess` (function): Callback on successful fetch
- `onError` (function): Callback on error

## Examples

### Todo List with CRUD Operations

```jsx
import { useRossettaGet, useRossettaMutation } from '@rossetta-api/react';

function TodoApp() {
  const { data: todos, loading, refetch } = useRossettaGet('/todos');
  const { mutate: createTodo } = useRossettaMutation('/todos', 'POST');
  const { mutate: updateTodo } = useRossettaMutation('/todos', 'PUT');
  const { mutate: deleteTodo } = useRossettaMutation('/todos', 'DELETE');
  
  const handleCreate = async () => {
    await createTodo({ text: 'New todo' });
    refetch();
  };
  
  const handleUpdate = async (id, text) => {
    await updateTodo({ id, text });
    refetch();
  };
  
  const handleDelete = async (id) => {
    await deleteTodo({ id });
    refetch();
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <button onClick={handleCreate}>Add Todo</button>
      {todos?.map(todo => (
        <div key={todo.id}>
          <span>{todo.text}</span>
          <button onClick={() => handleUpdate(todo.id, 'Updated')}>
            Edit
          </button>
          <button onClick={() => handleDelete(todo.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Auto-Refreshing Dashboard

```jsx
import { useRossettaQuery } from '@rossetta-api/react';

function Dashboard() {
  const { data: stats } = useRossettaQuery('/stats', {
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true
  });
  
  return (
    <div>
      <h1>Dashboard</h1>
      <div>Active Users: {stats?.activeUsers}</div>
      <div>Total Sales: ${stats?.totalSales}</div>
    </div>
  );
}
```

### Conditional Queries

```jsx
import { useRossettaGet } from '@rossetta-api/react';

function UserProfile({ userId }) {
  const { data: user, loading } = useRossettaGet(`/users/${userId}`, {
    enabled: !!userId // Only fetch if userId exists
  });
  
  if (!userId) return <div>Select a user</div>;
  if (loading) return <div>Loading...</div>;
  
  return <div>Welcome, {user.name}!</div>;
}
```

### Form with Mutation

```jsx
import { useState } from 'react';
import { useRossettaMutation } from '@rossetta-api/react';

function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const { mutate, loading, error, data } = useRossettaMutation('/contact', 'POST');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await mutate(formData);
      alert('Message sent!');
      setFormData({ name: '', email: '' });
    } catch (err) {
      alert('Failed to send message');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={e => setFormData({ ...formData, name: e.target.value })}
        placeholder="Name"
      />
      <input
        value={formData.email}
        onChange={e => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
      {error && <div>Error: {error.message}</div>}
    </form>
  );
}
```

### Using Direct Client Access

```jsx
import { useRossetta } from '@rossetta-api/react';

function AdvancedComponent() {
  const { client, isInitialized } = useRossetta();
  
  const handleCustomRequest = async () => {
    if (!isInitialized) return;
    
    const result = await client.request('/custom-endpoint', 'POST', {
      customData: 'value'
    });
    
    console.log(result);
  };
  
  return <button onClick={handleCustomRequest}>Custom Request</button>;
}
```

## Integration with Backend

Works seamlessly with any Rossetta-enabled backend:

- [@rossetta-api/nextjs](https://www.npmjs.com/package/@rossetta-api/nextjs)
- [@rossetta-api/express](https://www.npmjs.com/package/@rossetta-api/express)
- [rossetta-fastapi](https://pypi.org/project/rossetta-fastapi/)
- [rossetta-django](https://pypi.org/project/rossetta-django/)

## TypeScript Support

The package includes JSDoc comments for TypeScript IntelliSense support.

## Best Practices

1. **Single Provider**: Wrap your root component with `RossettaProvider` once
2. **Refetch After Mutations**: Call `refetch()` after mutations to update UI
3. **Error Handling**: Always handle errors from mutations
4. **Loading States**: Show loading indicators for better UX
5. **Conditional Queries**: Use `enabled` option to control when queries run

## Compatibility

- React 16.8.0 or higher (hooks support required)
- Works with React 17, 18, and 19
- Compatible with Next.js, Create React App, Vite, and other React setups

## License

MIT

## Links

- [GitHub Repository](https://github.com/yiheinchai/rossetta-api)
- [Issue Tracker](https://github.com/yiheinchai/rossetta-api/issues)
- [Main Documentation](https://github.com/yiheinchai/rossetta-api#readme)
