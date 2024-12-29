import { execAsync } from './cli-utils.js'

interface QueryResult {
  status: number
  result: Result
  warnings: unknown[]
}

interface Result {
  records: SalesforceRecord[]
  totalSize: number
  done: boolean
}

export type SalesforceRecord = { attributes: Attributes } & Record<string, string>

interface Attributes {
  type: string
  url: string
}

export const salesforce = {
  query: async (targetOrg: string, query: string) => {
    const command = `sf data query --target-org ${targetOrg} --query "${query}" --json`

    const { stdout } = await execAsync(command)

    const queryResult = JSON.parse(stdout) as QueryResult
    if (!queryResult || !queryResult.result || !queryResult.result.records) {
      throw new Error('No records found or invalid response from Salesforce.')
    }

    return queryResult.result.records
  },
}
