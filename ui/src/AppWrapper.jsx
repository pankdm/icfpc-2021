import React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import App from './App.jsx'
const queryClient = new QueryClient()

function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}

export default AppWrapper
