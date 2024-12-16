import chalk from 'chalk'
import ora, { Ora } from 'ora'

export const startSpinner = (message: string) => ora(message).start()

export const stopSpinner = (spinner: Ora, success = true, message = 'Done') => {
  if (success) spinner.succeed(chalk.green(message))
  else spinner.fail(chalk.red(message))
}

export const printError = (message: string) => console.error(chalk.red(message))
export const printSuccess = (message: string) => console.log(chalk.green(message))
export const printWarning = (message: string) => console.warn(chalk.yellow(message))
export const printInfo = (message: string) => console.info(chalk.cyan(message))
