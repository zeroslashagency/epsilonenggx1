import {
  deriveRunPermissionsFromCodes,
  isRunActionDisabled,
  resolveProfileForExecution,
  resolveRunPermissions,
} from '@/app/lib/features/scheduling/run-access-ui'

describe('scheduler ui gating run access helpers', () => {
  it('derives basic and advanced permissions from explicit run codes', () => {
    const access = deriveRunPermissionsFromCodes({
      hasRunBasicCode: true,
      hasRunAdvancedCode: true,
      canCreate: false,
      canEdit: false,
    })

    expect(access.canRunBasic).toBe(true)
    expect(access.canRunAdvanced).toBe(true)
  })

  it('derives basic permission from create and advanced from edit fallback', () => {
    const basicFromCreate = deriveRunPermissionsFromCodes({
      hasRunBasicCode: false,
      hasRunAdvancedCode: false,
      canCreate: true,
      canEdit: false,
    })
    expect(basicFromCreate).toEqual({ canRunBasic: true, canRunAdvanced: false })

    const bothFromEdit = deriveRunPermissionsFromCodes({
      hasRunBasicCode: false,
      hasRunAdvancedCode: false,
      canCreate: false,
      canEdit: true,
    })
    expect(bothFromEdit).toEqual({ canRunBasic: true, canRunAdvanced: true })
  })

  it('uses fallback permissions before run access is loaded', () => {
    const resolved = resolveRunPermissions(
      { loaded: false, canRunBasic: false, canRunAdvanced: false },
      { canRunBasic: true, canRunAdvanced: false }
    )

    expect(resolved).toEqual({ canRunBasic: true, canRunAdvanced: false })
  })

  it('uses server resolved permissions after run access is loaded', () => {
    const resolved = resolveRunPermissions(
      { loaded: true, canRunBasic: false, canRunAdvanced: true },
      { canRunBasic: true, canRunAdvanced: false }
    )

    expect(resolved).toEqual({ canRunBasic: false, canRunAdvanced: true })
  })

  it('downgrades advanced selection to basic when advanced access is not allowed', () => {
    const nextProfile = resolveProfileForExecution('advanced', {
      canRunBasic: true,
      canRunAdvanced: false,
    })

    expect(nextProfile).toBe('basic')
  })

  it('keeps requested profile when permission allows execution', () => {
    expect(
      resolveProfileForExecution('advanced', {
        canRunBasic: true,
        canRunAdvanced: true,
      })
    ).toBe('advanced')

    expect(
      resolveProfileForExecution('basic', {
        canRunBasic: true,
        canRunAdvanced: false,
      })
    ).toBe('basic')
  })

  it('disables run action when no orders, loading, or no access', () => {
    expect(
      isRunActionDisabled({
        ordersCount: 0,
        loading: false,
        access: { canRunBasic: true, canRunAdvanced: false },
      })
    ).toBe(true)

    expect(
      isRunActionDisabled({
        ordersCount: 10,
        loading: true,
        access: { canRunBasic: true, canRunAdvanced: true },
      })
    ).toBe(true)

    expect(
      isRunActionDisabled({
        ordersCount: 10,
        loading: false,
        access: { canRunBasic: false, canRunAdvanced: false },
      })
    ).toBe(true)
  })

  it('enables run action when work exists and at least one mode is allowed', () => {
    expect(
      isRunActionDisabled({
        ordersCount: 10,
        loading: false,
        access: { canRunBasic: true, canRunAdvanced: false },
      })
    ).toBe(false)

    expect(
      isRunActionDisabled({
        ordersCount: 10,
        loading: false,
        access: { canRunBasic: false, canRunAdvanced: true },
      })
    ).toBe(false)
  })
})
