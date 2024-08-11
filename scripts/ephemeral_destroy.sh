#!/bin/env bash
# set -euxo pipefail

PR_NUMBER="${1}"
PORT="25${PR_NUMBER}"
ROOT="./ephemeral/${PR_NUMBER}"
HOSTNAME="${PR_NUMBER}.pr.didroom.com"
UUID="U${PR_NUMBER}"

REPO="signroom"
OWNER="forkbombeu"
NODE_VERSION="20.14.0"
DEPENDENCIES=("caddy" "curl" "jq" "git")
CADDY_API="http://localhost:2019"

if [ "${TERM:-}" = "" ]; then
  echo "Setting TERM to dumb" # makes tput happy
  TERM="dumb"
fi
PINK=$(tput setaf 5)
NC=$(tput sgr0) # No Color
# GREEN=$(tput setaf 2)

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <pr_number>"
  exit 1
fi

dependency_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Main script
for dep in "${DEPENDENCIES[@]}"; do
  if ! dependency_exists "$dep"; then
    echo "Error: ${PINK}$dep${NC} is not installed."
    exit 1
  fi
done

is_positive_integer() {
  [[ "$1" =~ ^[1-9][0-9]*$ ]]
}
# Validate if PR_NUMBER is a positive integer
if ! is_positive_integer "$PR_NUMBER"; then
  echo "Error: PR number '$PR_NUMBER' is not a valid positive integer."
  exit 1
fi

# ST
# GitHub API URL for checking the PR
API_URL="https://api.github.com/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}"

# Use curl to query the API
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL")

if [ "$response" -eq 200 ]; then
  echo "The PR number $PR_NUMBER is valid."
elif [ "$response" -eq 404 ]; then
  echo "Error: The PR number $PR_NUMBER does not exist."
  exit 1
else
  echo "Error: Unable to check PR number. HTTP response code: $response"
  exit 1
fi

pkill -F "${ROOT}/pid"
rm -r "${ROOT}"

# Check if the route with the specified @id exists
EXISTING_ROUTE=$(curl -s $CADDY_API/config/apps/http/servers/srv0/routes/ | jq -r '.[] | select(.["@id"] == "'$UUID'")')

if [ -n "$EXISTING_ROUTE" ]; then
  curl -X DELETE "$CADDY_API/id/$UUID"
fi

echo "You know who saluts you? PR: ${PINK}${PR_NUMBER}${NC}"

exit 0
