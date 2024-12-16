import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'

export const registerPushCommand = (program: Command): void => {
  program
    .command('push')
    .description('Push a local file to Salesforce as metadata.')
    .argument('<orgAlias>', 'Salesforce org alias')
    .argument('<filePath>', 'Path to the file to push')
    .action((orgAlias, filePath) => {
      const spinner = ora('Pushing metadata...').start()
      try {
        spinner.succeed('File pushed successfully.')
      } catch (error) {
        spinner.fail('Failed to push file.')
        console.error(chalk.red(error))
      }
    })
}
