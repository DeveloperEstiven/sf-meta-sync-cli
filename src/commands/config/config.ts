import { exec } from 'child_process'
import { Command } from 'commander'
import Configstore from 'configstore'
import fs from 'fs'
import inquirer from 'inquirer'
import os from 'os'
import path from 'path'
import { composeErrorMessage, log } from '../../utils/cli-utils.js'
import { SyncOptions } from '../sync/sync.js'

const CONFIGSTORE_NAME = 'SF_META_SYNC'
const CONFIGS_KEY = 'CONFIGS'
const CHOICE_NEW_CONFIG = 'New Configuration'
const CHOICE_SHOW_CONFIG = 'Show Configuration JSON'

const enum ConfigActions {
  EDIT = '✏️ EDIT',
  DELETE = '🗑️ DELETE',
}

const configStore = new Configstore(CONFIGSTORE_NAME, {})

interface SyncConfig extends Partial<SyncOptions> {
  alias: string
  filesToSync?: string
}

async function runConfigCommand() {
  try {
    const configs = getConfigs()

    if (!configs.length) {
      log.info('No configurations found, create new one.')
      await upsertConfiguration(configs)
      return
    }

    const { choice } = await inquirer.prompt<{ choice: string }>([
      {
        name: 'choice',
        type: 'list',
        message: 'Select Configuration:',
        choices: [
          CHOICE_NEW_CONFIG,
          new inquirer.Separator(),
          ...configs.map(c => c.alias),
          new inquirer.Separator(),
          CHOICE_SHOW_CONFIG,
        ],
      },
    ])

    if (choice === CHOICE_NEW_CONFIG) {
      await upsertConfiguration(configs)
      return
    }

    if (choice === CHOICE_SHOW_CONFIG) {
      await openConfigFile()
      return
    }

    await handleExistingConfiguration(choice, configs)
  } catch (error) {
    log.error(composeErrorMessage(error))
  }
}

function getConfigs(): SyncConfig[] {
  return configStore.get(CONFIGS_KEY) ?? []
}

function saveConfigs(configs: SyncConfig[]) {
  configStore.set(CONFIGS_KEY, configs)
}

async function upsertConfiguration(configs: SyncConfig[], configToEdit?: SyncConfig) {
  const initialConfig: SyncConfig = configToEdit ?? { alias: '', localDir: '' }

  initialConfig.localDir = await promptForDirectory(initialConfig.localDir)
  initialConfig.alias = await promptForAlias(configs, initialConfig.alias)

  const answers = await inquirer.prompt<Partial<SyncConfig>>([
    {
      name: 'fileExtension',
      type: 'input',
      message: 'File extension for local files (leave blank for none):',
      default: initialConfig.fileExtension ?? '',
    },
    {
      name: 'query',
      type: 'input',
      message: 'SOQL query for metadata (leave blank for none):',
      default: initialConfig.query ?? '',
    },
    {
      name: 'filenameField',
      type: 'input',
      message: 'Field for filename in Salesforce (leave blank for none):',
      default: initialConfig.filenameField ?? '',
    },
    {
      name: 'fieldName',
      type: 'input',
      message: 'Field containing file content in Salesforce (leave blank for none):',
      default: initialConfig.fieldName ?? '',
    },
    {
      name: 'noDiff',
      type: 'confirm',
      message: 'Disable detailed diff display for changed files?',
      default: initialConfig.noDiff ?? false,
    },
    {
      name: 'filesToSync',
      type: 'input',
      message: 'Comma-separated list of filenames to sync (leave blank if none):',
      default: initialConfig.filesToSync ?? '',
    },
  ])

  const updatedConfig = { ...initialConfig, ...answers }
  normalizeFilesToSync(updatedConfig)

  if (!configToEdit) {
    configs.push(updatedConfig)
    saveConfigs(configs)
    log.success(`Configuration for alias "${updatedConfig.alias}" created successfully!`)
  } else {
    const newIndex = configs.findIndex(c => c.alias === updatedConfig.alias)
    if (newIndex !== -1) {
      configs[newIndex] = updatedConfig
    }
    saveConfigs(configs)
    log.success(`Configuration for alias "${updatedConfig.alias}" updated successfully!`)
  }
}

async function handleExistingConfiguration(alias: string, configs: SyncConfig[]) {
  const index = configs.findIndex(c => c.alias === alias)
  if (index === -1) {
    return
  }

  const { action } = await inquirer.prompt<{ action: ConfigActions }>([
    {
      name: 'action',
      type: 'list',
      message: `Select action for "${alias}"`,
      choices: [ConfigActions.EDIT, ConfigActions.DELETE],
    },
  ])

  if (action === ConfigActions.EDIT) {
    await upsertConfiguration(configs, configs[index])
    return
  }

  if (action === ConfigActions.DELETE) {
    await deleteConfiguration(index, configs)
  }
}

async function deleteConfiguration(index: number, configs: SyncConfig[]) {
  const toDelete = configs[index]
  const { confirmDelete } = await inquirer.prompt<{ confirmDelete: boolean }>([
    {
      name: 'confirmDelete',
      type: 'confirm',
      message: `Are you sure you want to delete the configuration "${toDelete.alias}"?`,
    },
  ])
  if (!confirmDelete) {
    console.log('Delete canceled.')
    return
  }
  configs.splice(index, 1)
  saveConfigs(configs)
  log.success(`Deleted configuration "${toDelete.alias}".`)
}

async function openConfigFile() {
  const filePath = configStore.path
  console.log(`Opening config file: ${filePath}`)
  const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  exec(`${opener} "${filePath}"`)
}

async function promptForDirectory(defaultValue = process.cwd()) {
  let validDir = false
  let directory = defaultValue
  while (!validDir) {
    const { dir } = await inquirer.prompt<{ dir: string }>([
      {
        name: 'dir',
        type: 'input',
        message:
          'Enter the full or relative path to the local project directory.\n' +
          'Examples:\n' +
          '- Absolute path: /Users/your-username/Desktop/my-project\n' +
          '- Home directory shortcut: ~/Desktop/my-project\n' +
          '- Relative path: ./my-project or ../my-project\n\n',
        default: directory,
      },
    ])
    const expandedDir = resolveDirectoryPath(dir.trim())

    if (fs.existsSync(expandedDir) && fs.lstatSync(expandedDir).isDirectory()) {
      directory = expandedDir
      validDir = true
    } else {
      log.warning(`Directory "${expandedDir}" does not exist or is not a folder. Please try again.`)
    }
  }
  return directory
}

function resolveDirectoryPath(directory: string) {
  if (directory.startsWith('~')) {
    return path.join(os.homedir(), directory.slice(1))
  }
  return path.resolve(directory)
}

async function promptForAlias(configs: SyncConfig[], existingAlias: string) {
  let aliasValid = false
  let newAlias = existingAlias
  while (!aliasValid) {
    const { alias } = await inquirer.prompt<{ alias: string }>([
      {
        name: 'alias',
        type: 'input',
        message: 'Enter configuration alias:',
        default: existingAlias,
      },
    ])
    if (!alias || !alias.trim()) {
      log.warning('Alias cannot be empty.')
      continue
    }
    if (alias !== existingAlias && configs.some(c => c.alias === alias)) {
      log.warning('Alias already exists. Please choose a different one.')
      continue
    }
    newAlias = alias
    aliasValid = true
  }
  return newAlias
}

function normalizeFilesToSync(cfg: SyncConfig) {
  if (!cfg.filesToSync) return
  cfg.filesToSync = cfg.filesToSync
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(', ')
}

export function registerConfigCommand(program: Command) {
  program.command('config').description('Configure Salesforce Sync process.').action(runConfigCommand)
}
