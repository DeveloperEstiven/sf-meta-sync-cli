import { Command } from 'commander'
import fs from 'fs'
import inquirer from 'inquirer'
import { composeErrorMessage, loadAsync, log } from '../../utils/cli-utils.js'
import { config } from '../../utils/config-utils.js'
import { salesforce } from '../../utils/salesforce-utils.js'
import { SyncOptions } from '../sync/sync.js'
import { formatChoicesWithSeparator, normalizeFilesToSync, resolveDirectoryPath } from './config.utils.js'

const enum GlobalSettings {
  CHOICE_NEW_CONFIG = 'New Configuration',
  CHOICE_EDIT_TARGET_CONFIG = 'Salesforce - Default Target Organization',
  CHOICE_SHOW_CONFIG = 'Show Configuration JSON',
}

const enum ConfigActions {
  EDIT = '✏️ EDIT',
  DELETE = '🗑️ DELETE',
}

export interface SyncConfig extends Partial<SyncOptions> {
  alias: string
  filesToSync?: string
}

async function configCommand() {
  try {
    const configs = config.getConfigs()

    if (!configs.length) {
      log.info('No configurations found, create new one.')
      await upsertConfiguration(configs)
      return
    }

    const currentTargetOrg = config.getDefaultTargetOrg()
    const targetOrgChoice = `${GlobalSettings.CHOICE_EDIT_TARGET_CONFIG} (${currentTargetOrg ?? 'Not Set'})`

    const { choice } = await inquirer.prompt<{ choice: string }>([
      {
        name: 'choice',
        type: 'list',
        message: 'Select Action:',
        choices: [
          new inquirer.Separator('------- Global Settings ------'),
          GlobalSettings.CHOICE_NEW_CONFIG,
          targetOrgChoice,
          GlobalSettings.CHOICE_SHOW_CONFIG,
          new inquirer.Separator('------- Configurations -------'),
          ...configs.map(c => c.alias),
        ],
      },
    ])

    if (choice === GlobalSettings.CHOICE_NEW_CONFIG) {
      await upsertConfiguration(configs)
      return
    }

    if (choice === targetOrgChoice) {
      await setDefaultTargetOrg(currentTargetOrg)
      return
    }

    if (choice === GlobalSettings.CHOICE_SHOW_CONFIG) {
      config.openConfigFile()
      return
    }

    await handleExistingConfiguration(choice, configs)
  } catch (error) {
    log.error(composeErrorMessage(error))
  }
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
    config.saveConfigs(configs)
    log.success(`Configuration for alias "${updatedConfig.alias}" created successfully!`)
  } else {
    const newIndex = configs.findIndex(c => c.alias === updatedConfig.alias)
    if (newIndex !== -1) {
      configs[newIndex] = updatedConfig
    }
    config.saveConfigs(configs)
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
  config.saveConfigs(configs)
  log.success(`Deleted configuration "${toDelete.alias}".`)
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

export function registerConfigCommand(program: Command) {
  program.command('config').description('Configure Salesforce Sync process.').action(configCommand)
}

async function setDefaultTargetOrg(currentTargetOrg?: string) {
  try {
    const orgGroups = await loadAsync(() => salesforce.getAvailableOrgs(), {
      loading: 'Querying Salesforce orgs. Please wait...',
      success: 'Salesforce orgs retrieved successfully.',
      error: 'Error: Unable to retrieve Salesforce orgs.',
    })

    const choices = [
      ...formatChoicesWithSeparator(orgGroups.scratchOrgs, 'Scratch Orgs'),
      ...formatChoicesWithSeparator(orgGroups.devHubs, 'Dev Hubs'),
      ...formatChoicesWithSeparator(orgGroups.sandboxes, 'Sandboxes'),
      ...formatChoicesWithSeparator(orgGroups.other, 'Other Orgs'),
    ]
    if (!choices.length) {
      log.warning('No target organizations available to set.')
      return
    }

    const { selectedOrg } = await inquirer.prompt<{ selectedOrg: string }>([
      {
        name: 'selectedOrg',
        type: 'rawlist',
        message: 'Select the default target organization:',
        choices,
        default: currentTargetOrg,
      },
    ])

    config.saveDefaultTargetOrg(selectedOrg)
    log.success(`Default target organization set to "${selectedOrg}".`)
  } catch (error) {
    log.error(composeErrorMessage(error, 'An error occurred while setting the default target organization.'))
  }
}
