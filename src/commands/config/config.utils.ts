import inquirer from 'inquirer'
import os from 'os'
import path from 'path'
import { SyncConfig } from './config.js'

export const formatChoicesWithSeparator = (orgs: string[], groupName: string) =>
  orgs.length ? [new inquirer.Separator(`--- ${groupName} ---`), ...orgs] : []

export function normalizeFilesToSync(cfg: SyncConfig) {
  if (!cfg.filesToSync) return
  cfg.filesToSync = cfg.filesToSync
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .join(', ')
}

export function resolveDirectoryPath(directory: string) {
  if (directory.startsWith('~')) {
    return path.join(os.homedir(), directory.slice(1))
  }
  return path.resolve(directory)
}
