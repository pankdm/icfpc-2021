import React from 'react'
import { BrowserRouter as Router } from "react-router-dom"
import { QueryClient, QueryClientProvider } from 'react-query'
import App from './App.jsx'
const queryClient = new QueryClient()

function AppWrapper() {
  return (
    <Router>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Router>
  )
}

export default AppWrapper
