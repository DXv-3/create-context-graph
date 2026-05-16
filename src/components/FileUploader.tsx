import { useCallback, useState } from 'react'
import type { FileNode } from '../types'

interface FileUploaderProps {
  onFileProcessed: (node: FileNode) => void
  disabled?: boolean
}

const SUPPORTED_TYPES = [
  'application/json',
  'text/plain',
  'text/markdown',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/xml',
  'text/xml',
  'application/yaml',
  'text/yaml',
  'application/javascript',
  'text/javascript',
  'text/typescript',
  'application/typescript',
]

export default function FileUploader({ onFileProcessed, disabled }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processFile = useCallback(async (file: File) => {
    setError(null)
    
    const mimeType = file.type || 'application/octet-stream'
    
    if (!SUPPORTED_TYPES.includes(mimeType) && file.name.includes('.')) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const extMap: Record<string, string> = {
        'json': 'application/json',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'csv': 'text/csv',
        'xml': 'application/xml',
        'yaml': 'application/yaml',
        'yml': 'application/yaml',
        'js': 'application/javascript',
        'ts': 'application/typescript',
        'tsx': 'text/typescript',
        'html': 'text/html',
        'css': 'text/css',
      }
      if (ext && extMap[ext]) {
        // File type is acceptable
      }
    }

    const content = await file.text()
    
    const fileNode: FileNode = {
      id: crypto.randomUUID(),
      name: file.name,
      type: 'file',
      content,
      metadata: {
        size: file.size,
        mimeType,
        lastModified: new Date(file.lastModified).toISOString(),
      },
      relationships: [],
    }

    setFileName(file.name)
    onFileProcessed(fileNode)
  }, [onFileProcessed])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Upload File</h2>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled}
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Select File
        </label>
        
        <p className="mt-4 text-sm text-gray-600">
          Drag and drop a file here, or click to select
        </p>
        
        {fileName && (
          <p className="mt-2 text-sm text-gray-500">
            Selected: {fileName}
          </p>
        )}
        
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>
      
      <div className="mt-4">
        <p className="text-xs text-gray-500">
          Supported formats: JSON, TXT, MD, PDF, DOCX, CSV, XML, YAML, JS/TS, HTML, CSS
        </p>
      </div>
    </div>
  )
}