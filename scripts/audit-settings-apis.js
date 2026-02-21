#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const BASE_URL = process.env.SETTINGS_AUDIT_BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLEANUP_USERS = process.env.SETTINGS_AUDIT_CLEANUP !== 'false'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase environment variables in .env.local')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const reportDir = path.join(process.cwd(), 'reports', 'settings-api-audit')
fs.mkdirSync(reportDir, { recursive: true })

function nowIso() {
  return new Date().toISOString()
}

function formatStatusSet(statuses) {
  return statuses.join('|')
}

function isUnauthorized(status) {
  return status === 401 || status === 403
}

async function waitForServer(url, timeoutMs = 90000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET', redirect: 'manual' })
      if (res.status > 0 && res.status < 500) {
        return true
      }
    } catch {
      // keep waiting
    }
    await new Promise(resolve => setTimeout(resolve, 1200))
  }
  return false
}

async function listUsers() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw error
    return data?.users || []
  } catch {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error
    return data?.users || []
  }
}

async function getRoleByName(name) {
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select('id, name')
    .eq('name', name)
    .single()

  if (error || !data) {
    throw new Error(`Role not found: ${name}`)
  }

  return data
}

async function createAuditUser({ email, password, roleName, fullName }) {
  const role = await getRoleByName(roleName)

  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  })

  if (createError || !createData?.user) {
    throw new Error(`Failed to create audit user (${roleName}): ${createError?.message || 'unknown'}`)
  }

  const userId = createData.user.id

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role: role.name,
        role_badge: role.name,
        standalone_attendance: 'NO',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    throw new Error(`Failed to upsert profile for ${email}: ${profileError.message}`)
  }

  const { error: clearRoleError } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)

  if (clearRoleError) {
    throw new Error(`Failed to clear user_roles for ${email}: ${clearRoleError.message}`)
  }

  const { error: assignRoleError } = await supabaseAdmin
    .from('user_roles')
    .insert({ user_id: userId, role_id: role.id })

  if (assignRoleError) {
    throw new Error(`Failed to assign role for ${email}: ${assignRoleError.message}`)
  }

  return {
    id: userId,
    email,
    password,
    roleName,
  }
}

async function signInAndGetToken(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data?.session?.access_token) {
    throw new Error(`Failed to sign in ${email}: ${error?.message || 'no access token'}`)
  }

  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const storageKey = `sb-${projectRef}-auth-token`
  const encodedSession = `base64-${Buffer.from(JSON.stringify(data.session)).toString('base64url')}`
  const cookieHeader = `${storageKey}=${encodedSession}`

  return {
    token: data.session.access_token,
    cookie: cookieHeader,
  }
}

async function callApi({ method, path, token, cookie, body, headers = {} }) {
  const requestHeaders = { ...headers }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }
  if (cookie) {
    requestHeaders.Cookie = cookie
  }

  let payload
  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: payload,
    redirect: 'manual',
  })

  const text = await response.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  return {
    status: response.status,
    ok: response.ok,
    location: response.headers.get('location'),
    json,
    text,
  }
}

function evaluateStatus(status, rule) {
  if (!rule) {
    return {
      pass: true,
      expected: 'no expectation',
    }
  }

  if (Array.isArray(rule.allow)) {
    return {
      pass: rule.allow.includes(status),
      expected: `status in [${formatStatusSet(rule.allow)}]`,
    }
  }

  if (rule.notAuthDenied) {
    return {
      pass: !isUnauthorized(status),
      expected: 'status is not 401/403',
    }
  }

  return {
    pass: false,
    expected: 'invalid rule configuration',
  }
}

function normalizeStatus(response) {
  const redirectedToAuth =
    response.status >= 300 &&
    response.status < 400 &&
    typeof response.location === 'string' &&
    response.location.includes('/auth')

  return {
    status: redirectedToAuth ? 401 : response.status,
    redirectedToAuth,
  }
}

function resolveValue(value, ctx) {
  if (typeof value === 'function') {
    return value(ctx)
  }
  return value
}

async function cleanupUsers(userIds) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)))
  for (const userId of uniqueIds) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId)
    } catch {
      // best effort
    }
  }
}

function buildTestMatrix(ctx) {
  const fakeRoleId = crypto.randomUUID()

  return [
    {
      id: 'UM-01',
      area: 'User Management',
      name: 'List users',
      method: 'GET',
      path: '/api/admin/users',
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-02',
      area: 'User Management',
      name: 'Get user permissions',
      method: 'GET',
      path: `/api/admin/get-user-permissions?userId=${ctx.operatorUser.id}`,
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-03',
      area: 'User Management',
      name: 'Get user activity logs',
      method: 'GET',
      path: `/api/admin/user-activity-logs?userId=${ctx.operatorUser.id}`,
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-04',
      area: 'User Management',
      name: 'Update user contact',
      method: 'POST',
      path: '/api/admin/update-user-contact',
      body: {
        userId: ctx.operatorUser.id,
        phone: '',
        employee_code: '',
        department: '',
        designation: '',
      },
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-05',
      area: 'User Management',
      name: 'Update user permissions',
      method: 'POST',
      path: '/api/admin/update-user-permissions',
      body: {
        userId: ctx.operatorUser.id,
        role: 'Operator',
        permissions: ['dashboard'],
        standalone_attendance: 'NO',
      },
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-05B',
      area: 'User Management',
      name: 'Update user permissions (empty role fallback)',
      method: 'POST',
      path: '/api/admin/update-user-permissions',
      body: {
        userId: ctx.operatorUser.id,
        role: '',
        permissions: ['dashboard'],
        standalone_attendance: 'NO',
      },
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
      note: 'Empty role input should be tolerated and fall back to current profile role.',
    },
    {
      id: 'UM-06',
      area: 'User Management',
      name: 'Send password reset (invalid payload)',
      method: 'POST',
      path: '/api/admin/send-password-reset',
      body: {},
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [400] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-07',
      area: 'User Management',
      name: 'Change user email (invalid payload)',
      method: 'POST',
      path: '/api/admin/change-user-email',
      body: {},
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [400] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-08',
      area: 'User Management',
      name: 'Toggle user status (invalid payload)',
      method: 'POST',
      path: '/api/admin/toggle-user-status',
      body: {},
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [400] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-09',
      area: 'User Management',
      name: 'Set user password (invalid payload)',
      method: 'POST',
      path: '/api/admin/set-user-password',
      body: {},
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [400] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'UM-10',
      area: 'User Management',
      name: 'Delete user without CSRF token',
      method: 'POST',
      path: '/api/admin/delete-user',
      body: {},
      expect: {
        noAuth: { allow: [401, 403] },
        superAdmin: { allow: [403] },
        operator: { allow: [403] },
      },
      note: 'CSRF protection is expected to block API-token-only requests.',
    },
    {
      id: 'AU-01',
      area: 'Add Users',
      name: 'List roles for add-user flow',
      method: 'GET',
      path: '/api/admin/roles',
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'AU-02',
      area: 'Add Users',
      name: 'Get employees list',
      method: 'GET',
      path: '/api/admin/available-employees',
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
      note: 'This endpoint powers /settings/add-users and should be restricted to admin roles.',
    },
    {
      id: 'AU-03',
      area: 'Add Users',
      name: 'Get shift templates',
      method: 'GET',
      path: '/api/shift-templates',
      expect: {
        noAuth: { allow: [401, 403] },
        superAdmin: { notAuthDenied: true },
        operator: { allow: [401, 403] },
      },
      note: 'This endpoint powers /settings/add-users and should be protected.',
    },
    {
      id: 'AU-04',
      area: 'Add Users',
      name: 'Create user from employee (invalid payload)',
      method: 'POST',
      path: '/api/admin/create-user-from-employee',
      body: {},
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [400] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'AU-05',
      area: 'Add Users',
      name: 'Bulk assignment (invalid payload)',
      method: 'POST',
      path: '/api/assignments/bulk',
      body: {},
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [400] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'RP-01',
      area: 'Role Profiles',
      name: 'List roles',
      method: 'GET',
      path: '/api/admin/roles',
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'RP-02',
      area: 'Role Profiles',
      name: 'Clone role with unknown id',
      method: 'POST',
      path: `/api/admin/roles/${fakeRoleId}/clone`,
      body: {},
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { notAuthDenied: true },
        operator: { allow: [403] },
      },
    },
    {
      id: 'RP-03',
      area: 'Role Profiles',
      name: 'Delete role with unknown id',
      method: 'DELETE',
      path: `/api/admin/roles/${fakeRoleId}`,
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
    {
      id: 'AL-01',
      area: 'Activity Logging',
      name: 'List activity logs',
      method: 'GET',
      path: '/api/admin/all-activity-logs?page=1&limit=20',
      expect: {
        noAuth: { allow: [401] },
        superAdmin: { allow: [200] },
        operator: { allow: [403] },
      },
    },
  ]
}

async function runContractChecks(tokens, ctx) {
  const findings = []
  const superToken = tokens.superAdmin?.token || null
  const superCookie = tokens.superAdmin?.cookie || null

  const usersLimit1 = await callApi({
    method: 'GET',
    path: '/api/admin/users?page=1&limit=1',
    token: superToken,
    cookie: superCookie,
  })

  const usersLimit20 = await callApi({
    method: 'GET',
    path: '/api/admin/users?page=1&limit=20',
    token: superToken,
    cookie: superCookie,
  })

  if (usersLimit1.status === 200 && usersLimit20.status === 200) {
    const len1 = Array.isArray(usersLimit1.json?.data?.users) ? usersLimit1.json.data.users.length : null
    const len20 = Array.isArray(usersLimit20.json?.data?.users) ? usersLimit20.json.data.users.length : null

    if (usersLimit1.json && !Object.prototype.hasOwnProperty.call(usersLimit1.json, 'pagination')) {
      findings.push({
        id: 'CONTRACT-USERS-PAGINATION-MISSING',
        severity: 'medium',
        message: '/api/admin/users response does not include pagination metadata expected by the UI.',
        evidence: `/api/admin/users?page=1&limit=1 -> keys: ${Object.keys(usersLimit1.json).join(', ')}`,
      })
    }

    if (typeof len1 === 'number' && typeof len20 === 'number' && len1 === len20 && len20 > 1) {
      findings.push({
        id: 'CONTRACT-USERS-LIMIT-IGNORED',
        severity: 'high',
        message: '/api/admin/users appears to ignore page/limit query params.',
        evidence: `limit=1 returned ${len1} users, limit=20 returned ${len20} users`,
      })
    }
  }

  const logsLimit1 = await callApi({
    method: 'GET',
    path: '/api/admin/all-activity-logs?page=1&limit=1',
    token: superToken,
    cookie: superCookie,
  })

  const logsLimit20 = await callApi({
    method: 'GET',
    path: '/api/admin/all-activity-logs?page=1&limit=20',
    token: superToken,
    cookie: superCookie,
  })

  if (logsLimit1.status === 200 && logsLimit20.status === 200) {
    const len1 = Array.isArray(logsLimit1.json?.logs) ? logsLimit1.json.logs.length : null
    const len20 = Array.isArray(logsLimit20.json?.logs) ? logsLimit20.json.logs.length : null

    if (logsLimit1.json && !Object.prototype.hasOwnProperty.call(logsLimit1.json, 'pagination')) {
      findings.push({
        id: 'CONTRACT-LOGS-PAGINATION-MISSING',
        severity: 'medium',
        message: '/api/admin/all-activity-logs response does not include pagination metadata expected by the UI.',
        evidence: `/api/admin/all-activity-logs?page=1&limit=1 -> keys: ${Object.keys(logsLimit1.json).join(', ')}`,
      })
    }

    if (typeof len1 === 'number' && typeof len20 === 'number' && len1 === len20 && len20 > 1) {
      findings.push({
        id: 'CONTRACT-LOGS-LIMIT-IGNORED',
        severity: 'high',
        message: '/api/admin/all-activity-logs appears to ignore page/limit query params.',
        evidence: `limit=1 returned ${len1} logs, limit=20 returned ${len20} logs`,
      })
    }
  }

  const rolesRes = await callApi({
    method: 'GET',
    path: '/api/admin/roles',
    token: superToken,
    cookie: superCookie,
  })

  if (rolesRes.status === 200) {
    const roles = Array.isArray(rolesRes.json?.data?.roles) ? rolesRes.json.data.roles : null
    if (!roles) {
      findings.push({
        id: 'CONTRACT-ROLES-SHAPE',
        severity: 'medium',
        message: '/api/admin/roles response is missing data.roles array.',
        evidence: `Response keys: ${Object.keys(rolesRes.json || {}).join(', ')}`,
      })
    } else {
      const invalidRole = roles.find(
        role => !Object.prototype.hasOwnProperty.call(role, 'active_user_count') || typeof role.active_user_count !== 'number'
      )

      if (invalidRole) {
        findings.push({
          id: 'CONTRACT-ROLES-ACTIVE-COUNT-TYPE',
          severity: 'high',
          message: '/api/admin/roles must include numeric active_user_count for every role.',
          evidence: `Invalid role: ${JSON.stringify({
            id: invalidRole.id,
            name: invalidRole.name,
            active_user_count: invalidRole.active_user_count,
          })}`,
        })
      }

      const expectedRoles = ['Super Admin', 'Operator']
      for (const roleName of expectedRoles) {
        const role = roles.find(r => r.name === roleName)
        if (!role) {
          findings.push({
            id: `CONTRACT-ROLES-MISSING-${roleName.toUpperCase().replace(/\s+/g, '-')}`,
            severity: 'medium',
            message: `Expected role "${roleName}" was not returned by /api/admin/roles.`,
            evidence: `Available roles: ${roles.map(r => r.name).join(', ')}`,
          })
          continue
        }

        if (role.active_user_count < 1) {
          findings.push({
            id: `CONTRACT-ROLES-COUNT-${roleName.toUpperCase().replace(/\s+/g, '-')}`,
            severity: 'high',
            message: `Role "${roleName}" should have at least one active user during audit setup.`,
            evidence: `${roleName} active_user_count=${role.active_user_count}`,
          })
        }
      }
    }
  }

  if (ctx.operatorUser?.id) {
    const roleAfter = await callApi({
      method: 'GET',
      path: `/api/admin/get-user-permissions?userId=${ctx.operatorUser.id}`,
      token: superToken,
      cookie: superCookie,
    })

    if (roleAfter.status === 200 && !Array.isArray(roleAfter.json?.permissions)) {
      findings.push({
        id: 'CONTRACT-PERMISSIONS-SHAPE',
        severity: 'medium',
        message: '/api/admin/get-user-permissions response is missing `permissions` array.',
        evidence: `Response keys: ${Object.keys(roleAfter.json || {}).join(', ')}`,
      })
    }
  }

  return findings
}

async function main() {
  const startedAt = nowIso()
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}`
  const password = `CodexAudit!${crypto.randomBytes(4).toString('hex')}A1`

  const createdUserIds = []
  const results = []
  const findings = []

  console.log(`\nSettings API Audit started at ${startedAt}`)
  console.log(`Target: ${BASE_URL}`)

  const serverReady = await waitForServer(BASE_URL)
  if (!serverReady) {
    console.error(`Server is not reachable at ${BASE_URL}. Start your local app first (npm run dev).`)
    process.exit(1)
  }

  console.log('Server is reachable. Provisioning temporary audit users...')

  let superUser
  let operatorUser

  try {
    superUser = await createAuditUser({
      email: `codex.settings.super.${runId}@example.com`,
      password,
      roleName: 'Super Admin',
      fullName: `Codex Super ${runId}`,
    })
    createdUserIds.push(superUser.id)

    operatorUser = await createAuditUser({
      email: `codex.settings.operator.${runId}@example.com`,
      password,
      roleName: 'Operator',
      fullName: `Codex Operator ${runId}`,
    })
    createdUserIds.push(operatorUser.id)

    const superAuth = await signInAndGetToken(superUser.email, superUser.password)
    const operatorAuth = await signInAndGetToken(operatorUser.email, operatorUser.password)

    const tokens = {
      noAuth: { token: null, cookie: null },
      superAdmin: superAuth,
      operator: operatorAuth,
    }

    const ctx = {
      superUser,
      operatorUser,
      runId,
    }

    const matrix = buildTestMatrix(ctx)

    console.log(`Executing ${matrix.length} endpoint checks across 3 actors...`)

    for (const test of matrix) {
      for (const actor of ['noAuth', 'superAdmin', 'operator']) {
        const rule = test.expect[actor]
        const request = {
          method: test.method,
          path: resolveValue(test.path, ctx),
          body: resolveValue(test.body, ctx),
          token: tokens[actor]?.token || null,
          cookie: tokens[actor]?.cookie || null,
        }

        const response = await callApi(request)
        const normalized = normalizeStatus(response)
        const evaluation = evaluateStatus(normalized.status, rule)

        const record = {
          id: test.id,
          area: test.area,
          name: test.name,
          actor,
          method: request.method,
          path: request.path,
          status: response.status,
          normalizedStatus: normalized.status,
          redirectedToAuth: normalized.redirectedToAuth,
          pass: evaluation.pass,
          expected: evaluation.expected,
          note: test.note || null,
          responseError: response.json?.error || response.json?.message || null,
        }

        results.push(record)

        const icon = evaluation.pass ? 'PASS' : 'FAIL'
        console.log(
          `[${icon}] ${test.id} ${actor} ${request.method} ${request.path} -> ${response.status}${normalized.redirectedToAuth ? ' (redirect:/auth)' : ''} (expected: ${evaluation.expected})`
        )
      }
    }

    const contractFindings = await runContractChecks(tokens, ctx)
    findings.push(...contractFindings)

    for (const failed of results.filter(r => !r.pass)) {
      findings.push({
        id: `EXPECTATION-${failed.id}-${failed.actor}`,
        severity: 'high',
        message: `Unexpected status for ${failed.id} (${failed.actor}).`,
        evidence: `${failed.method} ${failed.path} -> ${failed.status}, expected ${failed.expected}`,
      })
    }

    const summary = {
      runId,
      startedAt,
      finishedAt: nowIso(),
      baseUrl: BASE_URL,
      users: {
        superAdmin: superUser.email,
        operator: operatorUser.email,
      },
      totals: {
        checks: results.length,
        passed: results.filter(r => r.pass).length,
        failed: results.filter(r => !r.pass).length,
        findings: findings.length,
      },
    }

    const reportJson = {
      summary,
      results,
      findings,
    }

    const jsonPath = path.join(reportDir, `${runId}.json`)
    const latestPath = path.join(reportDir, 'latest.json')
    fs.writeFileSync(jsonPath, JSON.stringify(reportJson, null, 2))
    fs.writeFileSync(latestPath, JSON.stringify(reportJson, null, 2))

    const markdownLines = []
    markdownLines.push(`# Settings API Audit Report`)
    markdownLines.push(``)
    markdownLines.push(`- Run ID: \`${runId}\``)
    markdownLines.push(`- Started: ${summary.startedAt}`)
    markdownLines.push(`- Finished: ${summary.finishedAt}`)
    markdownLines.push(`- Base URL: \`${summary.baseUrl}\``)
    markdownLines.push(`- Checks: ${summary.totals.checks}`)
    markdownLines.push(`- Passed: ${summary.totals.passed}`)
    markdownLines.push(`- Failed: ${summary.totals.failed}`)
    markdownLines.push(`- Findings: ${summary.totals.findings}`)
    markdownLines.push(``)

    if (findings.length > 0) {
      markdownLines.push(`## Findings`)
      markdownLines.push(``)
      for (const finding of findings) {
        markdownLines.push(`- [${finding.severity.toUpperCase()}] ${finding.id}: ${finding.message}`)
        markdownLines.push(`  - Evidence: ${finding.evidence}`)
      }
      markdownLines.push(``)
    } else {
      markdownLines.push(`## Findings`)
      markdownLines.push(``)
      markdownLines.push(`- None`)
      markdownLines.push(``)
    }

    markdownLines.push(`## Failed Checks`)
    markdownLines.push(``)
    const failedChecks = results.filter(r => !r.pass)
    if (failedChecks.length === 0) {
      markdownLines.push(`- None`)
    } else {
      for (const failed of failedChecks) {
        markdownLines.push(`- ${failed.id} ${failed.actor}: ${failed.method} ${failed.path} -> ${failed.status} (expected ${failed.expected})`)
      }
    }

    const mdPath = path.join(reportDir, `${runId}.md`)
    const latestMdPath = path.join(reportDir, 'latest.md')
    fs.writeFileSync(mdPath, markdownLines.join('\n'))
    fs.writeFileSync(latestMdPath, markdownLines.join('\n'))

    console.log('\nAudit completed.')
    console.log(`Report JSON: ${jsonPath}`)
    console.log(`Report MD:   ${mdPath}`)

    if (summary.totals.failed > 0 || findings.length > 0) {
      process.exitCode = 1
    }
  } catch (error) {
    console.error('Audit failed:', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  } finally {
    if (CLEANUP_USERS && createdUserIds.length > 0) {
      await cleanupUsers(createdUserIds)
      console.log('Temporary audit users cleaned up.')
    }
  }
}

main()
