import { fileUtils } from './file-utils.js'
import { LocalFile, RemoteFile } from './file.js'

export interface WorkspaceContract<T> {
  fileExists(baseName: string): boolean
  listFiles(): T[]
}

export class LocalWorkspace implements WorkspaceContract<LocalFile> {
  constructor(
    public localDir: string,
    private fileExtension: string,
  ) {}

  exists(): boolean {
    return fileUtils.exists(this.localDir)
  }

  fileExists(baseName: string): boolean {
    return this.fileForName(baseName).exists()
  }

  fileForName(baseName: string): LocalFile {
    return new LocalFile(this.localDir, baseName, this.fileExtension)
  }

  listFiles(): LocalFile[] {
    const baseNames = fileUtils.getFilesByExtension(this.localDir, this.fileExtension)
    return baseNames.map(baseName => new LocalFile(this.localDir, baseName, this.fileExtension))
  }
}

type RemoteFileData = { name: string; content: string }

export class RemoteWorkspace implements WorkspaceContract<RemoteFile> {
  private files: RemoteFile[] = []

  constructor(
    private extension: string,
    data: RemoteFileData[] = [],
  ) {
    this.files = data.map(item => new RemoteFile(item.name, this.extension, item.content))
  }

  fileExists(fullName: string): boolean {
    return this.files.some(file => file.fullName === fullName)
  }

  listFiles() {
    return [...this.files]
  }
}
