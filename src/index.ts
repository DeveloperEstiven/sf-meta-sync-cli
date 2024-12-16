#!/usr/bin/env node

import chalk from 'chalk'
import { Command } from 'commander'
import figlet from 'figlet'
import { registerPushCommand } from './commands/push.js'
import { registerSyncCommand } from './commands/sync.js'

const program = new Command()

// Helper to print the banner
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

// Initialize CLI
printBanner()
program.name('sf-meta-sync-cli').description('A CLI tool for Salesforce metadata sync').version('1.0.0')

// Register commands
registerSyncCommand(program)
registerPushCommand(program)

// Parse arguments
program.parse(process.argv)
