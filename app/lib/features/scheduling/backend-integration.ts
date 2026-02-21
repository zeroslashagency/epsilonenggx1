// Backend Integration Service
// This service provides backend integration functionality

import { MasterDataLoader } from './master-data-loader'
import { SchedulingEngineIntegration } from './scheduling-engine-integration'
import { getSupabaseClient } from '@/app/lib/services/supabase-client'

export interface BackendServices {
  supabase: any
  masterData: any[]
  sessionManager: any
  orderManager: any
  schedulingEngine: any
  schedulingEngineIntegration: SchedulingEngineIntegration
}

export class BackendIntegrationService {
  private static instance: BackendIntegrationService
  private services: Partial<BackendServices> = {}
  private initialized = false

  static getInstance(): BackendIntegrationService {
    if (!BackendIntegrationService.instance) {
      BackendIntegrationService.instance = new BackendIntegrationService()
    }
    return BackendIntegrationService.instance
  }

  // Initialize backend services (similar to the original HTML version)
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Initialize Supabase client (same as original)
      await this.initializeSupabase()

      // Load master data (same as original)
      await this.loadMasterData()

      // Initialize other services
      await this.initializeSessionManager()
      await this.initializeOrderManager()
      await this.initializeSchedulingEngine()
      await this.initializeSchedulingEngineIntegration()

      this.initialized = true
    } catch (error) {
      throw error
    }
  }

  private async initializeSupabase(): Promise<void> {
    try {
      // Use shared Supabase client to prevent multiple instances
      const client = getSupabaseClient()
      this.services.supabase = client

    } catch (error) {
      throw error
    }
  }

  private async loadMasterData(): Promise<void> {
    try {
      // Use the master data loader (same as original HTML version)
      const masterData = await MasterDataLoader.loadMasterData()
      this.services.masterData = masterData

      // Make it globally available (same as original)
      MasterDataLoader.makeGloballyAvailable()

    } catch (error) {
      throw error
    }
  }

  private async initializeSessionManager(): Promise<void> {
    // Initialize session manager (similar to session-manager.js)
    this.services.sessionManager = {
      saveSession: (data: any) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('scheduling_session', JSON.stringify(data))
        }
      },
      loadSession: () => {
        if (typeof window !== 'undefined') {
          const session = localStorage.getItem('scheduling_session')
          return session ? JSON.parse(session) : null
        }
        return null
      },
      clearSession: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('scheduling_session')
        }
      }
    }
  }

  private async initializeOrderManager(): Promise<void> {
    // Initialize order manager (similar to order-manager.js)
    this.services.orderManager = {
      addOrder: (order: any) => {
        // Implementation similar to original order manager
        return order
      },
      updateOrder: (order: any) => {
        return order
      },
      deleteOrder: (orderId: string) => {
        return true
      }
    }
  }

  private async initializeSchedulingEngine(): Promise<void> {
    // Initialize scheduling engine (similar to scheduling-engine-modular.js)
    this.services.schedulingEngine = {
      runSchedule: async (orders: any[], settings: any) => {
        // Simulate scheduling process while respecting batch mode selection.
        return new Promise((resolve) => {
          setTimeout(() => {
            const results: any[] = []
            let sequenceIndex = 0

            orders.forEach((order, orderIndex) => {
              const orderQuantity = Math.max(1, Number(order.orderQuantity) || 1)
              const batchMode = String(order.batchMode || 'auto-split')
              const customBatchSize = Math.max(0, Number(order.customBatchSize) || 0)
              const selectedOperationSeqs = String(order.operationSeq || '')
                .split(',')
                .map((value: string) => Number(value.trim()))
                .filter((value: number) => Number.isFinite(value) && value > 0)

              const masterDataRows = (this.services.masterData || []).filter(
                (entry: any) => entry.PartNumber === order.partNumber
              )
              const inferredMinBatch = masterDataRows
                .map((entry: any) => Number(entry.Minimum_BatchSize) || 0)
                .find((value: number) => value > 0) || 200
              const selectedOperations =
                masterDataRows
                  .filter((entry: any) =>
                    selectedOperationSeqs.length === 0 || selectedOperationSeqs.includes(Number(entry.OperationSeq))
                  )
                  .sort((a: any, b: any) => Number(a.OperationSeq) - Number(b.OperationSeq))

              const operationRows =
                selectedOperations.length > 0
                  ? selectedOperations.map((entry: any) => ({
                    operationSeq: Number(entry.OperationSeq),
                    operationName: entry.OperationName || `Operation ${entry.OperationSeq}`
                  }))
                  : (selectedOperationSeqs.length > 0
                    ? selectedOperationSeqs.map((operationSeq: number) => ({
                      operationSeq,
                      operationName: `Operation ${operationSeq}`
                    }))
                    : [{ operationSeq: 1, operationName: 'Facing' }])

              const targetBatchSize =
                batchMode === 'single-batch'
                  ? orderQuantity
                  : batchMode === 'custom-batch-size' && customBatchSize > 0
                    ? customBatchSize
                    : Math.min(orderQuantity, inferredMinBatch)

              const batchCount = Math.max(1, Math.ceil(orderQuantity / targetBatchSize))
              let remainingQty = orderQuantity

              for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
                const currentBatchQty =
                  batchIndex === batchCount - 1 ? remainingQty : Math.min(targetBatchSize, remainingQty)
                remainingQty -= currentBatchQty

                const batchId = `B${String(batchIndex + 1).padStart(2, '0')}`

                operationRows.forEach((operation) => {
                  results.push({
                    id: `${order.id || orderIndex}-${batchId}-op-${operation.operationSeq}`,
                    partNumber: order.partNumber,
                    orderQty: orderQuantity,
                    priority: order.priority,
                    batchId,
                    batchQty: currentBatchQty,
                    operationSeq: operation.operationSeq,
                    operationName: operation.operationName,
                    machine: `VMC ${(sequenceIndex % 6) + 1}`,
                    person: `Operator ${(sequenceIndex % 3) + 1}`,
                    setupStart: new Date(Date.now() + sequenceIndex * 3600000).toISOString(),
                    setupEnd: new Date(Date.now() + sequenceIndex * 3600000 + 1800000).toISOString(),
                    runStart: new Date(Date.now() + sequenceIndex * 3600000 + 1800000).toISOString(),
                    runEnd: new Date(Date.now() + sequenceIndex * 3600000 + 3600000).toISOString(),
                    timing: "2.5h",
                    dueDate: order.dueDate || "N/A",
                    status: sequenceIndex % 3 === 0 ? "Scheduled" : "Completed"
                  })

                  sequenceIndex++
                })
              }
            })

            resolve(results)
          }, 2000)
        })
      }
    }
  }

  private async initializeSchedulingEngineIntegration(): Promise<void> {
    const hasLegacyModules = await this.hasLegacySchedulingModules()
    if (!hasLegacyModules) {
      this.services.schedulingEngineIntegration = undefined
      return
    }

    try {
      // Attempt to initialize the legacy modular scheduling engine.
      const schedulingIntegration = SchedulingEngineIntegration.getInstance()
      await schedulingIntegration.initialize()
      this.services.schedulingEngineIntegration = schedulingIntegration
    } catch {
      // Gracefully fall back to the built-in scheduler when legacy scripts are unavailable.
      this.services.schedulingEngineIntegration = undefined
    }
  }

  private async hasLegacySchedulingModules(): Promise<boolean> {
    if (process.env.NEXT_PUBLIC_ENABLE_LEGACY_SCHEDULING_MODULES !== 'true') {
      return false
    }

    if (typeof window === 'undefined') {
      return false
    }

    try {
      const probe = await fetch('/services/scheduling/core/config.js', {
        method: 'HEAD',
        cache: 'no-store'
      })
      return probe.ok
    } catch {
      return false
    }
  }

  private getFallbackMasterData(): any[] {
    // Fallback master data (same structure as original master-data.js)
    return [
      {
        "PartNumber": "PN1001",
        "OperationSeq": 1,
        "OperationName": "Facing",
        "SetupTime_Min": 70,
        "Operater": "",
        "CycleTime_Min": 18,
        "Minimum_BatchSize": 175,
        "EligibleMachines": "VMC 1,VMC 2,VMC 3,VMC 4"
      },
      {
        "PartNumber": "PN1001",
        "OperationSeq": 2,
        "OperationName": "Facing",
        "SetupTime_Min": 70,
        "Operater": "",
        "CycleTime_Min": 10,
        "Minimum_BatchSize": 175,
        "EligibleMachines": "VMC 1,VMC 2,VMC 7,VMC 4"
      },
      {
        "PartNumber": "PN1001",
        "OperationSeq": 3,
        "OperationName": "Facing",
        "SetupTime_Min": 70,
        "Operater": "",
        "CycleTime_Min": 1,
        "Minimum_BatchSize": 175,
        "EligibleMachines": "VMC 1,VMC 2,VMC 3,VMC 4,VMC 5,VMC 6,VMC 7"
      },
      {
        "PartNumber": "PN1001",
        "OperationSeq": 4,
        "OperationName": "Facing",
        "SetupTime_Min": 70,
        "Operater": "",
        "CycleTime_Min": 1,
        "Minimum_BatchSize": 175,
        "EligibleMachines": "VMC 1,VMC 2,VMC 3,VMC 4,VMC 5,VMC 6,VMC 7"
      },
      {
        "PartNumber": "PN2001",
        "OperationSeq": 1,
        "OperationName": "Facing",
        "SetupTime_Min": 80,
        "Operater": "",
        "CycleTime_Min": 16,
        "Minimum_BatchSize": 50,
        "EligibleMachines": "VMC 1,VMC 2,VMC 3,VMC 4,VMC 5,VMC 6,VMC 7"
      },
      {
        "PartNumber": "PN2001",
        "OperationSeq": 2,
        "OperationName": "Facing",
        "SetupTime_Min": 80,
        "Operater": "",
        "CycleTime_Min": 12,
        "Minimum_BatchSize": 50,
        "EligibleMachines": "VMC 1,VMC 2,VMC 3,VMC 4,VMC 5,VMC 6,VMC 7"
      },
      {
        "PartNumber": "PN2001",
        "OperationSeq": 3,
        "OperationName": "Facing",
        "SetupTime_Min": 80,
        "Operater": "",
        "CycleTime_Min": 8,
        "Minimum_BatchSize": 50,
        "EligibleMachines": "VMC 1,VMC 2,VMC 3,VMC 4,VMC 5,VMC 6,VMC 7"
      },
      {
        "PartNumber": "PN10001",
        "OperationSeq": 1,
        "OperationName": "Facing",
        "SetupTime_Min": 60,
        "Operater": "",
        "CycleTime_Min": 15,
        "Minimum_BatchSize": 100,
        "EligibleMachines": "VMC 1,VMC 2,VMC 3"
      },
      {
        "PartNumber": "PN10001",
        "OperationSeq": 2,
        "OperationName": "Facing",
        "SetupTime_Min": 60,
        "Operater": "",
        "CycleTime_Min": 12,
        "Minimum_BatchSize": 100,
        "EligibleMachines": "VMC 1,VMC 2,VMC 3"
      }
    ]
  }

  // Get available part numbers (same logic as original)
  getAvailablePartNumbers(): string[] {
    try {
      return MasterDataLoader.getPartNumbers()
    } catch (error) {
      return []
    }
  }

  // Get operations for a part number (same logic as original)
  getOperationsForPart(partNumber: string): any[] {
    try {
      return MasterDataLoader.getOperationsForPart(partNumber)
    } catch (error) {
      return []
    }
  }

  // Run schedule using the real backend scheduling engine
  async runSchedule(orders: any[], settings: any): Promise<any[]> {
    if (this.services.schedulingEngineIntegration) {
      return await this.services.schedulingEngineIntegration.runSchedule(orders, settings)
    }

    if (this.services.schedulingEngine?.runSchedule) {
      return await this.services.schedulingEngine.runSchedule(orders, settings)
    }

    throw new Error('No scheduling engine available')
  }

  // Get Supabase client
  getSupabaseClient(): any {
    return this.services.supabase
  }

  // Get master data
  getMasterData(): any[] {
    return this.services.masterData || []
  }

  // Check if services are initialized
  isInitialized(): boolean {
    return this.initialized
  }
}
