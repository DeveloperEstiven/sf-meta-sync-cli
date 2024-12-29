import { Command } from 'commander'
import { composeErrorMessage, loadAsync, log } from '../../utils/cli-utils.js'
import { LocalFile, RemoteFile } from '../../utils/file.js'
import { salesforce, SalesforceRecord } from '../../utils/salesforce-utils.js'
import { WorkspaceManager } from '../../utils/workspace-manager.js'
import { LocalWorkspace, RemoteWorkspace } from '../../utils/workspace.js'
import {
  CompleteSyncOptions,
  displayDiff,
  generateDiff,
  logWithCategories,
  mergeOptionsWithConfig,
  PartialSyncOptions,
  promptFileSelection,
  runValidationPipeline,
} from './sync.utils.js'

type FileDiffs = Record<string, string>

const workspaceManager = WorkspaceManager.getInstance()

async function syncCommand(syncOptions: PartialSyncOptions) {
  try {
    const options = mergeOptionsWithConfig(syncOptions)

    if (!prepareLocalWorkspace(options)) return

    const salesforceRecords = await loadAsync(
      () => salesforce.query(options.targetOrg, options.query),
      {
        loading: 'Querying Salesforce metadata. Please wait...',
        success: 'Salesforce metadata retrieved successfully.',
        error: 'Error: Unable to retrieve Salesforce metadata.',
      },
      `Failed to query Salesforce metadata. Query: ${options.query}`,
    )

    initializeRemoteWorkspace(options, salesforceRecords)

    const {
      remoteOnlyFiles,
      localOnlyFiles,
      changedFiles: { diffs, files: changedLocalFiles },
    } = gatherFileDifferences(options)

    const anythingToSync = logWithCategories('ℹ File Differences', {
      'Missing Files (present in Salesforce but not locally)': remoteOnlyFiles.map(f => f.fullName),
      'Local-Only Files (not found in Salesforce)': localOnlyFiles.map(f => f.fullName),
      'Changed Files (content differences)': changedLocalFiles.map(f => f.fullName),
    })

    if (!anythingToSync) {
      log.success('Everything is up to date. Nothing to synchronize.')
      return
    }

    const createdFiles = await synchronizeRemoteOnlyFiles(remoteOnlyFiles)
    const updatedFiles = await synchronizeChangedFiles(changedLocalFiles, diffs)

    logWithCategories('ℹ Sync Summary', {
      'Created Files (from Salesforce metadata)': createdFiles,
      'Updated Files (with Salesforce metadata)': updatedFiles,
      'Skipped Files (local-only, not found in Salesforce)': localOnlyFiles.map(f => f.fullName),
    })

    log.success('Synchronization completed successfully.')
  } catch (error) {
    log.error(composeErrorMessage(error))
  }
}

function prepareLocalWorkspace(options: CompleteSyncOptions) {
  const localWorkspace = new LocalWorkspace(options.localDir, options.fileExtension)
  workspaceManager.setWorkspace(localWorkspace)

  const pipeline = [
    {
      validate: () => localWorkspace.exists(),
      errorMessage: `The local directory "${localWorkspace.localDir}" does not exist.`,
    },
    {
      validate: () => options.query.includes(options.filenameField as string),
      errorMessage: `The field "${options.filenameField}" is not present in the SOQL query.`,
    },
  ]

  return runValidationPipeline(pipeline)
}

function initializeRemoteWorkspace(options: CompleteSyncOptions, records: SalesforceRecord[]) {
  const remoteWorkspace = new RemoteWorkspace(
    options.fileExtension,
    records.map(r => ({ name: r[options.filenameField], content: r[options.fieldName] })),
  )
  workspaceManager.setWorkspace(remoteWorkspace)
}

function gatherFileDifferences(options: CompleteSyncOptions) {
  const { local, remote } = workspaceManager.getWorkspaces()

  const remoteFiles = remote.listFiles()
  const localFiles = local.listFiles()

  const remoteOnlyFiles = remoteFiles.filter(
    remoteFile => !localFiles.some(localFile => localFile.name === remoteFile.name),
  )
  const localOnlyFiles = localFiles.filter(
    localFile => !remoteFiles.some(remoteFile => remoteFile.name === localFile.name),
  )

  const changedFiles = assessChangedFiles(options.noDiff)
  return { remoteOnlyFiles, localOnlyFiles, changedFiles }
}

async function synchronizeRemoteOnlyFiles(files: RemoteFile[]) {
  if (!files.length) return []

  const selection = await promptFileSelection(
    'Choose the missing files you want to retrieve from the remote workspace:',
    files.map(f => f.fullName),
  )

  if (!selection.length) {
    log.info('No files were selected to retrieve.')
    return []
  }

  const { local, remote } = workspaceManager.getWorkspaces()

  return files
    .filter(file => selection.includes(file.fullName) && remote.fileExists(file.fullName))
    .map(file => {
      const remoteContent = file.read()
      local.fileForName(file.name).write(remoteContent)
      return file.fullName
    })
}

async function synchronizeChangedFiles(changedLocalFiles: LocalFile[], diffs: FileDiffs) {
  if (!changedLocalFiles.length) return []

  const changedFilenames = changedLocalFiles.map(f => f.fullName)

  const prompt =
    changedFilenames.length < 2
      ? changedFilenames
      : await promptFileSelection('Select the files for which you want to view the differences:', changedFilenames)

  prompt.forEach(fullName => displayDiff(fullName, diffs[fullName]))

  const selection = await promptFileSelection(
    'Choose which changed files should be updated with remote content:',
    changedFilenames,
  )
  if (!selection.length) {
    log.info('No files were selected for update.')
    return []
  }

  const { local, remote } = workspaceManager.getWorkspaces()

  return remote
    .listFiles()
    .filter(remoteFile => selection.includes(remoteFile.fullName) && remote.fileExists(remoteFile.fullName))
    .map(remoteFile => {
      const remoteContent = remoteFile.read()
      local.fileForName(remoteFile.name).write(remoteContent)
      return remoteFile.fullName
    })
}

function assessChangedFiles(noDiff?: boolean) {
  const { local, remote } = workspaceManager.getWorkspaces()

  return remote.listFiles().reduce(
    (acc, remoteFile) => {
      const localFile = remoteFile.getCorrespondingLocalFile(local)
      if (!localFile) return acc

      const remoteContent = remoteFile.read()
      const localContent = localFile.read()
      if (remoteContent === localContent) return acc

      acc.files.push(localFile)
      if (!noDiff) acc.diffs[localFile.fullName] = generateDiff(localContent, remoteContent)
      return acc
    },
    { files: [] as LocalFile[], diffs: {} as FileDiffs },
  )
}

export function registerSyncCommand(program: Command) {
  program
    .command('sync')
    .description('Sync Salesforce metadata with local files.')
    .option('--target-org <o>', 'Salesforce org alias')
    .option('--local-dir <dir>', 'Local directory for files')
    .option('--file-extension <ext>', 'File extension for local files')
    .option('--query <query>', 'SOQL query for metadata')
    .option('--filename-field <field>', 'Field for filename in Salesforce')
    .option('--field-name <field>', 'Field containing file content in Salesforce')
    .option('--no-diff', 'Disable detailed diff display for changed files', false)
    .option('-c, --config-alias <a>', 'Alias for the configuration')
    .action(syncCommand)
}
