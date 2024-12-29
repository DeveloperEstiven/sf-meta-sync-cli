import { exec } from 'child_process'
import Configstore from 'configstore'
import { SyncConfig } from '../commands/config/config.js'

const CONFIGSTORE_NAME = 'SF_META_SYNC'
const CONFIGS_KEY = 'configs'
const TARGET_ORG_KEY = 'targetOrg'

const configStore = new Configstore(CONFIGSTORE_NAME, {})

export const config = {
  openConfigFile: () => {
    const filePath = configStore.path
    console.log(`Opening config file: ${filePath}`)
    const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
    exec(`${opener} "${filePath}"`)
  },

  getConfigs: (): SyncConfig[] => {
    return configStore.get(CONFIGS_KEY) ?? []
  },

  getConfig: (configAlias: string): SyncConfig | undefined => {
    return (configStore.get(CONFIGS_KEY) ?? []).find((config: SyncConfig) => config.alias === configAlias)
  },

  saveConfigs: (configs: SyncConfig[]) => {
    configStore.set(CONFIGS_KEY, configs)
  },

  saveDefaultTargetOrg: (org: string) => {
    configStore.set(TARGET_ORG_KEY, org)
  },

  getDefaultTargetOrg: (): string | undefined => {
    return configStore.get(TARGET_ORG_KEY)
  },

  getConfigStorePath: (): string => {
    return configStore.path
  },
}
