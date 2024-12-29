import boxen, { Options as BoxenOptions } from 'boxen'
import chalk from 'chalk'
import { spawnSync } from 'child_process'
import inquirer from 'inquirer'
import { log } from '../../utils/cli-utils.js'
import { REG_EXP } from '../../utils/constants.js'

export const contentUtils = {
  normalizeLineEndings: (content: string = ''): string => content.replace(REG_EXP.carriageReturn, ''),
  escapeContent: (content: string = ''): string => content.replace(REG_EXP.singleQuote, "'\\''"),
}

const fullscreen = (width: number) => {
  return [width]
}

export const displayDiff = (fileName: string, diff: string) => {
  console.log(`🛑 Diff for ${fileName}:\n${diff}`)
}

export const generateDiff = (localContent: string, remoteContent: string): string => {
  const bashCommand = `diff <(echo '${contentUtils.escapeContent(localContent)}') <(echo '${contentUtils.escapeContent(remoteContent)}') | colordiff`
  const result = spawnSync('bash', ['-c', bashCommand], { encoding: 'utf-8' })
  return result.error || result.stderr ? 'Unable to generate diff.' : result.stdout
}

export const runValidationPipeline = (steps: { validate: () => boolean; errorMessage: string }[]): boolean => {
  const errors: string[] = []

  for (const step of steps) {
    if (!step.validate()) {
      errors.push(step.errorMessage)
    }
  }

  if (errors.length > 0) {
    errors.forEach(error => log.error(error))
    return false
  }

  return true
}

export const logWithCategories = (title: string, categories: Record<string, string[]>) => {
  const messages: string[] = []

  for (const [category, files] of Object.entries(categories)) {
    if (files.length) {
      messages.push(chalk.bold(category))
      messages.push(...files.map(file => ` - ${file}`))
      messages.push('')
    }
  }

  if (messages.length === 0) {
    return false
  }

  if (messages[messages.length - 1] === '') {
    messages.pop()
  }

  const defaultOptions: BoxenOptions = {
    title,
    titleAlignment: 'left',
    borderStyle: 'bold',
    padding: 1,
    // @ts-expect-error height will fallback to content's height
    fullscreen,
  }

  console.log()
  console.log(boxen(messages.join('\n'), defaultOptions))
  return true
}

export const promptFileSelection = async (message: string, choices: string[]) => {
  console.log()
  const { files } = await inquirer.prompt<{ files: string[] }>({
    type: 'checkbox',
    name: 'files',
    message,
    choices,
  })
  return files
}
