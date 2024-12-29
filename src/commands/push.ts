import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'

export const registerPushCommand = (program: Command): void => {
  program
    .command('push')
    .description('Push a local file to Salesforce as metadata.')
    .argument('<targetOrg>', 'Salesforce org alias')
    .argument('<filePath>', 'Path to the file to push')
    .action((targetOrg, filePath) => {
      const spinner = ora('Pushing metadata...').start()
      try {
        spinner.succeed('File pushed successfully.')
      } catch (error) {
        spinner.fail('Failed to push file.')
        console.error(chalk.red(error))
      }
    })
}

/*
#!/bin/bash

# Configurable Parameters
METADATA_TYPE="CustomMetadata" # Type of metadata being deployed
FILE_EXTENSION=".dwl"          # File extension for local files
FIELD_NAME="Script__c"         # Field in Salesforce object
FILENAME_PREFIX="DataWeave_Script." # Prefix for the metadata file
SALESFORCE_URL="https://login.salesforce.com" # Salesforce login URL

ZIP_FILE="deploy.zip"          # Deployment zip file
METADATA_DIR="metadata"        # Directory for temporary metadata files
PROJECT_FILE="sfdx-project.json" # Temporary project file
API_VERSION="59.0"             # Salesforce API version

# Text Styling
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
CYAN="\033[36m"
MAGENTA="\033[35m"
BOLD="\033[1m"
RESET="\033[0m"

# Globals
STEP=1

# Functions
function step_message() {
  echo -e "\n${CYAN}${BOLD}Step $STEP: $1${RESET}\n"
  STEP=$((STEP + 1))
}

function initialize() {
  step_message "Initializing Metadata Push Tool"
  echo -e "${CYAN}This script pushes a selected file as a ${METADATA_TYPE} record to a Salesforce org.${RESET}"
  echo -e "${CYAN}It prepares the metadata, generates a package.xml, and deploys it to the target org.${RESET}\n"
}

function validate_inputs() {
  if [[ -z "$TARGET_ORG" ]]; then
    echo -e "${RED}${BOLD}Error:${RESET} No target org provided."
    echo -e "${CYAN}Usage:${RESET} ./push.sh <target-org> <file-to-push>\n"
    exit 1
  fi

  if [[ -z "$FOCUSED_FILE" || ! -f "$FOCUSED_FILE" ]]; then
    echo -e "${RED}${BOLD}Error:${RESET} No valid file specified to push."
    echo -e "${CYAN}Usage:${RESET} ./push.sh <target-org> <file-to-push>\n"
    exit 1
  fi

  if [[ "${FOCUSED_FILE##*.}" != "${FILE_EXTENSION#.}" ]]; then
    echo -e "${RED}${BOLD}Error:${RESET} The file to push must have a ${FILE_EXTENSION} extension."
    exit 1
  fi
}

function prepare_metadata_file() {
  step_message "Preparing metadata file"
  mkdir -p "${METADATA_DIR}/${METADATA_TYPE}"

  local developer_name=$(basename "$FOCUSED_FILE" "$FILE_EXTENSION")
  local metadata_file="${METADATA_DIR}/${METADATA_TYPE}/${FILENAME_PREFIX}${developer_name}.md-meta.xml"
  local package_file="${METADATA_DIR}/package.xml"

  cat > "$metadata_file" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<${METADATA_TYPE} xmlns="http://soap.sforce.com/2006/04/metadata" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <label>${developer_name}</label>
  <protected>false</protected>
  <values>
    <field>${FIELD_NAME}</field>
    <value xsi:type="xsd:string">$(cat "$FOCUSED_FILE")</value>
  </values>
</${METADATA_TYPE}>
EOF

  echo -e "${GREEN}${BOLD}Metadata prepared at:${RESET} $metadata_file"

  cat > "$PROJECT_FILE" <<EOF
{
  "packageDirectories": [
    {
      "path": "${METADATA_DIR}",
      "default": true
    }
  ],
  "name": "TemporaryProject",
  "namespace": "",
  "sfdcLoginUrl": "${SALESFORCE_URL}",
  "sourceApiVersion": "${API_VERSION}"
}
EOF

  echo -e "${GREEN}${BOLD}Temporary Salesforce DX project file created:${RESET} $PROJECT_FILE"

  cat > "$package_file" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>${FILENAME_PREFIX}${developer_name}</members>
    <name>${METADATA_TYPE}</name>
  </types>
  <version>${API_VERSION}</version>
</Package>
EOF

  echo -e "${GREEN}${BOLD}Package manifest prepared at:${RESET} $package_file"
}

function create_deployment_package() {
  step_message "Creating deployment package"
  cd "$METADATA_DIR" || exit
  zip -r "../$ZIP_FILE" .
  cd - > /dev/null || exit
  echo -e "${GREEN}${BOLD}Deployment package created at:${RESET} $ZIP_FILE"
}

function deploy_metadata() {
  step_message "Deploying metadata to Salesforce org"
  local deploy_output
  deploy_output=$(sf project deploy start --target-org "$TARGET_ORG" --source-dir "$METADATA_DIR" --json)
  local deploy_status=$?

  if [[ $deploy_status -ne 0 ]]; then
    echo -e "\n${RED}${BOLD}Failed to deploy metadata.${RESET}\n"
  else
    local completed_date=$(echo "$deploy_output" | jq -r '.result.completedDate')
    local full_name=$(echo "$deploy_output" | jq -r '.result.files[0].fullName')
    local state=$(echo "$deploy_output" | jq -r '.result.files[0].state')
    local warnings=$(echo "$deploy_output" | jq -r '.warnings')

    echo -e "${GREEN}${BOLD}${completed_date} Successfully deployed ${full_name} (${state}) to ${TARGET_ORG}.${RESET}"
    [[ -n "$warnings" ]] && echo -e "${YELLOW}${BOLD}Warnings:${RESET} $warnings"
  fi
}

function cleanup() {
  step_message "Cleaning up temporary metadata"
  rm -rf "$METADATA_DIR" "$ZIP_FILE" "$PROJECT_FILE"
  echo -e "${GREEN}${BOLD}Temporary files cleaned.${RESET}"
}

# Main Script Execution
TARGET_ORG="$1"
FOCUSED_FILE="$2"

initialize
validate_inputs
prepare_metadata_file
create_deployment_package
deploy_metadata
cleanup

*/
