import { useState } from 'react'
import FileUploader from '../components/FileUploader'
import GraphViewer from '../components/GraphViewer'
import Neo4jConfigForm from '../components/Neo4jConfigForm'
import type { FileNode, GraphData } from '../types'

export default function FileImportPage() {
  const [fileNode, setFileNode] = useState<FileNode | null>(null)
  const [graphData, setGraphData] = useState<GraphData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleFileProcessed = async (node: FileNode) => {
    setFileNode(node)
    if (isConnected) {
      await importToGraph(node)
    }
  }

  const importToGraph = async (node: FileNode) => {
    setIsImporting(true)
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node)
      })
      const data = await response.json()
      setGraphData(data)
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          File to Graph Import
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Neo4jConfigForm onConnect={setIsConnected} />
            
            <FileUploader 
              onFileProcessed={handleFileProcessed}
              disabled={!isConnected || isImporting}
            />
          </div>
          
          <div className="lg:col-span-2">
            <GraphViewer 
              data={graphData} 
              isLoading={isImporting}
            />
          </div>
        </div>
      </div>
    </div>
  )
}