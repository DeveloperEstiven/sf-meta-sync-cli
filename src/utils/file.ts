import { contentUtils } from '../commands/sync/sync.utils.js'
import { fileUtils } from './file-utils.js'
import { LocalWorkspace } from './workspace.js'

export interface FileContract {
  readonly name: string
  readonly extension: string
  readonly fullName: string
  read(): string
  write(content: string): void
}

export class LocalFile implements FileContract {
  constructor(
    private directory: string,
    public name: string,
    public extension: string,
  ) {}

  public get fullName() {
    return `${this.name}${this.extension}`
  }

  private get path() {
    return `${this.directory}/${this.fullName}`
  }

  exists() {
    return fileUtils.exists(this.path)
  }

  read() {
    if (!this.exists()) return ''
    return contentUtils.normalizeLineEndings(fileUtils.read(this.path))
  }

  write(content: string) {
    const normalized = contentUtils.normalizeLineEndings(content)
    fileUtils.write(this.path, normalized)
  }
}

export class RemoteFile implements FileContract {
  constructor(
    public name: string,
    public extension: string,
    private content: string,
  ) {
    this.content = contentUtils.normalizeLineEndings(this.content)
  }

  get fullName() {
    return `${this.name}${this.extension}`
  }

  getCorrespondingLocalFile(localWorkspace: LocalWorkspace) {
    const file = localWorkspace.fileForName(this.name)
    return file.exists() ? file : null
  }

  read() {
    return this.content
  }

  write(newContent: string) {
    this.content = contentUtils.normalizeLineEndings(newContent)
  }
}
