export interface RunAccessFlags {
  canRunBasic: boolean
  canRunAdvanced: boolean
}

export interface RunAccessState extends RunAccessFlags {
  loaded: boolean
}

export function deriveRunPermissionsFromCodes(input: {
  hasRunBasicCode: boolean
  hasRunAdvancedCode: boolean
  canCreate: boolean
  canEdit: boolean
}): RunAccessFlags {
  const canRunBasic = input.hasRunBasicCode || input.canCreate || input.canEdit
  const canRunAdvanced = input.hasRunAdvancedCode || input.canEdit
  return { canRunBasic, canRunAdvanced }
}

export function resolveRunPermissions(
  runAccess: RunAccessState,
  fallbackByCode: RunAccessFlags
): RunAccessFlags {
  if (!runAccess.loaded) return fallbackByCode
  return {
    canRunBasic: runAccess.canRunBasic,
    canRunAdvanced: runAccess.canRunAdvanced,
  }
}

export function resolveProfileForExecution(
  requestedProfile: 'basic' | 'advanced',
  access: RunAccessFlags
): 'basic' | 'advanced' {
  if (requestedProfile === 'advanced' && !access.canRunAdvanced && access.canRunBasic) {
    return 'basic'
  }
  return requestedProfile
}

export function isRunActionDisabled(input: {
  ordersCount: number
  loading: boolean
  access: RunAccessFlags
}): boolean {
  return (
    input.ordersCount === 0 ||
    input.loading ||
    (!input.access.canRunBasic && !input.access.canRunAdvanced)
  )
}
