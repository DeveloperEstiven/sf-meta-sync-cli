import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'
import { CONFIG } from '../utils/constants.js'

export const registerSyncCommand = (program: Command) => {
  program
    .command('sync')
    .description('Sync Salesforce metadata with local files.')
    .argument('<orgAlias>', 'Salesforce org alias')
    .option('--local-dir <dir>', 'Local directory for files', CONFIG.localDir)
    .option('--file-extension <ext>', 'File extension for local files', CONFIG.fileExtension)
    .option('--salesforce-query <query>', 'SOQL query for metadata', CONFIG.salesforceQuery)
    .option('--filename-field <field>', 'Field for filename in Salesforce', CONFIG.filenameField)
    .option('--field-name <field>', 'Field containing file content in Salesforce', CONFIG.fieldName)
    .action(async (orgAlias, options) => {
      const spinner = ora('Syncing metadata...').start()
      try {
        const result = await syncMetadata(orgAlias, options)
        spinner.succeed('Metadata synced successfully.')
        console.log(chalk.greenBright(result))
      } catch (error) {
        spinner.fail('Failed to sync metadata.')
        console.error(chalk.red(error))
      }
    })
}

// Core function for syncing metadata
const syncMetadata = async (orgAlias: string, options: Record<string, string>): Promise<string> => {
  return 'Synced'
}
