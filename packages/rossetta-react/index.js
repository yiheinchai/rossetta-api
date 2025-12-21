/**
 * @rossetta-api/react
 * React hooks and components for Rossetta API
 * 
 * Usage:
 *   import { RossettaProvider, useRossetta } from '@rossetta-api/react';
 *   
 *   <RossettaProvider baseURL="http://localhost:3000">
 *     <App />
 *   </RossettaProvider>
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import RossettaClient from '@rossetta-api/client';

/**
 * Rossetta Context
 */
const RossettaContext = createContext(null);

/**
 * Rossetta Provider Component
 */
export function RossettaProvider({ children, baseURL, options = {} }) {
  const [client] = useState(() => new RossettaClient(baseURL, options));
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    client.initialize()
      .then(() => setIsInitialized(true))
      .catch(err => {
        console.error('Rossetta initialization failed:', err);
        setError(err);
      });
  }, [client]);

  const value = useMemo(() => ({
    client,
    isInitialized,
    error
  }), [client, isInitialized, error]);

  return React.createElement(RossettaContext.Provider, { value }, children);
}

/**
 * Hook to access Rossetta client
 */
export function useRossetta() {
  const context = useContext(RossettaContext);
  
  if (!context) {
    throw new Error('useRossetta must be used within a RossettaProvider');
  }
  
  return context;
}

/**
 * Hook for making GET requests
 */
export function useRossettaGet(endpoint, options = {}) {
  const { client, isInitialized } = useRossetta();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { enabled = true, refetchInterval } = options;

  const refetch = useCallback(async () => {
    if (!isInitialized || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.get(endpoint);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [client, endpoint, isInitialized, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(refetch, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [refetch, refetchInterval, enabled]);

  return { data, loading, error, refetch };
}

/**
 * Hook for making POST requests
 */
export function useRossettaPost(endpoint) {
  const { client, isInitialized } = useRossetta();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const post = useCallback(async (data) => {
    if (!isInitialized) {
      throw new Error('Rossetta client not initialized');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.post(endpoint, data);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, endpoint, isInitialized]);

  return { post, loading, error };
}

/**
 * Hook for making PUT requests
 */
export function useRossettaPut(endpoint) {
  const { client, isInitialized } = useRossetta();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const put = useCallback(async (data) => {
    if (!isInitialized) {
      throw new Error('Rossetta client not initialized');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.put(endpoint, data);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, endpoint, isInitialized]);

  return { put, loading, error };
}

/**
 * Hook for making DELETE requests
 */
export function useRossettaDelete(endpoint) {
  const { client, isInitialized } = useRossetta();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const del = useCallback(async (data) => {
    if (!isInitialized) {
      throw new Error('Rossetta client not initialized');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.delete(endpoint, data);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, endpoint, isInitialized]);

  return { delete: del, loading, error };
}

/**
 * Generic mutation hook (for POST/PUT/DELETE)
 */
export function useRossettaMutation(endpoint, method = 'POST') {
  const { client, isInitialized } = useRossetta();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (payload) => {
    if (!isInitialized) {
      throw new Error('Rossetta client not initialized');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let result;
      const methodLower = method.toLowerCase();
      
      switch (methodLower) {
        case 'post':
          result = await client.post(endpoint, payload);
          break;
        case 'put':
          result = await client.put(endpoint, payload);
          break;
        case 'delete':
          result = await client.delete(endpoint, payload);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [client, endpoint, method, isInitialized]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { mutate, data, loading, error, reset };
}

/**
 * Hook for query with automatic refetch capabilities
 */
export function useRossettaQuery(endpoint, options = {}) {
  const {
    method = 'GET',
    enabled = true,
    refetchInterval,
    refetchOnWindowFocus = false,
    onSuccess,
    onError
  } = options;

  const { client, isInitialized } = useRossetta();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!isInitialized || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.request(endpoint, method);
      setData(result);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      setError(err);
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  }, [client, endpoint, method, isInitialized, enabled, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refetchInterval, enabled]);

  // Refetch on window focus
  useEffect(() => {
    if (refetchOnWindowFocus && enabled) {
      const handleFocus = () => fetchData();
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [fetchData, refetchOnWindowFocus, enabled]);

  return { data, loading, error, refetch: fetchData };
}

export default {
  RossettaProvider,
  useRossetta,
  useRossettaGet,
  useRossettaPost,
  useRossettaPut,
  useRossettaDelete,
  useRossettaMutation,
  useRossettaQuery
};
