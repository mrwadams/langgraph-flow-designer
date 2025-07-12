import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import LangGraphFlowDesigner from './LangGraphFlowDesigner'
import ErrorBoundary from './ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LangGraphFlowDesigner />
    </ErrorBoundary>
  </React.StrictMode>
)
