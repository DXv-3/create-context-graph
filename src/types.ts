export interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder' | 'document'
  content: string
  metadata: {
    size: number
    mimeType: string
    lastModified: string
    path?: string
  }
  relationships: Array<{
    target: string
    type: string
    strength?: number
  }>
}

export interface GraphData {
  nodes: Array<{
    id: string
    label: string
    type: string
    properties: Record<string, unknown>
  }>
  edges: Array<{
    source: string
    target: string
    type: string
  }>
}

export interface Neo4jConfig {
  uri: string
  username: string
  password: string
  database?: string
}