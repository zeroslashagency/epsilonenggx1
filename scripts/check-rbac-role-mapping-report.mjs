#!/usr/bin/env node

const reportUrl = process.env.RBAC_HEALTHCHECK_URL
const authToken = process.env.RBAC_HEALTHCHECK_TOKEN
const timeoutMs = Number(process.env.RBAC_HEALTHCHECK_TIMEOUT_MS || 15000)

if (!reportUrl) {
  console.error('RBAC_HEALTHCHECK_URL is required')
  process.exit(1)
}

if (!authToken) {
  console.error('RBAC_HEALTHCHECK_TOKEN is required')
  process.exit(1)
}

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), timeoutMs)

try {
  const response = await fetch(reportUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: 'application/json',
    },
    signal: controller.signal,
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`RBAC health gate failed: HTTP ${response.status}`)
    console.error(body)
    process.exit(1)
  }

  const payload = await response.json()
  const summary = payload?.data?.summary

  if (!payload?.success || !summary) {
    console.error('RBAC health gate failed: invalid response payload')
    console.error(JSON.stringify(payload, null, 2))
    process.exit(1)
  }

  const issues = Number(summary.issues || 0)
  console.log(`RBAC health summary: total=${summary.total}, issues=${issues}`)
  console.log(`RBAC by status: ${JSON.stringify(summary.by_status || {}, null, 0)}`)

  if (issues > 0) {
    const issueRows = payload?.data?.issues || []
    console.error(`RBAC health gate failed: ${issues} mapping issue(s) detected`)
    console.error(JSON.stringify(issueRows.slice(0, 20), null, 2))
    process.exit(1)
  }

  console.log('RBAC health gate passed')
} catch (error) {
  console.error('RBAC health gate failed: request error')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
} finally {
  clearTimeout(timeout)
}
