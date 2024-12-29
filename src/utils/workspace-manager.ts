import { LocalWorkspace, RemoteWorkspace } from './workspace.js'

interface WorkspaceMap {
  local: LocalWorkspace
  remote: RemoteWorkspace
}

export class WorkspaceManager {
  private static instanceRef: WorkspaceManager | null = null
  private workspaces: NullableMap<WorkspaceMap> = { local: null, remote: null }

  private getWorkspace<T extends keyof WorkspaceMap>(type: T): NonNullable<WorkspaceMap[T]> {
    const workspace = this.workspaces[type]
    if (!workspace)
      throw new Error(`${type.charAt(0).toUpperCase() + type.slice(1)} workspace has not been initialized`)
    return workspace
  }

  static getInstance(): WorkspaceManager {
    return (this.instanceRef ??= new WorkspaceManager())
  }

  setWorkspace(workspace: LocalWorkspace | RemoteWorkspace) {
    const type: keyof WorkspaceMap = workspace instanceof LocalWorkspace ? 'local' : 'remote'
    if (this.workspaces[type]) throw new Error(`${type} workspace is already initialized`)
    this.workspaces[type] = workspace as LocalWorkspace & RemoteWorkspace
  }

  getWorkspaces(): WorkspaceMap {
    return {
      local: this.getWorkspace('local'),
      remote: this.getWorkspace('remote'),
    }
  }
}
