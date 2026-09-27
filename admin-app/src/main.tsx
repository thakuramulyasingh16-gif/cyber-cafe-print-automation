import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10000 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #2f1d13 0%, #20130b 100%)',
            color: '#fdf6ee',
            border: '1.5px solid rgba(245, 158, 11, 0.35)',
            boxShadow: '0 8px 24px -4px rgba(10, 6, 3, 0.7), inset 1px 1px 2px rgba(255, 235, 204, 0.15)',
            borderRadius: '16px',
            fontWeight: '600',
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>,
)
