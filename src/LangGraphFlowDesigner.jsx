import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Download,
  Upload,
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
} from 'lucide-react'
import ComponentErrorBoundary from './ComponentErrorBoundary'

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

  const handleWheel = e => {
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 3)
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

  const importDesign = e => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = event => {
        try {
          const design = JSON.parse(event.target.result)
          // Validate the imported data structure
          if (!design || typeof design !== 'object') {
            throw new Error('Invalid design structure')
          }
          setNodes(design.nodes || [])
          setEdges(design.edges || [])
          setTools(design.tools || [])
          setNextNodeId(design.nextNodeId || 1)
          setNextEdgeId(design.nextEdgeId || 1)
          setNextToolId(design.nextToolId || 1)
        } catch (error) {
          console.error('Import failed:', error)
          alert('Failed to import file. Please ensure it is a valid LangGraph design file.')
        }
      }
      reader.onerror = () => {
        console.error('File read error:', reader.error)
        alert('Failed to read file. Please try again.')
      }
      reader.readAsText(file)
    }
  }

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
    <div className="w-full h-screen bg-gray-100 flex font-sans">
      {/* Toolbar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">
          LangGraph Designer
        </h2>
        <div className="overflow-y-auto flex-grow">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Add Nodes
            </h3>
            <div className="space-y-2">
              {nodeTypes.map(nodeType => {
                const Icon = nodeType.icon
                return (
                  <button
                    key={nodeType.type}
                    onClick={() => addNode(nodeType.type)}
                    className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    <Icon size={16} style={{ color: nodeType.color }} />
                    <span className="text-sm text-gray-700">
                      {nodeType.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Add Edges
            </h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Edge Type
                </label>
                <select
                  value={connectionType}
                  onChange={e => setConnectionType(e.target.value)}
                  className="w-full p-1.5 text-xs border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
                className={`w-full flex items-center justify-center gap-2 p-2 text-left rounded-lg border transition-all ${connectionMode ? 'bg-blue-100 border-blue-300 text-blue-800' : 'border-gray-200 hover:bg-gray-100'}`}
              >
                <Route size={16} />
                <span className="text-sm font-medium">
                  {connectionMode
                    ? 'Cancel Connection'
                    : `Add ${edgeTypes.find(et => et.type === connectionType)?.label || 'Edge'}`}
                </span>
              </button>
              {connectionMode && (
                <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded-md border border-blue-200">
                  {connectionStart
                    ? `Click target node...`
                    : `Click source node to start.`}
                </div>
              )}
            </div>
          </div>
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Actions</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="flex-1 flex items-center justify-center gap-1 p-2 text-left hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo size={16} />
                  <span className="text-sm text-gray-700">Undo</span>
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="flex-1 flex items-center justify-center gap-1 p-2 text-left hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo size={16} />
                  <span className="text-sm text-gray-700">Redo</span>
                </button>
              </div>
              <button
                onClick={toggleSelectionMode}
                className={`w-full flex items-center gap-2 p-2 text-left rounded-lg border border-gray-200 transition-colors ${
                  isSelectionMode 
                    ? 'bg-orange-100 text-orange-700 border-orange-300' 
                    : 'hover:bg-gray-100'
                }`}
                title="Toggle Selection Mode (S)"
              >
                <Square size={16} />
                <span className="text-sm">
                  {isSelectionMode ? 'Exit Selection' : 'Multi-Select'}
                </span>
              </button>
              {selectedNodes.size > 0 && (
                <div className="space-y-2 p-2 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-xs text-orange-700 font-medium">
                    {selectedNodes.size} node{selectedNodes.size > 1 ? 's' : ''} selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={duplicateSelectedNodes}
                      className="flex-1 flex items-center justify-center gap-1 p-2 text-left hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                      title="Duplicate Selected (Ctrl+D)"
                    >
                      <Plus size={14} />
                      <span className="text-xs text-orange-700">Duplicate</span>
                    </button>
                    <button
                      onClick={deleteSelectedNodes}
                      className="flex-1 flex items-center justify-center gap-1 p-2 text-left hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                      title="Delete Selected (Delete)"
                    >
                      <Trash2 size={14} />
                      <span className="text-xs text-red-700">Delete</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllNodes}
                      className="flex-1 flex items-center justify-center gap-1 p-2 text-left hover:bg-orange-100 rounded-lg border border-orange-200 transition-colors"
                      title="Select All (Ctrl+A)"
                    >
                      <Square size={14} />
                      <span className="text-xs text-orange-700">Select All</span>
                    </button>
                    <button
                      onClick={clearSelection}
                      className="flex-1 flex items-center justify-center gap-1 p-2 text-left hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                      title="Clear Selection"
                    >
                      <X size={14} />
                      <span className="text-xs text-gray-700">Clear</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Grid and Alignment Tools */}
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Grid & Alignment</h3>
                
                {/* Grid Settings */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={e => setSnapToGrid(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-gray-700">Snap to Grid</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Grid Size:</span>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={gridSize}
                      onChange={e => setGridSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-600 w-8">{gridSize}</span>
                  </div>
                </div>

                {/* Alignment Tools */}
                {selectedNodes.size >= 2 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">Align:</div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => alignNodes('left')}
                        className="p-1 text-xs hover:bg-gray-100 rounded border"
                        title="Align Left"
                      >
                        ⬅
                      </button>
                      <button
                        onClick={() => alignNodes('vertical')}
                        className="p-1 text-xs hover:bg-gray-100 rounded border"
                        title="Align Center (Vertical)"
                      >
                        ↕
                      </button>
                      <button
                        onClick={() => alignNodes('right')}
                        className="p-1 text-xs hover:bg-gray-100 rounded border"
                        title="Align Right"
                      >
                        ➡
                      </button>
                      <button
                        onClick={() => alignNodes('top')}
                        className="p-1 text-xs hover:bg-gray-100 rounded border"
                        title="Align Top"
                      >
                        ⬆
                      </button>
                      <button
                        onClick={() => alignNodes('horizontal')}
                        className="p-1 text-xs hover:bg-gray-100 rounded border"
                        title="Align Center (Horizontal)"
                      >
                        ↔
                      </button>
                      <button
                        onClick={() => alignNodes('bottom')}
                        className="p-1 text-xs hover:bg-gray-100 rounded border"
                        title="Align Bottom"
                      >
                        ⬇
                      </button>
                    </div>
                    {selectedNodes.size >= 3 && (
                      <>
                        <div className="text-xs text-gray-600">Distribute:</div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => distributeNodes('horizontal')}
                            className="flex-1 p-1 text-xs hover:bg-gray-100 rounded border"
                            title="Distribute Horizontally"
                          >
                            ↔ H
                          </button>
                          <button
                            onClick={() => distributeNodes('vertical')}
                            className="flex-1 p-1 text-xs hover:bg-gray-100 rounded border"
                            title="Distribute Vertically"
                          >
                            ↕ V
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={exportDesign}
                className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <Download size={16} />{' '}
                <span className="text-sm text-gray-700">Export</span>
              </button>
              <label className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer transition-colors">
                <Upload size={16} />{' '}
                <span className="text-sm text-gray-700">Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={importDesign}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Tool Library
            </h3>
            <form onSubmit={addTool} className="flex gap-2">
              <input
                type="text"
                value={newToolName}
                onChange={e => setNewToolName(e.target.value)}
                placeholder="New tool name..."
                className="flex-grow p-1.5 text-sm border border-gray-300 rounded-lg"
              />
              <button
                type="submit"
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Plus size={16} />
              </button>
            </form>
            <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
              {tools.map(tool => (
                <div
                  key={tool.id}
                  className="flex justify-between items-center text-sm bg-gray-100 p-1.5 rounded"
                >
                  <span className="truncate">{tool.name}</span>
                  <button
                    onClick={() => deleteTool(tool.id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-auto pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Key Concepts
            </h3>
            <div className="space-y-2 text-xs text-gray-600">
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
      <div className="flex-1 relative overflow-hidden bg-gray-50">
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
                      stroke="#e5e7eb"
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
            onClick={() => setZoom(z => Math.min(z * 1.2, 3))}
            className="bg-white border border-gray-300 rounded p-2 shadow-sm hover:bg-gray-50"
          >
            <Plus size={16} />
          </button>
          <div className="bg-white border border-gray-300 rounded px-3 py-2 text-sm font-medium shadow-sm">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom(z => Math.max(z / 1.2, 0.1))}
            className="bg-white border border-gray-300 rounded p-2 shadow-sm hover:bg-gray-50"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>

      {/* Properties Panels */}
      {showNodePanel && selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Node Properties</h3>
            <button
              onClick={() => setShowNodePanel(false)}
              className="text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4 flex-grow overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={e =>
                  updateNode(selectedNode.id, { label: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={selectedNode.description || ''}
                onChange={e =>
                  updateNode(selectedNode.id, { description: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                {nodeTypes.map(nodeType => (
                  <option key={nodeType.type} value={nodeType.type}>
                    {nodeType.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={selectedNode.color}
                onChange={e =>
                  updateNode(selectedNode.id, { color: e.target.value })
                }
                className="w-full h-10 p-1 border border-gray-300 rounded-lg"
              />
            </div>
            {tools.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Associated Tools
                </label>
                <div className="mt-2 space-y-2 border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                  {tools.map(tool => (
                    <label
                      key={tool.id}
                      className="flex items-center gap-2 text-sm"
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
        <div className="w-80 bg-white border-l border-gray-200 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Edge Properties</h3>
            <button
              onClick={() => setShowEdgePanel(false)}
              className="text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4 flex-grow overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Label
              </label>
              <input
                type="text"
                value={selectedEdge.label || ''}
                onChange={e =>
                  updateEdge(selectedEdge.id, { label: e.target.value })
                }
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full p-2 border border-gray-300 rounded-lg"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition Function
                </label>
                <input
                  type="text"
                  value={selectedEdge.condition || ''}
                  onChange={e =>
                    updateEdge(selectedEdge.id, { condition: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg font-mono"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="color"
                value={selectedEdge.color || '#6B7280'}
                onChange={e =>
                  updateEdge(selectedEdge.id, { color: e.target.value })
                }
                className="w-full h-10 p-1 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* JSON Viewer Widget */}
      <div
        className={`absolute bottom-4 left-64 ml-4 bg-white border border-gray-200 rounded-lg shadow-lg transition-all duration-300 z-10 ${showJsonViewer ? 'w-96' : 'w-auto'}`}
      >
        <button
          onClick={() => setShowJsonViewer(!showJsonViewer)}
          className="flex items-center gap-2 p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 w-full"
        >
          <Code size={16} />
          <span>JSON View</span>
          {showJsonViewer ? (
            <ChevronDown size={16} className="ml-auto" />
          ) : (
            <ChevronUp size={16} className="ml-auto" />
          )}
        </button>
        {showJsonViewer && (
          <div className="border-t border-gray-200">
            <ComponentErrorBoundary 
              componentName="JSON Viewer"
              fallbackMessage="Error displaying JSON"
            >
              <div className="p-3 max-h-96 overflow-y-auto">
                <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(
                    { nodes, edges, tools, nextNodeId, nextEdgeId, nextToolId },
                    null,
                    2
                  )}
                </pre>
              </div>
            </ComponentErrorBoundary>
            <div className="border-t border-gray-200 p-2 flex gap-2">
              <button
                onClick={() => {
                  const json = JSON.stringify(
                    { nodes, edges, tools, nextNodeId, nextEdgeId, nextToolId },
                    null,
                    2
                  )
                  navigator.clipboard.writeText(json)
                }}
                className="flex-1 text-xs py-1 px-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Copy JSON
              </button>
              <button
                onClick={exportDesign}
                className="flex-1 text-xs py-1 px-2 bg-green-600 text-white rounded hover:bg-green-700"
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
