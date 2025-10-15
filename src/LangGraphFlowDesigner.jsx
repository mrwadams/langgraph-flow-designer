import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Download,
  Wrench,
  MessageSquare,
  Route,
  Square,
  Circle,
  Hexagon,
  Minus,
  X,
  Code,
  ChevronDown,
  ChevronUp,
  Undo,
  Redo,
  Moon,
  Sun,
} from 'lucide-react'
import ComponentErrorBoundary from './ComponentErrorBoundary'

/* eslint-disable react/prop-types */
const SidebarSection = ({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  contentClassName = 'space-y-3',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(prev => !prev)
    }
  }

  const headerContent = (
    <div className="flex w-full items-center justify-between gap-2 px-3 py-2">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</h3>
      {collapsible && (
        <span className="text-gray-500 dark:text-gray-400">
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </span>
      )}
    </div>
  )

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      {collapsible ? (
        <button
          type="button"
          onClick={handleToggle}
          className="w-full text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
          aria-expanded={!isCollapsed}
        >
          {headerContent}
        </button>
      ) : (
        headerContent
      )}
      {(!collapsible || !isCollapsed) && (
        <div className={`px-3 pb-3 pt-1 ${contentClassName}`}>{children}</div>
      )}
    </section>
  )
}
/* eslint-enable react/prop-types */

const LangGraphFlowDesigner = () => {
  // --- STATE MANAGEMENT ---
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [tools, setTools] = useState([])
  const [newToolName, setNewToolName] = useState('')
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEdge, setSelectedEdge] = useState(null)
  const [selectedNodes, setSelectedNodes] = useState(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [gridSize, setGridSize] = useState(20)
  const [draggedNode, setDraggedNode] = useState(null)
  const [connectionMode, setConnectionMode] = useState(false)
  const [connectionType, setConnectionType] = useState('edge')
  const [connectionStart, setConnectionStart] = useState(null)
  const [showNodePanel, setShowNodePanel] = useState(false)
  const [showEdgePanel, setShowEdgePanel] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [nextNodeId, setNextNodeId] = useState(1)
  const [nextEdgeId, setNextEdgeId] = useState(1)
  const [nextToolId, setNextToolId] = useState(1)
  const [showJsonViewer, setShowJsonViewer] = useState(false)
  const [jsonImportValue, setJsonImportValue] = useState('')
  const [jsonImportError, setJsonImportError] = useState('')
  const [jsonImportSuccess, setJsonImportSuccess] = useState('')
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [exportFormat, setExportFormat] = useState('png')
  const [exportTransparentBg, setExportTransparentBg] = useState(false)
  const [exportShowGrid, setExportShowGrid] = useState(true)
  const [isExportingImage, setIsExportingImage] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const storedTheme = window.localStorage.getItem('theme')
    if (storedTheme) {
      return storedTheme === 'dark'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // --- UNDO/REDO SYSTEM ---
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isUndoRedoRef = useRef(false)

  // --- REFS ---
  const canvasRef = useRef(null)

  // --- CONSTANTS & CONFIGURATION ---
  const nodeTypes = [
    {
      type: 'node',
      label: 'Node',
      icon: MessageSquare,
      color: '#3B82F6',
      shape: 'rounded',
    },
    {
      type: 'START',
      label: 'START',
      icon: Circle,
      color: '#8B5CF6',
      shape: 'circle',
    },
    {
      type: 'END',
      label: 'END',
      icon: Square,
      color: '#EF4444',
      shape: 'square',
    },
    {
      type: 'subgraph',
      label: 'Subgraph',
      icon: Hexagon,
      color: '#6366F1',
      shape: 'hexagon',
    },
  ]
  const edgeTypes = [
    { type: 'edge', label: 'Edge', style: 'solid' },
    { type: 'conditional_edge', label: 'Conditional Edge', style: 'dashed' },
  ]

  // --- UNDO/REDO FUNCTIONS ---

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true
      const previousState = history[historyIndex - 1]
      setNodes(previousState.nodes)
      setEdges(previousState.edges)
      setTools(previousState.tools)
      setNextNodeId(previousState.nextNodeId)
      setNextEdgeId(previousState.nextEdgeId)
      setNextToolId(previousState.nextToolId)
      setHistoryIndex(prev => prev - 1)
      setSelectedNode(null)
      setSelectedEdge(null)
      setShowNodePanel(false)
      setShowEdgePanel(false)
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 0)
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true
      const nextState = history[historyIndex + 1]
      setNodes(nextState.nodes)
      setEdges(nextState.edges)
      setTools(nextState.tools)
      setNextNodeId(nextState.nextNodeId)
      setNextEdgeId(nextState.nextEdgeId)
      setNextToolId(nextState.nextToolId)
      setHistoryIndex(prev => prev + 1)
      setSelectedNode(null)
      setSelectedEdge(null)
      setShowNodePanel(false)
      setShowEdgePanel(false)
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 0)
    }
  }, [history, historyIndex])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
    }
  }, [isDarkMode])

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev)
  }, [])

  // --- GRID SNAP FUNCTIONS ---
  const snapToGridFn = useCallback((x, y) => {
    if (!snapToGrid) return { x, y }
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    }
  }, [snapToGrid, gridSize])

  // --- ALIGNMENT FUNCTIONS ---
  const alignNodes = useCallback((type) => {
    if (selectedNodes.size < 2) return
    
    const selectedNodeList = nodes.filter(node => selectedNodes.has(node.id))
    
    if (type === 'left') {
      const leftmost = Math.min(...selectedNodeList.map(node => node.x))
      setNodes(currentNodes => 
        currentNodes.map(node => 
          selectedNodes.has(node.id) ? { ...node, x: leftmost } : node
        )
      )
    } else if (type === 'right') {
      const rightmost = Math.max(...selectedNodeList.map(node => node.x))
      setNodes(currentNodes => 
        currentNodes.map(node => 
          selectedNodes.has(node.id) ? { ...node, x: rightmost } : node
        )
      )
    } else if (type === 'top') {
      const topmost = Math.min(...selectedNodeList.map(node => node.y))
      setNodes(currentNodes => 
        currentNodes.map(node => 
          selectedNodes.has(node.id) ? { ...node, y: topmost } : node
        )
      )
    } else if (type === 'bottom') {
      const bottommost = Math.max(...selectedNodeList.map(node => node.y))
      setNodes(currentNodes => 
        currentNodes.map(node => 
          selectedNodes.has(node.id) ? { ...node, y: bottommost } : node
        )
      )
    } else if (type === 'horizontal') {
      const centerY = selectedNodeList.reduce((sum, node) => sum + node.y, 0) / selectedNodeList.length
      setNodes(currentNodes => 
        currentNodes.map(node => 
          selectedNodes.has(node.id) ? { ...node, y: centerY } : node
        )
      )
    } else if (type === 'vertical') {
      const centerX = selectedNodeList.reduce((sum, node) => sum + node.x, 0) / selectedNodeList.length
      setNodes(currentNodes => 
        currentNodes.map(node => 
          selectedNodes.has(node.id) ? { ...node, x: centerX } : node
        )
      )
    }
  }, [selectedNodes, nodes])

  const distributeNodes = useCallback((type) => {
    if (selectedNodes.size < 3) return
    
    const selectedNodeList = nodes
      .filter(node => selectedNodes.has(node.id))
      .sort((a, b) => type === 'horizontal' ? a.x - b.x : a.y - b.y)
    
    if (type === 'horizontal') {
      const totalWidth = selectedNodeList[selectedNodeList.length - 1].x - selectedNodeList[0].x
      const spacing = totalWidth / (selectedNodeList.length - 1)
      
      setNodes(currentNodes => 
        currentNodes.map(node => {
          const index = selectedNodeList.findIndex(n => n.id === node.id)
          if (index >= 0) {
            return { ...node, x: selectedNodeList[0].x + (index * spacing) }
          }
          return node
        })
      )
    } else if (type === 'vertical') {
      const totalHeight = selectedNodeList[selectedNodeList.length - 1].y - selectedNodeList[0].y
      const spacing = totalHeight / (selectedNodeList.length - 1)
      
      setNodes(currentNodes => 
        currentNodes.map(node => {
          const index = selectedNodeList.findIndex(n => n.id === node.id)
          if (index >= 0) {
            return { ...node, y: selectedNodeList[0].y + (index * spacing) }
          }
          return node
        })
      )
    }
  }, [selectedNodes, nodes])

  // --- MULTI-SELECT FUNCTIONS ---
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedNodes(new Set())
    setSelectedNode(null)
    setSelectedEdge(null)
    setShowNodePanel(false)
    setShowEdgePanel(false)
  }, [isSelectionMode])

  const toggleNodeSelection = nodeId => {
    setSelectedNodes(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(nodeId)) {
        newSelection.delete(nodeId)
      } else {
        newSelection.add(nodeId)
      }
      return newSelection
    })
  }

  const clearSelection = () => {
    setSelectedNodes(new Set())
  }

  const selectAllNodes = useCallback(() => {
    setSelectedNodes(new Set(nodes.map(node => node.id)))
  }, [nodes])

  const deleteSelectedNodes = useCallback(() => {
    if (selectedNodes.size === 0) return

    const selectedNodeIds = Array.from(selectedNodes)
    
    // Remove nodes
    setNodes(currentNodes => 
      currentNodes.filter(node => !selectedNodeIds.includes(node.id))
    )
    
    // Remove edges connected to deleted nodes
    setEdges(currentEdges => 
      currentEdges.filter(edge => 
        !selectedNodeIds.includes(edge.from) && !selectedNodeIds.includes(edge.to)
      )
    )
    
    setSelectedNodes(new Set())
  }, [selectedNodes])

  const duplicateSelectedNodes = useCallback(() => {
    if (selectedNodes.size === 0) return

    const selectedNodeList = nodes.filter(node => selectedNodes.has(node.id))
    const newNodes = []
    const nodeIdMap = new Map()

    selectedNodeList.forEach(node => {
      const newNodeId = `node-${nextNodeId + newNodes.length}`
      const newNode = {
        ...node,
        id: newNodeId,
        x: node.x + 50,
        y: node.y + 50,
      }
      newNodes.push(newNode)
      nodeIdMap.set(node.id, newNodeId)
    })

    // Add duplicated nodes
    setNodes(currentNodes => [...currentNodes, ...newNodes])
    setNextNodeId(prev => prev + newNodes.length)

    // Select the duplicated nodes
    setSelectedNodes(new Set(newNodes.map(node => node.id)))
  }, [selectedNodes, nodes, nextNodeId])

  // --- CORE LOGIC: NODES, EDGES, & TOOLS ---
  const addTool = e => {
    e.preventDefault()
    if (newToolName.trim() && !tools.some(t => t.name === newToolName.trim())) {
      const newTool = { id: `tool-${nextToolId}`, name: newToolName.trim() }
      setTools([...tools, newTool])
      setNextToolId(nextToolId + 1)
      setNewToolName('')
    }
  }

  const deleteTool = toolId => {
    setTools(tools.filter(t => t.id !== toolId))
    setNodes(currentNodes =>
      currentNodes.map(node => {
        if (node.tools?.includes(toolId)) {
          return { ...node, tools: node.tools.filter(id => id !== toolId) }
        }
        return node
      })
    )
  }

  const toggleToolAssociation = toolId => {
    if (!selectedNode) return
    const currentTools = selectedNode.tools || []
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter(id => id !== toolId)
      : [...currentTools, toolId]
    updateNode(selectedNode.id, { tools: newTools })
  }

  const addNode = type => {
    const nodeType = nodeTypes.find(nt => nt.type === type)
    const basePos = { x: (200 - pan.x) / zoom, y: (200 - pan.y) / zoom }
    const snappedPos = snapToGridFn(basePos.x, basePos.y)
    const newNode = {
      id: `node-${nextNodeId}`,
      type: type,
      label: `${nodeType.label} ${nextNodeId}`,
      x: snappedPos.x,
      y: snappedPos.y,
      width: 120,
      height: 60,
      color: nodeType.color,
      shape: nodeType.shape,
      description: '',
      properties: {},
      tools: [],
    }
    setNodes(prevNodes => [...prevNodes, newNode])
    setNextNodeId(nextNodeId + 1)
    setSelectedNode(newNode)
    setShowNodePanel(true)
  }

  const deleteNode = useCallback(
    nodeId => {
      setNodes(nodes => nodes.filter(node => node.id !== nodeId))
      setEdges(edges =>
        edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
      )
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
        setShowNodePanel(false)
      }
    },
    [selectedNode]
  )

  const deleteEdge = useCallback(
    edgeId => {
      setEdges(edges => edges.filter(edge => edge.id !== edgeId))
      if (selectedEdge?.id === edgeId) {
        setSelectedEdge(null)
        setShowEdgePanel(false)
      }
    },
    [selectedEdge]
  )

  const updateNode = (nodeId, updates) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    )
    if (selectedNode && selectedNode.id === nodeId) {
      setSelectedNode(prevSelected => ({ ...prevSelected, ...updates }))
    }
  }

  const updateEdge = (edgeId, updates) => {
    setEdges(prevEdges =>
      prevEdges.map(edge =>
        edge.id === edgeId ? { ...edge, ...updates } : edge
      )
    )
    if (selectedEdge && selectedEdge.id === edgeId) {
      setSelectedEdge(prevSelected => ({ ...prevSelected, ...updates }))
    }
  }

  // --- EVENT HANDLERS ---
  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation()
    if (connectionMode) {
      if (!connectionStart) {
        setConnectionStart(node)
      } else if (connectionStart.id !== node.id) {
        const edgeType = edgeTypes.find(et => et.type === connectionType)
        const newEdge = {
          id: `edge-${nextEdgeId}`,
          source: connectionStart.id,
          target: node.id,
          type: connectionType,
          label: connectionType === 'conditional_edge' ? 'condition' : '',
          style: edgeType.style,
          color: connectionType === 'conditional_edge' ? '#F59E0B' : '#6B7280',
          condition: connectionType === 'conditional_edge' ? '' : '',
        }
        setEdges([...edges, newEdge])
        setNextEdgeId(nextEdgeId + 1)
        setSelectedEdge(newEdge)
        setSelectedNode(null)
        setShowEdgePanel(true)
        setShowNodePanel(false)
        setConnectionStart(null)
        setConnectionMode(false)
      }
    } else {
      if (isSelectionMode) {
        toggleNodeSelection(node.id)
      } else {
        setSelectedNode(node)
        setSelectedEdge(null)
        setShowNodePanel(true)
        setShowEdgePanel(false)
        setDraggedNode(node)
        setSelectedNodes(new Set())
      }
    }
  }

  const handleMouseMove = e => {
    if (draggedNode && !connectionMode) {
      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - pan.x) / zoom
      const y = (e.clientY - rect.top - pan.y) / zoom
      const snappedPos = snapToGridFn(
        x - draggedNode.width / 2,
        y - draggedNode.height / 2
      )
      updateNode(draggedNode.id, {
        x: snappedPos.x,
        y: snappedPos.y,
      })
    }
    if (isPanning) {
      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y
      setPan({ x: pan.x + deltaX, y: pan.y + deltaY })
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setDraggedNode(null)
    setIsPanning(false)
  }

  const handleCanvasMouseDown = e => {
    if (
      e.target === canvasRef.current.firstChild ||
      e.target === canvasRef.current
    ) {
      setSelectedNode(null)
      setSelectedEdge(null)
      setShowNodePanel(false)
      setShowEdgePanel(false)
      setConnectionStart(null)
      setConnectionMode(false)
      setConnectionType('edge')
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const calculateZoomChange = (currentZoom, direction) => {
    const currentPercent = Math.round(currentZoom * 100)
    const clampedPercent = Math.min(
      Math.max(currentPercent + direction * 10, 10),
      300,
    )
    return clampedPercent / 100
  }

  const handleWheel = e => {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const direction = e.deltaY > 0 ? -1 : 1
    const newZoom = calculateZoomChange(zoom, direction)

    if (newZoom === zoom) {
      return
    }

    const deltaZoom = newZoom - zoom
    setPan({
      x: pan.x - ((mouseX - pan.x) * deltaZoom) / zoom,
      y: pan.y - ((mouseY - pan.y) * deltaZoom) / zoom,
    })
    setZoom(newZoom)
  }

  // --- RENDER FUNCTIONS ---
  const renderNode = node => {
    const nodeType = nodeTypes.find(nt => nt.type === node.type)
    const Icon = nodeType.icon
    const isSelected = selectedNode?.id === node.id
    const isMultiSelected = selectedNodes.has(node.id)
    const hasTools = node.tools && node.tools.length > 0

    return (
      <div
        key={node.id}
        className={`absolute cursor-move select-none transition-all duration-150 ${
          isSelected 
            ? 'ring-2 ring-blue-500 shadow-lg' 
            : isMultiSelected 
              ? 'ring-2 ring-orange-500 shadow-lg' 
              : 'shadow-md'
        }`}
        style={{
          left: node.x,
          top: node.y,
          width: node.width,
          height: node.height,
          backgroundColor: node.color,
          color: 'white',
          borderRadius:
            node.shape === 'rounded'
              ? '8px'
              : node.shape === 'circle'
                ? '50%'
                : '4px',
          pointerEvents: 'auto',
        }}
        onMouseDown={e => handleNodeMouseDown(e, node)}
      >
        <div className="w-full h-full flex flex-col items-center justify-center text-xs font-medium p-1">
          <Icon size={16} className="mb-1" />
          <span className="text-center px-1 truncate">{node.label}</span>
        </div>
        {isSelected && (
          <button
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 z-20"
            onClick={e => {
              e.stopPropagation()
              deleteNode(node.id)
            }}
          >
            <Trash2 size={10} />
          </button>
        )}
        {hasTools && (
          <div
            className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center z-10"
            title={`Tools: ${tools
              .filter(t => node.tools.includes(t.id))
              .map(t => t.name)
              .join(', ')}`}
          >
            <Wrench size={10} />
          </div>
        )}
      </div>
    )
  }

  const renderEdge = edge => {
    const sourceNode = nodes.find(n => n.id === edge.source)
    const targetNode = nodes.find(n => n.id === edge.target)
    if (!sourceNode || !targetNode) return null

    // Calculate center points
    const sourceX = sourceNode.x + sourceNode.width / 2
    const sourceY = sourceNode.y + sourceNode.height / 2
    const targetX = targetNode.x + targetNode.width / 2
    const targetY = targetNode.y + targetNode.height / 2

    // Check if this is a self-loop or bidirectional edge
    const isSelfLoop = edge.source === edge.target
    const reverseEdgeExists = edges.some(
      e =>
        e.source === edge.target && e.target === edge.source && e.id !== edge.id
    )

    let path
    let labelX, labelY

    if (isSelfLoop) {
      // Self-loop: create a loop on the right side of the node
      const loopRadius = 40
      const nodeRadius = Math.max(sourceNode.width, sourceNode.height) / 2 + 5
      const startAngle = -Math.PI / 6 // -30 degrees
      const endAngle = Math.PI / 6 // 30 degrees

      const startX = sourceX + Math.cos(startAngle) * nodeRadius
      const startY = sourceY + Math.sin(startAngle) * nodeRadius
      const endX = sourceX + Math.cos(endAngle) * nodeRadius
      const endY = sourceY + Math.sin(endAngle) * nodeRadius

      const cp1X = sourceX + loopRadius * 2
      const cp1Y = startY - loopRadius
      const cp2X = sourceX + loopRadius * 2
      const cp2Y = endY + loopRadius

      path = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
      labelX = sourceX + loopRadius * 1.5
      labelY = sourceY
    } else {
      // Calculate angle and connection points
      const angle = Math.atan2(targetY - sourceY, targetX - sourceX)

      // Calculate edge intersection with rectangular node boundary
      const getNodeEdgePoint = (node, centerX, centerY, angle, isSource) => {
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const halfWidth = node.width / 2
        const halfHeight = node.height / 2
        const buffer = 5 // 5px buffer

        // Calculate intersection with rectangle edges
        let t
        if (Math.abs(cos) * halfHeight > Math.abs(sin) * halfWidth) {
          // Intersects with left or right edge
          t = (halfWidth + buffer) / Math.abs(cos)
        } else {
          // Intersects with top or bottom edge
          t = (halfHeight + buffer) / Math.abs(sin)
        }

        return {
          x: centerX + (isSource ? cos * t : -cos * t),
          y: centerY + (isSource ? sin * t : -sin * t),
        }
      }

      const sourcePoint = getNodeEdgePoint(
        sourceNode,
        sourceX,
        sourceY,
        angle,
        true
      )
      const targetPoint = getNodeEdgePoint(
        targetNode,
        targetX,
        targetY,
        angle,
        false
      )

      if (reverseEdgeExists) {
        // Simple approach: one edge curves up, the other curves down
        const curvature = 40
        const offsetDistance = 8 // pixels to offset connection points

        // Curve up if source comes before target alphabetically, down otherwise
        const curveUp = edge.source < edge.target
        const offsetY = curveUp ? -offsetDistance : offsetDistance

        // Offset the connection points vertically
        const offsetSourcePoint = {
          x: sourcePoint.x,
          y: sourcePoint.y + offsetY,
        }
        const offsetTargetPoint = {
          x: targetPoint.x,
          y: targetPoint.y + offsetY,
        }

        const midX = (offsetSourcePoint.x + offsetTargetPoint.x) / 2
        const midY = (offsetSourcePoint.y + offsetTargetPoint.y) / 2
        const ctrlY = midY + (curveUp ? -curvature : curvature)

        path = `M ${offsetSourcePoint.x} ${offsetSourcePoint.y} Q ${midX} ${ctrlY} ${offsetTargetPoint.x} ${offsetTargetPoint.y}`
        // Position label halfway between the midpoint and control point for better visibility
        labelX = midX
        labelY = midY + (curveUp ? -curvature * 0.5 : curvature * 0.5)
      } else {
        // Straight line for single edges
        path = `M ${sourcePoint.x} ${sourcePoint.y} L ${targetPoint.x} ${targetPoint.y}`
        labelX = (sourcePoint.x + targetPoint.x) / 2
        labelY = (sourcePoint.y + targetPoint.y) / 2
      }
    }

    const isSelected = selectedEdge?.id === edge.id
    const isConditional = edge.type === 'conditional_edge'
    const strokeColor = isSelected
      ? '#3B82F6'
      : isConditional
        ? '#F59E0B'
        : edge.color || '#6B7280'
    const strokeWidth = isSelected ? 3 : 2
    const strokeDasharray = isConditional
      ? '8,4'
      : edge.style === 'dashed'
        ? '5,5'
        : 'none'
    const arrowMarker = isSelected
      ? 'arrowhead-blue'
      : isConditional
        ? 'arrowhead-orange'
        : 'arrowhead-gray'

    return (
      <g key={edge.id}>
        <path
          d={path}
          fill="none"
          stroke="transparent"
          strokeWidth="20"
          className="cursor-pointer"
          onClick={() => {
            setSelectedEdge(edge)
            setSelectedNode(null)
            setShowEdgePanel(true)
            setShowNodePanel(false)
          }}
        />
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          markerEnd={`url(#${arrowMarker})`}
          className="pointer-events-none"
        />
        {edge.label && (
          <text
            x={labelX}
            y={labelY}
            textAnchor="middle"
            dy="-8"
            fontSize="11"
            fill="#374151"
            className="pointer-events-none font-medium"
            style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}
          >
            {edge.label}
          </text>
        )}
        {isSelected && (
          <g
            className="cursor-pointer"
            onClick={e => {
              e.stopPropagation()
              deleteEdge(edge.id)
            }}
          >
            <circle
              cx={labelX}
              cy={labelY + 15}
              r="10"
              fill="#EF4444"
              stroke="white"
              strokeWidth="1.5"
            />
            <text
              x={labelX}
              y={labelY + 15}
              textAnchor="middle"
              dy="4"
              fontSize="12"
              fill="white"
              className="pointer-events-none font-bold"
            >
              ×
            </text>
          </g>
        )}
      </g>
    )
  }

  // --- FILE I/O ---
  const exportDesign = () => {
    try {
      const design = { nodes, edges, tools, nextNodeId, nextEdgeId, nextToolId }
      const blob = new Blob([JSON.stringify(design, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'langgraph-design.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export design. Please try again.')
    }
  }

  const downloadGraphImage = useCallback(async () => {
    if (isExportingImage) return

    setIsExportingImage(true)

    try {
      const effectiveTransparent = exportFormat === 'png' && exportTransparentBg
      const padding = 60
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    const updateBounds = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }

    const includeRect = (x, y, width, height) => {
      updateBounds(x, y)
      updateBounds(x + width, y + height)
    }

    nodes.forEach(node => {
      includeRect(node.x - 4, node.y - 4, node.width + 8, node.height + 8)
    })

    const edgeDrawData = []

    const computeEdgeDrawData = edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      if (!sourceNode || !targetNode) return null

      const sourceX = sourceNode.x + sourceNode.width / 2
      const sourceY = sourceNode.y + sourceNode.height / 2
      const targetX = targetNode.x + targetNode.width / 2
      const targetY = targetNode.y + targetNode.height / 2

      const isSelfLoop = edge.source === edge.target
      const reverseEdgeExists = edges.some(
        e => e.source === edge.target && e.target === edge.source && e.id !== edge.id
      )

      const isConditional = edge.type === 'conditional_edge'
      const isSelected = selectedEdge?.id === edge.id
      const strokeColor = isSelected
        ? '#3B82F6'
        : isConditional
          ? '#F59E0B'
          : edge.color || '#6B7280'
      const strokeWidth = isSelected ? 3 : 2
      const dash = isConditional ? [8, 4] : edge.style === 'dashed' ? [5, 5] : []

      const applyBoundsFromPoints = points => {
        points.forEach(point => updateBounds(point.x, point.y))
      }

      if (isSelfLoop) {
        const loopRadius = 40
        const nodeRadius = Math.max(sourceNode.width, sourceNode.height) / 2 + 5
        const startAngle = -Math.PI / 6
        const endAngle = Math.PI / 6

        const startX = sourceX + Math.cos(startAngle) * nodeRadius
        const startY = sourceY + Math.sin(startAngle) * nodeRadius
        const endX = sourceX + Math.cos(endAngle) * nodeRadius
        const endY = sourceY + Math.sin(endAngle) * nodeRadius

        const cp1X = sourceX + loopRadius * 2
        const cp1Y = startY - loopRadius
        const cp2X = sourceX + loopRadius * 2
        const cp2Y = endY + loopRadius

        const labelX = sourceX + loopRadius * 1.5
        const labelY = sourceY

        applyBoundsFromPoints([
          { x: startX, y: startY },
          { x: endX, y: endY },
          { x: cp1X, y: cp1Y },
          { x: cp2X, y: cp2Y },
        ])
        if (edge.label) {
          updateBounds(labelX - 50, labelY - 40)
          updateBounds(labelX + 50, labelY + 40)
        }

        return {
          type: 'bezier',
          start: { x: startX, y: startY },
          cp1: { x: cp1X, y: cp1Y },
          cp2: { x: cp2X, y: cp2Y },
          end: { x: endX, y: endY },
          prev: { x: cp2X, y: cp2Y },
          label: edge.label
            ? { text: edge.label, x: labelX, y: labelY }
            : null,
          strokeColor,
          strokeWidth,
          dash,
        }
      }

      const angle = Math.atan2(targetY - sourceY, targetX - sourceX)

      const getNodeEdgePoint = (node, centerX, centerY, edgeAngle, isSource) => {
        const cos = Math.cos(edgeAngle)
        const sin = Math.sin(edgeAngle)
        const halfWidth = node.width / 2
        const halfHeight = node.height / 2
        const buffer = 5

        let t
        if (Math.abs(cos) * halfHeight > Math.abs(sin) * halfWidth) {
          t = (halfWidth + buffer) / Math.abs(cos)
        } else {
          t = (halfHeight + buffer) / Math.abs(sin)
        }

        return {
          x: centerX + (isSource ? cos * t : -cos * t),
          y: centerY + (isSource ? sin * t : -sin * t),
        }
      }

      const sourcePoint = getNodeEdgePoint(sourceNode, sourceX, sourceY, angle, true)
      const targetPoint = getNodeEdgePoint(targetNode, targetX, targetY, angle, false)

      if (reverseEdgeExists) {
        const curvature = 40
        const offsetDistance = 8
        const curveUp = edge.source < edge.target
        const offsetY = curveUp ? -offsetDistance : offsetDistance

        const offsetSourcePoint = {
          x: sourcePoint.x,
          y: sourcePoint.y + offsetY,
        }
        const offsetTargetPoint = {
          x: targetPoint.x,
          y: targetPoint.y + offsetY,
        }

        const midX = (offsetSourcePoint.x + offsetTargetPoint.x) / 2
        const midY = (offsetSourcePoint.y + offsetTargetPoint.y) / 2
        const ctrlY = midY + (curveUp ? -curvature : curvature)

        const labelX = midX
        const labelY = midY + (curveUp ? -curvature * 0.5 : curvature * 0.5)

        applyBoundsFromPoints([
          offsetSourcePoint,
          offsetTargetPoint,
          { x: midX, y: ctrlY },
        ])
        if (edge.label) {
          updateBounds(labelX - 50, labelY - 40)
          updateBounds(labelX + 50, labelY + 40)
        }

        return {
          type: 'quadratic',
          start: offsetSourcePoint,
          control: { x: midX, y: ctrlY },
          end: offsetTargetPoint,
          prev: { x: midX, y: ctrlY },
          label: edge.label
            ? { text: edge.label, x: labelX, y: labelY }
            : null,
          strokeColor,
          strokeWidth,
          dash,
        }
      }

      const labelX = (sourcePoint.x + targetPoint.x) / 2
      const labelY = (sourcePoint.y + targetPoint.y) / 2

      applyBoundsFromPoints([sourcePoint, targetPoint])
      if (edge.label) {
        updateBounds(labelX - 50, labelY - 40)
        updateBounds(labelX + 50, labelY + 40)
      }

      return {
        type: 'line',
        start: sourcePoint,
        end: targetPoint,
        prev: sourcePoint,
        label: edge.label ? { text: edge.label, x: labelX, y: labelY } : null,
        strokeColor,
        strokeWidth,
        dash,
      }
    }

    edges.forEach(edge => {
      const data = computeEdgeDrawData(edge)
      if (data) {
        edgeDrawData.push(data)
      }
    })

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      const defaultWidth = 800
      const defaultHeight = 600
      minX = -defaultWidth / 2
      maxX = defaultWidth / 2
      minY = -defaultHeight / 2
      maxY = defaultHeight / 2
    }

    const canvasWidth = maxX - minX + padding * 2
    const canvasHeight = maxY - minY + padding * 2
    const offsetX = minX - padding
    const offsetY = minY - padding

    const scale = window.devicePixelRatio > 1 ? 2 : 1
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(canvasWidth * scale))
    canvas.height = Math.max(1, Math.round(canvasHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas context not available')
    }

    ctx.scale(scale, scale)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (!effectiveTransparent) {
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(0, 0, canvasWidth, canvasHeight)
    }

    if (exportShowGrid) {
      ctx.save()
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 0.5
      ctx.setLineDash([])
      const startGridX = Math.floor(offsetX / gridSize) * gridSize
      const endGridX = Math.ceil((offsetX + canvasWidth) / gridSize) * gridSize
      for (let x = startGridX; x <= endGridX; x += gridSize) {
        const drawX = x - offsetX
        ctx.beginPath()
        ctx.moveTo(drawX, 0)
        ctx.lineTo(drawX, canvasHeight)
        ctx.stroke()
      }
      const startGridY = Math.floor(offsetY / gridSize) * gridSize
      const endGridY = Math.ceil((offsetY + canvasHeight) / gridSize) * gridSize
      for (let y = startGridY; y <= endGridY; y += gridSize) {
        const drawY = y - offsetY
        ctx.beginPath()
        ctx.moveTo(0, drawY)
        ctx.lineTo(canvasWidth, drawY)
        ctx.stroke()
      }
      ctx.restore()
    }

    const translatePoint = point => ({
      x: point.x - offsetX,
      y: point.y - offsetY,
    })

    const drawArrowhead = (from, to, color) => {
      const angle = Math.atan2(to.y - from.y, to.x - from.x)
      const size = 10
      ctx.save()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(
        to.x - size * Math.cos(angle - Math.PI / 6),
        to.y - size * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        to.x - size * Math.cos(angle + Math.PI / 6),
        to.y - size * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    edgeDrawData.forEach(drawData => {
      const { type, start, end, prev, cp1, cp2, control, strokeColor, strokeWidth, dash, label } = drawData
      const startPoint = translatePoint(start)
      const endPoint = translatePoint(end)

      ctx.save()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctx.setLineDash(dash)
      ctx.beginPath()
      ctx.moveTo(startPoint.x, startPoint.y)
      if (type === 'bezier') {
        const cp1Point = translatePoint(cp1)
        const cp2Point = translatePoint(cp2)
        ctx.bezierCurveTo(cp1Point.x, cp1Point.y, cp2Point.x, cp2Point.y, endPoint.x, endPoint.y)
      } else if (type === 'quadratic') {
        const controlPoint = translatePoint(control)
        ctx.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y)
      } else {
        ctx.lineTo(endPoint.x, endPoint.y)
      }
      ctx.stroke()
      ctx.restore()

      const prevPoint = translatePoint(prev)
      drawArrowhead(prevPoint, endPoint, strokeColor)

      if (label) {
        const labelX = label.x - offsetX
        const labelY = label.y - offsetY - 8
        ctx.save()
        ctx.font = '11px "Inter", "Helvetica Neue", Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const metrics = ctx.measureText(label.text)
        const textWidth = metrics.width
        const textHeight = 16
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.fillRect(labelX - textWidth / 2 - 6, labelY - textHeight / 2, textWidth + 12, textHeight)
        ctx.fillStyle = '#374151'
        ctx.fillText(label.text, labelX, labelY)
        ctx.restore()
      }
    })

    const drawNodePath = (ctxRef, x, y, width, height, shape) => {
      if (shape === 'circle') {
        const radius = Math.min(width, height) / 2
        ctxRef.beginPath()
        ctxRef.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2)
        return
      }

      if (shape === 'hexagon') {
        const points = [
          { x: x + width * 0.25, y },
          { x: x + width * 0.75, y },
          { x: x + width, y: y + height / 2 },
          { x: x + width * 0.75, y: y + height },
          { x: x + width * 0.25, y: y + height },
          { x: x, y: y + height / 2 },
        ]
        ctxRef.beginPath()
        ctxRef.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i += 1) {
          ctxRef.lineTo(points[i].x, points[i].y)
        }
        ctxRef.closePath()
        return
      }

      const radius = shape === 'rounded' ? 8 : 4
      ctxRef.beginPath()
      ctxRef.moveTo(x + radius, y)
      ctxRef.lineTo(x + width - radius, y)
      ctxRef.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctxRef.lineTo(x + width, y + height - radius)
      ctxRef.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctxRef.lineTo(x + radius, y + height)
      ctxRef.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctxRef.lineTo(x, y + radius)
      ctxRef.quadraticCurveTo(x, y, x + radius, y)
      ctxRef.closePath()
    }

    const wrapText = (ctxRef, text, x, y, maxWidth, lineHeight) => {
      if (!text) return
      const words = text.split(' ')
      const lines = []
      let currentLine = ''

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const { width } = ctxRef.measureText(testLine)
        if (width > maxWidth && currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      })

      if (currentLine) {
        lines.push(currentLine)
      }

      const totalHeight = (lines.length - 1) * lineHeight
      const startY = y - totalHeight / 2
      lines.forEach((line, index) => {
        ctxRef.fillText(line, x, startY + index * lineHeight)
      })
    }

    nodes.forEach(node => {
      const translatedX = node.x - offsetX
      const translatedY = node.y - offsetY
      const isSelected = selectedNode?.id === node.id
      const isMultiSelected = selectedNodes.has(node.id)
      const highlightColor = isSelected ? '#3B82F6' : '#F97316'

      ctx.save()
      drawNodePath(ctx, translatedX, translatedY, node.width, node.height, node.shape)
      ctx.fillStyle = node.color || '#3B82F6'
      ctx.fill()
      if (isSelected || isMultiSelected) {
        ctx.lineWidth = 4
        ctx.strokeStyle = highlightColor
        ctx.shadowColor = `${highlightColor}55`
        ctx.shadowBlur = 12
        ctx.stroke()
      }
      ctx.restore()

      ctx.save()
      ctx.fillStyle = 'white'
      ctx.font = '12px "Inter", "Helvetica Neue", Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      wrapText(
        ctx,
        node.label || '',
        translatedX + node.width / 2,
        translatedY + node.height / 2,
        node.width - 16,
        14
      )
      ctx.restore()

      if (node.tools && node.tools.length > 0) {
        ctx.save()
        ctx.fillStyle = '#22c55e'
        ctx.beginPath()
        ctx.arc(translatedX + 10, translatedY + 10, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    })

      const mimeType = exportFormat === 'png' ? 'image/png' : 'image/jpeg'
      const quality = exportFormat === 'jpeg' ? 0.95 : undefined
      const dataUrl = canvas.toDataURL(mimeType, quality)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.download = `langgraph-design-${timestamp}.${exportFormat}`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Image export failed:', error)
      alert('Failed to export image. Please try again.')
    } finally {
      setIsExportingImage(false)
    }
  }, [
    edges,
    exportFormat,
    exportShowGrid,
    exportTransparentBg,
    gridSize,
    isExportingImage,
    nodes,
    selectedEdge,
    selectedNode,
    selectedNodes,
  ])

  const loadCurrentDesignIntoImport = useCallback(() => {
    const json = JSON.stringify(
      { nodes, edges, tools, nextNodeId, nextEdgeId, nextToolId },
      null,
      2
    )
    setJsonImportValue(json)
    setJsonImportError('')
    setJsonImportSuccess('')
  }, [nodes, edges, tools, nextNodeId, nextEdgeId, nextToolId])

  const applyJsonImport = useCallback(() => {
    if (!jsonImportValue.trim()) {
      setJsonImportError('Please paste JSON into the editor before importing.')
      setJsonImportSuccess('')
      return
    }

    try {
      const design = JSON.parse(jsonImportValue)
      if (!design || typeof design !== 'object') {
        throw new Error('Invalid design structure')
      }

      setNodes(design.nodes || [])
      setEdges(design.edges || [])
      setTools(design.tools || [])
      setNextNodeId(design.nextNodeId || 1)
      setNextEdgeId(design.nextEdgeId || 1)
      setNextToolId(design.nextToolId || 1)

      setJsonImportError('')
      setJsonImportSuccess('Design imported successfully.')
    } catch (error) {
      console.error('JSON import failed:', error)
      setJsonImportSuccess('')
      setJsonImportError(
        'Failed to import JSON. Please ensure it is valid LangGraph design JSON.'
      )
    }
  }, [
    jsonImportValue,
    setEdges,
    setNextEdgeId,
    setNextNodeId,
    setNextToolId,
    setNodes,
    setTools,
  ])

  // --- SIDE EFFECTS ---
  useEffect(() => {
    // Initialize history with empty state
    if (history.length === 0) {
      const initialState = {
        nodes: [],
        edges: [],
        tools: [],
        nextNodeId: 1,
        nextEdgeId: 1,
        nextToolId: 1,
      }
      setHistory([initialState])
      setHistoryIndex(0)
    }
  }, [history.length])

  useEffect(() => {
    if (exportFormat === 'jpeg' && exportTransparentBg) {
      setExportTransparentBg(false)
    }
  }, [exportFormat, exportTransparentBg])

  // Auto-save to history when state changes (but not during undo/redo)
  useEffect(() => {
    if (!isUndoRedoRef.current && history.length > 0) {
      const currentState = {
        nodes,
        edges,
        tools,
        nextNodeId,
        nextEdgeId,
        nextToolId,
      }

      const lastState = history[historyIndex]
      if (
        lastState &&
        JSON.stringify(currentState) !== JSON.stringify(lastState)
      ) {
        setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1)
          newHistory.push(currentState)
          if (newHistory.length > 50) {
            newHistory.shift()
            return newHistory
          }
          return newHistory
        })
        setHistoryIndex(prev => Math.min(prev + 1, 49))
      }
    }
  }, [
    nodes,
    edges,
    tools,
    nextNodeId,
    nextEdgeId,
    nextToolId,
    history,
    historyIndex,
  ])

  useEffect(() => {
    const handleKeyDown = e => {
      // Don't handle delete/backspace if user is typing in an input field
      const isTyping =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable

      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        if (selectedNodes.size > 0) {
          deleteSelectedNodes()
        } else if (selectedNode) {
          deleteNode(selectedNode.id)
        } else if (selectedEdge) {
          deleteEdge(selectedEdge.id)
        }
      }
      if (e.key === 'Escape') {
        setConnectionMode(false)
        setConnectionStart(null)
        setConnectionType('edge')
        setShowNodePanel(false)
        setShowEdgePanel(false)
        setSelectedNodes(new Set())
        setIsSelectionMode(false)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !isTyping) {
        e.preventDefault()
        selectAllNodes()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && !isTyping && selectedNodes.size > 0) {
        e.preventDefault()
        duplicateSelectedNodes()
      }
      if (e.key === 's' && !isTyping) {
        e.preventDefault()
        toggleSelectionMode()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, selectedEdge, selectedNodes, deleteNode, deleteEdge, deleteSelectedNodes, selectAllNodes, duplicateSelectedNodes, toggleSelectionMode, undo, redo])

  // --- JSX RENDER ---
  return (
    <div className="w-full h-screen flex bg-gray-100 font-sans text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Toolbar */}
      <div className="flex w-64 flex-col border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            LangGraph Flow Designer
          </h2>
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
        <div className="flex-grow space-y-4 overflow-y-auto">
          <SidebarSection title="Add Nodes" contentClassName="space-y-2">
            {nodeTypes.map(nodeType => {
              const Icon = nodeType.icon
              return (
                <button
                  key={nodeType.type}
                  onClick={() => addNode(nodeType.type)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 p-2 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <Icon size={16} style={{ color: nodeType.color }} />
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {nodeType.label}
                  </span>
                </button>
              )
            })}
          </SidebarSection>
          <SidebarSection title="Add Edges" contentClassName="space-y-2">
            <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Edge Type
                </label>
                <select
                  value={connectionType}
                  onChange={e => setConnectionType(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white p-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {edgeTypes.map(edgeType => (
                    <option key={edgeType.type} value={edgeType.type}>
                      {edgeType.label}
                    </option>
                  ))}
                </select>
              </div>
            <button
                onClick={() => setConnectionMode(!connectionMode)}
                className={`flex w-full items-center justify-start gap-2 rounded-lg border p-2 transition-all ${
                  connectionMode
                    ? 'border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                    : 'border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800'
                }`}
              >
                <Route size={16} />
                <span className="text-sm font-medium">
                  {connectionMode
                    ? 'Cancel Connection'
                    : `Add ${edgeTypes.find(et => et.type === connectionType)?.label || 'Edge'}`}
                </span>
              </button>
            {connectionMode && (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                {connectionStart
                  ? `Click target node...`
                  : `Click source node to start.`}
              </div>
            )}
          </SidebarSection>
          <SidebarSection title="Actions">
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="flex flex-1 items-center justify-start gap-1 rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                title="Undo (Ctrl+Z)"
              >
                <Undo size={16} />
                <span className="text-sm text-gray-700 dark:text-gray-200">Undo</span>
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="flex flex-1 items-center justify-start gap-1 rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                title="Redo (Ctrl+Y)"
              >
                <Redo size={16} />
                <span className="text-sm text-gray-700 dark:text-gray-200">Redo</span>
              </button>
            </div>
            <button
              onClick={toggleSelectionMode}
              className={`flex w-full items-center justify-start gap-2 rounded-lg border border-gray-200 p-2 transition-colors dark:border-gray-700 ${
                isSelectionMode
                  ? 'border-orange-300 bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-200'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Toggle Selection Mode (S)"
            >
              <Square size={16} />
              <span className="text-sm">
                {isSelectionMode ? 'Exit Selection' : 'Multi-Select'}
              </span>
            </button>
            {selectedNodes.size > 0 && (
              <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 p-2 dark:border-orange-700 dark:bg-orange-900/30">
                <div className="text-xs font-medium text-orange-700 dark:text-orange-200">
                  {selectedNodes.size} node{selectedNodes.size > 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={duplicateSelectedNodes}
                    className="flex flex-1 items-center justify-start gap-1 rounded-lg border border-orange-200 p-2 transition-colors hover:bg-orange-100 dark:border-orange-700 dark:hover:bg-orange-900/40"
                    title="Duplicate Selected (Ctrl+D)"
                  >
                    <Plus size={14} />
                    <span className="text-xs text-orange-700 dark:text-orange-200">Duplicate</span>
                  </button>
                  <button
                    onClick={deleteSelectedNodes}
                    className="flex flex-1 items-center justify-start gap-1 rounded-lg border border-red-200 p-2 transition-colors hover:bg-red-100 dark:border-red-700 dark:hover:bg-red-900/40"
                    title="Delete Selected (Delete)"
                  >
                    <Trash2 size={14} />
                    <span className="text-xs text-red-700 dark:text-red-300">Delete</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllNodes}
                    className="flex flex-1 items-center justify-start gap-1 rounded-lg border border-orange-200 p-2 transition-colors hover:bg-orange-100 dark:border-orange-700 dark:hover:bg-orange-900/40"
                    title="Select All (Ctrl+A)"
                  >
                    <Square size={14} />
                    <span className="text-xs text-orange-700 dark:text-orange-200">Select All</span>
                  </button>
                  <button
                    onClick={clearSelection}
                    className="flex flex-1 items-center justify-start gap-1 rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    title="Clear Selection"
                  >
                    <X size={14} />
                    <span className="text-xs text-gray-700 dark:text-gray-200">Clear</span>
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowExportOptions(prev => !prev)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 p-2 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <Download size={16} /> Export Options
                </span>
                {showExportOptions ? (
                  <ChevronUp size={16} className="text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {showExportOptions && (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                      Image Format
                    </label>
                    <select
                      value={exportFormat}
                      onChange={e => setExportFormat(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                    </select>
                  </div>
                  <label className={`flex items-center gap-2 text-sm ${
                    exportFormat === 'jpeg'
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={exportTransparentBg && exportFormat !== 'jpeg'}
                      onChange={e => setExportTransparentBg(e.target.checked)}
                      disabled={exportFormat === 'jpeg'}
                      className="rounded"
                    />
                    <span>Transparent background</span>
                  </label>
                  {exportFormat === 'jpeg' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Transparency is not supported for JPEG exports.
                    </p>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={exportShowGrid}
                      onChange={e => setExportShowGrid(e.target.checked)}
                      className="rounded"
                    />
                    <span>Include gridlines</span>
                  </label>
                  <button
                    type="button"
                    onClick={downloadGraphImage}
                    disabled={isExportingImage}
                    className={`flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      isExportingImage
                        ? 'cursor-not-allowed border-gray-200 bg-gray-200 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        : 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isExportingImage ? 'Exporting…' : 'Download Image'}
                  </button>
                </div>
              )}
            </div>
          </SidebarSection>
          <SidebarSection
            title="Grid & Alignment"
            collapsible
            defaultCollapsed
            contentClassName="space-y-3"
          >
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={e => setSnapToGrid(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-700 dark:text-gray-200">Snap to Grid</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Grid Size:</span>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={gridSize}
                  onChange={e => setGridSize(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="w-8 text-xs text-gray-600 dark:text-gray-400">{gridSize}</span>
              </div>
            </div>
            {selectedNodes.size >= 2 && (
              <div className="space-y-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">Align:</div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => alignNodes('left')}
                    className="rounded border p-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    title="Align Left"
                  >
                    ⬅
                  </button>
                  <button
                    onClick={() => alignNodes('vertical')}
                    className="rounded border p-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    title="Align Center (Vertical)"
                  >
                    ↕
                  </button>
                  <button
                    onClick={() => alignNodes('right')}
                    className="rounded border p-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    title="Align Right"
                  >
                    ➡
                  </button>
                  <button
                    onClick={() => alignNodes('top')}
                    className="rounded border p-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    title="Align Top"
                  >
                    ⬆
                  </button>
                  <button
                    onClick={() => alignNodes('horizontal')}
                    className="rounded border p-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    title="Align Center (Horizontal)"
                  >
                    ↔
                  </button>
                  <button
                    onClick={() => alignNodes('bottom')}
                    className="rounded border p-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                    title="Align Bottom"
                  >
                    ⬇
                  </button>
                </div>
                {selectedNodes.size >= 3 && (
                  <>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Distribute:</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => distributeNodes('horizontal')}
                        className="flex-1 rounded border p-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        title="Distribute Horizontally"
                      >
                        ↔ H
                      </button>
                      <button
                        onClick={() => distributeNodes('vertical')}
                        className="flex-1 rounded border p-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        title="Distribute Vertically"
                      >
                        ↕ V
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </SidebarSection>
        </div>
        <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              Tool Library
            </h3>
            <form onSubmit={addTool} className="flex gap-2">
              <input
                type="text"
                value={newToolName}
                onChange={e => setNewToolName(e.target.value)}
                placeholder="New tool name..."
                className="flex-grow rounded-lg border border-gray-300 p-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              <button
                type="submit"
                className="rounded-lg bg-green-600 p-2 text-white hover:bg-green-700"
              >
                <Plus size={16} />
              </button>
            </form>
            <div className="mt-2 max-h-24 space-y-1 overflow-y-auto">
              {tools.map(tool => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between rounded bg-gray-100 p-1.5 text-sm dark:bg-gray-800"
                >
                  <span className="truncate text-gray-800 dark:text-gray-100">{tool.name}</span>
                  <button
                    onClick={() => deleteTool(tool.id)}
                    className="text-gray-500 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              Key Concepts
            </h3>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <p>
                <strong>Nodes:</strong> Represent functions or tools that
                perform actions.
              </p>
              <p>
                <strong>Edges:</strong> Define the path and logic for how data
                flows between nodes.
              </p>
              <p>
                <strong>State:</strong> A shared object that is passed between
                all nodes in the graph.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: '0 0',
            }}
          >
            {/* Grid overlay */}
            {snapToGrid && (
              <svg 
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  zIndex: 0,
                  width: '200%',
                  height: '200%',
                  left: '-50%',
                  top: '-50%'
                }}
              >
                <defs>
                  <pattern
                    id="grid"
                    width={gridSize}
                    height={gridSize}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                      fill="none"
                      stroke={isDarkMode ? '#1f2937' : '#e5e7eb'}
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}

            <ComponentErrorBoundary
              componentName="Canvas Renderer"
              fallbackMessage="Canvas rendering error"
            >
              <svg className="w-full h-full" style={{ zIndex: 1 }}>
              <defs>
                <marker
                  id="arrowhead-gray"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280"></path>
                </marker>
                <marker
                  id="arrowhead-blue"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6"></path>
                </marker>
                <marker
                  id="arrowhead-orange"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B"></path>
                </marker>
              </defs>
              {edges.map(renderEdge)}
              </svg>
            </ComponentErrorBoundary>
            <div
              className="absolute inset-0"
              style={{ zIndex: 2, pointerEvents: 'none' }}
            >
              {nodes.map(renderNode)}
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            onClick={() => setZoom(z => calculateZoomChange(z, 1))}
            className="rounded border border-gray-300 bg-white p-2 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Plus size={16} />
          </button>
          <div className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom(z => calculateZoomChange(z, -1))}
            className="rounded border border-gray-300 bg-white p-2 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>

      {/* Properties Panels */}
      {showNodePanel && selectedNode && (
        <div className="flex w-80 flex-col border-l border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Node Properties</h3>
            <button
              onClick={() => setShowNodePanel(false)}
              className="text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-grow space-y-4 overflow-y-auto pr-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Label
              </label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={e =>
                  updateNode(selectedNode.id, { label: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Description
              </label>
              <textarea
                value={selectedNode.description || ''}
                onChange={e =>
                  updateNode(selectedNode.id, { description: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Type
              </label>
              <select
                value={selectedNode.type}
                onChange={e => {
                  const newType = e.target.value
                  const nodeType = nodeTypes.find(nt => nt.type === newType)
                  updateNode(selectedNode.id, {
                    type: newType,
                    color: nodeType.color,
                    shape: nodeType.shape,
                  })
                }}
                className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {nodeTypes.map(nodeType => (
                  <option key={nodeType.type} value={nodeType.type}>
                    {nodeType.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Color
              </label>
              <input
                type="color"
                value={selectedNode.color}
                onChange={e =>
                  updateNode(selectedNode.id, { color: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-gray-300 p-1 dark:border-gray-700"
              />
            </div>
            {tools.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Associated Tools
                </label>
                <div className="mt-2 max-h-32 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2 dark:border-gray-700">
                  {tools.map(tool => (
                    <label
                      key={tool.id}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedNode.tools?.includes(tool.id) || false}
                        onChange={() => toggleToolAssociation(tool.id)}
                        className="rounded"
                      />
                      {tool.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showEdgePanel && selectedEdge && (
        <div className="flex w-80 flex-col border-l border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Edge Properties</h3>
            <button
              onClick={() => setShowEdgePanel(false)}
              className="text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-grow space-y-4 overflow-y-auto">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Display Label
              </label>
              <input
                type="text"
                value={selectedEdge.label || ''}
                onChange={e =>
                  updateEdge(selectedEdge.id, { label: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Edge Type
              </label>
              <select
                value={selectedEdge.type}
                onChange={e => {
                  const newType = e.target.value
                  const edgeType = edgeTypes.find(et => et.type === newType)
                  const updates = {
                    type: newType,
                    style: edgeType.style,
                    color:
                      newType === 'conditional_edge' ? '#F59E0B' : '#6B7280',
                  }
                  if (
                    newType === 'conditional_edge' &&
                    !selectedEdge.condition
                  ) {
                    updates.condition = ''
                  }
                  updateEdge(selectedEdge.id, updates)
                }}
                className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {edgeTypes.map(edgeType => (
                  <option key={edgeType.type} value={edgeType.type}>
                    {edgeType.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedEdge.type === 'conditional_edge' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Condition Function
                </label>
                <input
                  type="text"
                  value={selectedEdge.condition || ''}
                  onChange={e =>
                    updateEdge(selectedEdge.id, { condition: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 p-2 font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Color
              </label>
              <input
                type="color"
                value={selectedEdge.color || '#6B7280'}
                onChange={e =>
                  updateEdge(selectedEdge.id, { color: e.target.value })
                }
                className="h-10 w-full rounded-lg border border-gray-300 p-1 dark:border-gray-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* JSON Viewer Widget */}
      <div
        className={`absolute bottom-4 left-64 z-10 ml-4 rounded-lg border border-gray-200 bg-white shadow-lg transition-all duration-300 dark:border-gray-700 dark:bg-gray-900 ${showJsonViewer ? 'w-96' : 'w-auto'}`}
      >
        <button
          onClick={() => setShowJsonViewer(!showJsonViewer)}
          className="flex w-full items-center gap-2 p-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <Code size={16} />
          <span>JSON View</span>
          {showJsonViewer ? (
            <ChevronDown size={16} className="ml-auto text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronUp size={16} className="ml-auto text-gray-500 dark:text-gray-400" />
          )}
        </button>
        {showJsonViewer && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <ComponentErrorBoundary
              componentName="JSON Viewer"
              fallbackMessage="Error displaying JSON"
            >
              <div className="max-h-96 overflow-y-auto p-3">
                <pre className="whitespace-pre-wrap text-xs font-mono text-gray-600 dark:text-gray-300">
                  {JSON.stringify(
                    { nodes, edges, tools, nextNodeId, nextEdgeId, nextToolId },
                    null,
                    2
                  )}
                </pre>
              </div>
            </ComponentErrorBoundary>
            <div className="space-y-2 border-t border-gray-200 p-3 dark:border-gray-700">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-200">
                Paste JSON to Import
              </label>
              <textarea
                value={jsonImportValue}
                onChange={e => {
                  setJsonImportValue(e.target.value)
                  setJsonImportError('')
                  setJsonImportSuccess('')
                }}
                placeholder="Paste JSON workflow configuration from external tools or editors"
                className="h-32 w-full rounded border border-gray-300 p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
              {jsonImportError && (
                <p className="text-xs text-red-500 dark:text-red-400">{jsonImportError}</p>
              )}
              {jsonImportSuccess && (
                <p className="text-xs text-green-500 dark:text-green-400">{jsonImportSuccess}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={loadCurrentDesignIntoImport}
                  type="button"
                  className="flex-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Load Current JSON
                </button>
                <button
                  onClick={applyJsonImport}
                  type="button"
                  className="flex-1 rounded bg-purple-600 px-2 py-1 text-xs text-white hover:bg-purple-700"
                >
                  Import JSON
                </button>
              </div>
            </div>
            <div className="flex gap-2 border-t border-gray-200 p-2 dark:border-gray-700">
              <button
                onClick={() => {
                  const json = JSON.stringify(
                    { nodes, edges, tools, nextNodeId, nextEdgeId, nextToolId },
                    null,
                    2
                  )
                  navigator.clipboard.writeText(json)
                }}
                className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                Copy JSON
              </button>
              <button
                onClick={exportDesign}
                className="flex-1 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
              >
                Download
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LangGraphFlowDesigner
