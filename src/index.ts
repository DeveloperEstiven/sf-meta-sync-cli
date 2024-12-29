#!/usr/bin/env node

import chalk from 'chalk'
import { Command } from 'commander'
import figlet from 'figlet'
import { registerPushCommand } from './commands/push.js'
import { registerSyncCommand } from './commands/sync/sync.js'

const program = new Command()

const printBanner = (): void => {
  console.log(
    chalk.blueBright(
      figlet.textSync('SF MetaSync', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default',
      }),
    ),
  )
}

printBanner()
program.name('sf-meta-sync-cli').description('A CLI tool for Salesforce metadata sync').version('1.0.0')

registerSyncCommand(program)
registerPushCommand(program)

program.parse(process.argv)
