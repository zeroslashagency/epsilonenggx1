#!/bin/bash
# Simple Vercel API wrapper for MCP

VERCEL_TOKEN="${VERCEL_API_TOKEN}"
PROJECT_ID="prj_BjiOwmHv7KMdL9htSXx5uGsQr5DG"

case "$1" in
  "deploy")
    curl -X POST "https://api.vercel.com/v1/integrations/deploy/${PROJECT_ID}/2nCB1Ba6ZR"
    ;;
  "list-deployments")
    curl -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      "https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=5"
    ;;
  "get-deployment")
    curl -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      "https://api.vercel.com/v13/deployments/$2"
    ;;
  *)
    echo "Usage: $0 {deploy|list-deployments|get-deployment <id>}"
    exit 1
    ;;
esac
