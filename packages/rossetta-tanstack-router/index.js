/**
 * @rossetta-api/tanstack-router
 * Tanstack Router integration for Rossetta API
 * 
 * Usage:
 *   import { createRossettaRouterContext, createRossettaLoader } from '@rossetta-api/tanstack-router';
 *   
 *   const RossettaRouterContext = createRossettaRouterContext('http://localhost:3000');
 *   
 *   const todoRoute = createRoute({
 *     loader: createRossettaLoader('/todos')
 *   });
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useRouterContext } from '@tanstack/react-router';
import RossettaClient from '@rossetta-api/client';

/**
 * Create a Rossetta Router Context
 */
export function createRossettaRouterContext(baseURL, options = {}) {
  const RossettaContext = createContext(null);

  function RossettaRouterProvider({ children }) {
    const client = useMemo(() => new RossettaClient(baseURL, options), []);
    
    return React.createElement(RossettaContext.Provider, { value: client }, children);
  }

  function useRossettaClient() {
    const client = useContext(RossettaContext);
    if (!client) {
      throw new Error('useRossettaClient must be used within RossettaRouterProvider');
    }
    return client;
  }

  return {
    RossettaRouterProvider,
    useRossettaClient,
    context: RossettaContext
  };
}

/**
 * Create a loader function that uses Rossetta client
 */
export function createRossettaLoader(endpoint, options = {}) {
  const { method = 'GET', transform } = options;

  return async ({ context, params }) => {
    // Get client from router context
    const client = context.rossettaClient;
    
    if (!client) {
      throw new Error('Rossetta client not found in router context. Make sure to provide it in router context.');
    }

    // Initialize client if not already done
    if (!client.initialized) {
      await client.initialize();
    }

    // Replace params in endpoint
    let finalEndpoint = endpoint;
    if (params) {
      Object.keys(params).forEach(key => {
        finalEndpoint = finalEndpoint.replace(`:${key}`, params[key]);
        finalEndpoint = finalEndpoint.replace(`$${key}`, params[key]);
      });
    }

    // Fetch data
    const data = await client.request(finalEndpoint, method);

    // Transform if needed
    if (transform) {
      return transform(data);
    }

    return data;
  };
}

/**
 * Create a loader with dependencies
 */
export function createRossettaLoaderWithDeps(loaderFn) {
  return async (loaderContext) => {
    const { context } = loaderContext;
    const client = context.rossettaClient;
    
    if (!client) {
      throw new Error('Rossetta client not found in router context');
    }

    if (!client.initialized) {
      await client.initialize();
    }

    return loaderFn({ ...loaderContext, rossettaClient: client });
  };
}

/**
 * Hook to use Rossetta client in route components
 */
export function useRossettaRouterClient() {
  const routerContext = useRouterContext();
  const client = routerContext?.rossettaClient;

  if (!client) {
    throw new Error('Rossetta client not found in router context');
  }

  return client;
}

/**
 * Create mutation function for use in routes
 */
export function createRossettaMutation(endpoint, method = 'POST') {
  return async (data, context) => {
    const client = context.rossettaClient;
    
    if (!client) {
      throw new Error('Rossetta client not found in router context');
    }

    if (!client.initialized) {
      await client.initialize();
    }

    return client.request(endpoint, method, data);
  };
}

/**
 * Higher-order function to create loader with automatic refetch
 */
export function createRefetchableLoader(endpoint, options = {}) {
  const { refetchInterval, method = 'GET' } = options;
  
  const baseLoader = createRossettaLoader(endpoint, { method });

  return async (loaderContext) => {
    const data = await baseLoader(loaderContext);
    
    // Set up refetch if interval specified
    if (refetchInterval && typeof window !== 'undefined') {
      const { context } = loaderContext;
      const client = context.rossettaClient;
      
      const refetchTimer = setInterval(async () => {
        try {
          await client.request(endpoint, method);
          // You would need to implement your own cache invalidation here
        } catch (error) {
          console.error('Refetch failed:', error);
        }
      }, refetchInterval);
      
      // Store timer for cleanup (you'd need to implement cleanup mechanism)
      if (context.refetchTimers) {
        context.refetchTimers.push(refetchTimer);
      }
    }
    
    return data;
  };
}

/**
 * Utility to create router context with Rossetta client
 */
export function createRouterContextWithRossetta(baseURL, options = {}) {
  const client = new RossettaClient(baseURL, options);
  
  return {
    rossettaClient: client
  };
}

/**
 * Hook for making requests in route components (similar to React hooks)
 */
export function useRossettaRequest(endpoint, method = 'GET') {
  const client = useRossettaRouterClient();
  
  return React.useCallback(async (data = null) => {
    if (!client.initialized) {
      await client.initialize();
    }
    return client.request(endpoint, method, data);
  }, [client, endpoint, method]);
}

export default {
  createRossettaRouterContext,
  createRossettaLoader,
  createRossettaLoaderWithDeps,
  createRossettaMutation,
  createRefetchableLoader,
  createRouterContextWithRossetta,
  useRossettaRouterClient,
  useRossettaRequest
};
