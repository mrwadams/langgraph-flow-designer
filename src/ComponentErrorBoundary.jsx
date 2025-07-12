import { Component } from 'react'
import { AlertCircle } from 'lucide-react'

/* eslint-disable react/prop-types */

class ComponentErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Error in ${this.props.componentName || 'component'}:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">
            {this.props.fallbackMessage || 'This component encountered an error'}
          </span>
        </div>
      )
    }

    return this.props.children
  }
}

export default ComponentErrorBoundary