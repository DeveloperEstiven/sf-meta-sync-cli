import boxen, { Options as BoxenOptions } from 'boxen'
import chalk from 'chalk'
import { spawnSync } from 'child_process'
import inquirer from 'inquirer'
import { log } from '../../utils/cli-utils.js'
import { config } from '../../utils/config-utils.js'
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

interface BaseSyncOptions {
  noDiff?: boolean
  configAlias?: string
}

interface RequiredSyncOptions {
  targetOrg: string
  localDir: string
  fileExtension: string
  query: string
  filenameField: string
  fieldName: string
}

export type CompleteSyncOptions = RequiredSyncOptions & BaseSyncOptions

export type PartialSyncOptions = Partial<RequiredSyncOptions> & BaseSyncOptions

export const mergeOptionsWithConfig = (syncOptions: PartialSyncOptions): CompleteSyncOptions => {
  if (!syncOptions.configAlias) {
    return validateAndBuild(syncOptions)
  }

  const configForThisOrg = config.getConfig(syncOptions.configAlias)
  const defaultTargetOrg = config.getDefaultTargetOrg()

  if (!configForThisOrg) {
    return validateAndBuild(syncOptions)
  }

  const merged: PartialSyncOptions = {
    localDir: syncOptions.localDir ?? configForThisOrg.localDir ?? '.',
    fileExtension: syncOptions.fileExtension ?? configForThisOrg.fileExtension,
    query: syncOptions.query ?? configForThisOrg.query,
    filenameField: syncOptions.filenameField ?? configForThisOrg.filenameField,
    fieldName: syncOptions.fieldName ?? configForThisOrg.fieldName,
    noDiff: syncOptions.noDiff || configForThisOrg.noDiff,
    configAlias: syncOptions.configAlias,
    targetOrg: syncOptions.targetOrg ?? defaultTargetOrg,
  }

  return validateAndBuild(merged)
}

function validateAndBuild(opts: PartialSyncOptions): CompleteSyncOptions {
  const missingFields: string[] = []

  if (!opts.targetOrg || !opts.targetOrg.trim()) {
    missingFields.push('targetOrg')
  }
  if (!opts.fileExtension || !opts.fileExtension.trim()) {
    missingFields.push('fileExtension')
  }
  if (!opts.query || !opts.query.trim()) {
    missingFields.push('query')
  }
  if (!opts.filenameField || !opts.filenameField.trim()) {
    missingFields.push('filenameField')
  }
  if (!opts.fieldName || !opts.fieldName.trim()) {
    missingFields.push('fieldName')
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields: ${missingFields.join(', ')}. ` +
        `Provide them via CLI or config (run 'sf-meta-sync config').`,
    )
  }

  return {
    localDir: opts.localDir!,
    fileExtension: opts.fileExtension!,
    query: opts.query!,
    filenameField: opts.filenameField!,
    fieldName: opts.fieldName!,
    configAlias: opts.configAlias,
    noDiff: opts.noDiff,
    targetOrg: opts.targetOrg!,
  }
}
