import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '../store/auth.store';

const GQL_URL = import.meta.env.VITE_GQL_URL ?? 'http://localhost:4000/graphql';

export const gqlClient = new GraphQLClient(GQL_URL, {
  requestMiddleware: async (request) => {
    const token = useAuthStore.getState().token;
    
    // Maintain original headers (like Content-Type) and append ours
    const headers = new Headers(request.headers);
    headers.set('apollo-require-preflight', 'true');
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Convert Headers instance to a plain object
    const plainHeaders = {};
    headers.forEach((value, key) => {
      plainHeaders[key] = value;
    });

    return {
      ...request,
      headers: plainHeaders,
    };
  },
});
