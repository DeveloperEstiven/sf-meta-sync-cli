# SF Meta Sync CLI

1. Install colordiff tool for Terminal
   Run: `brew install colordiff`
2. Install CLI Tool
   Run: `git clone https://github.com/DeveloperEstiven/sf-meta-sync-cli.git`
3. Install dependencies:
   Run: `cd sf-meta-sync-cli && npm install`
4. Install CLI globally:
   Run: `npm link`
5. Configure CLI & Follow instructions to configure this project:
   Run: `sf-meta-sync config`. Example:

   ```shell
   ➞  sf-meta-sync config
   No configurations found, create new one.
   ✔ Enter the full or relative path to the local project directory.
   Examples:

    Absolute path: /Users/your-username/Desktop/my-project
    Home directory shortcut: ~/Desktop/my-project
    Relative path: ./my-project or ../my-project

    /Users/user/Desktop/projects/dataweave/src/main/dw
    ✔ Enter configuration alias: salesforce-remote-dw
    ✔ File extension for local files (leave blank for none): .dwl
    ✔ SOQL query for metadata (leave blank for none): SELECT DeveloperName, Script__c FROM DataWeave_Script__mdt
    ✔ Field for filename in Salesforce (leave blank for none): DeveloperName
    ✔ Field containing file content in Salesforce (leave blank for none): Script__c
    ✔ Disable detailed diff display for changed files? Yes
    ✔ Comma-separated list of filenames to sync (leave blank if none):
    ✔ Configuration for alias "salesforce-remote-dw" created successfully!
   ```

6. Add new file in `.vscode/tasks.json` to your project with this content:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Sync DataWeave Scripts with default org",
      "type": "shell",
      "command": "sf-meta-sync sync -c \"sf-meta-sync-cli\"",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      },
      "runOptions": {
        "runOn": "folderOpen"
      }
    }
  ]
}
```

7. Done. Now, every time you will open the project locally, the CLI tool will check scripts for differences
