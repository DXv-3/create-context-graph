import type { GraphData } from '../types'

interface GraphViewerProps {
  data: GraphData | null
  isLoading: boolean
}

export default function GraphViewer({ data, isLoading }: GraphViewerProps) {
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Graph Preview</h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Graph Preview</h2>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data to display. Upload a file and connect to Neo4j to see the graph.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Graph Preview</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Nodes ({data.nodes.length})</h3>
          <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
            {data.nodes.map((node) => (
              <div key={node.id} className="text-sm py-1 px-2 hover:bg-gray-50 rounded">
                <span className="font-medium">{node.label}</span>
                <span className="text-gray-500 ml-2">({node.type})</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700">Edges ({data.edges.length})</h3>
          <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
            {data.edges.map((edge, i) => (
              <div key={i} className="text-sm py-1 px-2 hover:bg-gray-50 rounded">
                {edge.source} <span className="text-gray-500">--[{edge.type}]--&gt;</span> {edge.target}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}