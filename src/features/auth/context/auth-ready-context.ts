import { createContext, useContext } from 'react';

const AuthReadyContext = createContext(false);

export function useAuthReady(): boolean {
  return useContext(AuthReadyContext);
}

export { AuthReadyContext };
