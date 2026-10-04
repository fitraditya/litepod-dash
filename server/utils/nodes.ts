import { parse, stringify } from 'yaml'

export interface NodeEntry {
  id: string
  name: string
  ip: string
  port?: number
  api_key: string
  tls?: boolean
}

const NODES_KEY = 'nodes.yaml'

export async function listNodes(): Promise<NodeEntry[]> {
  const storage = useAppStorage()
  const raw = await storage.read(NODES_KEY)
  if (!raw) return []
  const data = parse(raw)
  return Array.isArray(data?.nodes) ? data.nodes : []
}

export async function getNode(id: string): Promise<NodeEntry | null> {
  const nodes = await listNodes()
  return nodes.find((n) => n.id === id) ?? null
}

async function saveNodes(nodes: NodeEntry[]) {
  const storage = useAppStorage()
  await storage.write(NODES_KEY, stringify({ nodes }))
}

// nodes.yaml is read-modify-written, so serialize writers within this process to avoid lost
// updates. (Multiple dashpod instances sharing one S3 bucket would still need a real lock.)
let writeQueue: Promise<unknown> = Promise.resolve()
function withNodesLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn)
  writeQueue = run.catch(() => {})
  return run
}

export const createNode = (entry: NodeEntry) => withNodesLock(async () => {
  const nodes = await listNodes()
  if (nodes.some((n) => n.id === entry.id)) {
    throw createError({ statusCode: 409, statusMessage: `node id "${entry.id}" already exists` })
  }
  nodes.push(entry)
  await saveNodes(nodes)
  return entry
})

export const updateNode = (id: string, patch: Partial<NodeEntry>) => withNodesLock(async () => {
  const nodes = await listNodes()
  const idx = nodes.findIndex((n) => n.id === id)
  if (idx === -1) throw createError({ statusCode: 404, statusMessage: 'node not found' })
  nodes[idx] = { ...nodes[idx], ...patch, id }
  await saveNodes(nodes)
  return nodes[idx]
})

export const deleteNode = (id: string) => withNodesLock(async () => {
  const nodes = await listNodes()
  const next = nodes.filter((n) => n.id !== id)
  if (next.length === nodes.length) {
    throw createError({ statusCode: 404, statusMessage: 'node not found' })
  }
  await saveNodes(next)
})

export function nodeBaseUrl(node: NodeEntry) {
  const proto = node.tls ? 'https' : 'http'
  const port = node.port ?? 8080
  return `${proto}://${node.ip}:${port}`
}

/** Node without its agent API key — safe to return to the browser. */
export function publicNode<T extends { api_key?: string }>(node: T): Omit<T, 'api_key'> {
  const { api_key, ...rest } = node
  return rest
}
