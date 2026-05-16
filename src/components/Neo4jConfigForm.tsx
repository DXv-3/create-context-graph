import { useState } from 'react'
import type { Neo4jConfig } from '../types'

interface Neo4jConfigFormProps {
  onConnect: (connected: boolean) => void
}

export default function Neo4jConfigForm({ onConnect }: Neo4jConfigFormProps) {
  const [config, setConfig] = useState<Neo4jConfig>({
    uri: 'bolt://localhost:7687',
    username: 'neo4j',
    password: '',
    database: 'neo4j'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/neo4j/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (response.ok) {
        onConnect(true)
      } else {
        throw new Error('Connection failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      onConnect(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Neo4j Connection</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            URI
          </label>
          <input
            type="text"
            value={config.uri}
            onChange={(e) => setConfig({ ...config, uri: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="bolt://localhost:7687"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            type="text"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Database
          </label>
          <input
            type="text"
            value={config.database}
            onChange={(e) => setConfig({ ...config, database: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="neo4j"
          />
        </div>
        
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  )
}