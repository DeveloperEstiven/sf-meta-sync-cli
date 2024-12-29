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

interface Org {
  alias?: string
  username?: string
  orgName?: string
  orgId?: string
}

interface OrgListResult {
  status: number
  result: {
    scratchOrgs?: Org[]
    devHubs?: Org[]
    sandboxes?: Org[]
    other?: Org[]
  }
  warnings?: string[]
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

  getAvailableOrgs: async () => {
    const command = `sf org list --json`

    const { stdout } = await execAsync(command)

    const orgListResult = JSON.parse(stdout) as OrgListResult
    if (!orgListResult || !orgListResult.result) {
      throw new Error('No organizations found or invalid response from Salesforce.')
    }

    const { scratchOrgs = [], devHubs = [], sandboxes = [], other = [] } = orgListResult.result
    const formatOrgs = (orgs: Org[]) => orgs.map(org => org.alias!).filter(Boolean)

    return {
      scratchOrgs: formatOrgs(scratchOrgs),
      devHubs: formatOrgs(devHubs),
      sandboxes: formatOrgs(sandboxes),
      other: formatOrgs(other),
    }
  },
}
