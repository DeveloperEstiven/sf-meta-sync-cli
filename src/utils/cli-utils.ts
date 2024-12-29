import chalk from 'chalk'
import { exec } from 'child_process'
import ora, { Ora } from 'ora'
import { promisify } from 'util'
import { REG_EXP } from './constants.js'

export const startSpinner = (message: string) => ora(message).start()

export const stopSpinner = (spinner: Ora, success = true, message = 'Done') => {
  if (success) spinner.succeed(chalk.green(message))
  else spinner.fail(chalk.red(message))
}

const addIconToMessage = (icon: string, message?: string) => {
  if (!message) return ''

  const match = message.match(REG_EXP.specialSymbol)
  if (match) {
    return `${match[0]}${icon} ${message.slice(match[0].length)}`
  }
  return `${icon} ${message}`
}

export const log = {
  error: (message: string) => console.error(chalk.red(addIconToMessage('✖', message))),
  success: (message: string) => console.log(chalk.green(addIconToMessage('✔', message))),
  warning: (message: string) => console.warn(chalk.yellow(addIconToMessage('ℹ', message))),
  info: (message: string) => console.info(message),
}

export const detailedLogger =
  (detailed?: boolean) =>
  (message: string, logFn: (message: string) => void = log.info) => {
    if (detailed) logFn(message)
  }

export const isError = (error: unknown): error is Error => {
  return typeof error === 'object' && error !== null && 'message' in error
}

export const execAsync = promisify(exec)

export const composeErrorMessage = (error: unknown, message?: string) => {
  if (!isError(error)) {
    return `${message || 'An unknown error occurred'}. ${error}`
  }

  if (error.name === 'ExitPromptError') {
    return ''
  }

  return `${message ? `${message}\n` : ''}Error: ${error.message}`
}

interface SpinnerMessages {
  loading: string
  success: string
  error: string
}

const DEFAULT_SPINNER_MESSAGES: SpinnerMessages = {
  loading: 'Loading...',
  success: 'Success',
  error: 'Failed',
}

export const loadAsync = async <T>(
  action: () => Promise<T>,
  spinnerMessages = DEFAULT_SPINNER_MESSAGES,
  errorContext?: string,
): Promise<T> => {
  const spinner = startSpinner(spinnerMessages.loading)

  try {
    const result = await action()
    stopSpinner(spinner, true, spinnerMessages.success)
    return result
  } catch (err) {
    stopSpinner(spinner, false, spinnerMessages.error)
    throw new Error(composeErrorMessage(err, errorContext))
  }
}
