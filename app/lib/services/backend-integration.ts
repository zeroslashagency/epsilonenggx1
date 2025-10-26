// Backend Integration Service
// This service provides backend integration functionality

import { MasterDataLoader } from './master-data-loader'
import { SchedulingEngineIntegration } from './scheduling-engine-integration'
import { getSupabaseClient } from './supabase-client'

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
      console.log('Backend services initialized successfully')
    } catch (error) {
      console.error('Failed to initialize backend services:', error)
      throw error
    }
  }

  private async initializeSupabase(): Promise<void> {
    try {
      // Use shared Supabase client to prevent multiple instances
      const client = getSupabaseClient()
      this.services.supabase = client
      
      console.log('Supabase client initialized')
    } catch (error) {
      console.error('Failed to initialize Supabase:', error)
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
      
      console.log(`Loaded ${masterData.length} operations from master data`)
    } catch (error) {
      console.error('Failed to load master data:', error)
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
        console.log('Adding order:', order)
        return order
      },
      updateOrder: (order: any) => {
        console.log('Updating order:', order)
        return order
      },
      deleteOrder: (orderId: string) => {
        console.log('Deleting order:', orderId)
        return true
      }
    }
  }

  private async initializeSchedulingEngine(): Promise<void> {
    // Initialize scheduling engine (similar to scheduling-engine-modular.js)
    this.services.schedulingEngine = {
      runSchedule: async (orders: any[], settings: any) => {
        // Implementation similar to original scheduling engine
        console.log('Running schedule with orders:', orders.length)
        
        // Simulate scheduling process
        return new Promise((resolve) => {
          setTimeout(() => {
            const results = orders.map((order, index) => ({
              id: order.id || index,
              partNumber: order.partNumber,
              orderQty: order.orderQuantity,
              priority: order.priority,
              batchId: `B${index + 1}`,
              batchQty: Math.ceil(order.orderQuantity / 2),
              operationSeq: order.operationSeq,
              operationName: `Operation ${order.operationSeq}`,
              machine: `VMC ${(index % 6) + 1}`,
              person: `Operator ${(index % 3) + 1}`,
              setupStart: new Date(Date.now() + index * 3600000).toISOString(),
              setupEnd: new Date(Date.now() + index * 3600000 + 1800000).toISOString(),
              runStart: new Date(Date.now() + index * 3600000 + 1800000).toISOString(),
              runEnd: new Date(Date.now() + index * 3600000 + 3600000).toISOString(),
              timing: "2.5h",
              dueDate: order.dueDate || "N/A",
              status: index % 3 === 0 ? "Scheduled" : "Completed"
            }))
            resolve(results)
          }, 2000)
        })
      }
    }
  }

  private async initializeSchedulingEngineIntegration(): Promise<void> {
    // Initialize the real scheduling engine integration
    const schedulingIntegration = SchedulingEngineIntegration.getInstance()
    await schedulingIntegration.initialize()
    this.services.schedulingEngineIntegration = schedulingIntegration
    console.log('Scheduling engine integration initialized')
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
      console.error('Error getting part numbers:', error)
      return []
    }
  }

  // Get operations for a part number (same logic as original)
  getOperationsForPart(partNumber: string): any[] {
    try {
      return MasterDataLoader.getOperationsForPart(partNumber)
    } catch (error) {
      console.error('Error getting operations:', error)
      return []
    }
  }

  // Run schedule using the real backend scheduling engine
  async runSchedule(orders: any[], settings: any): Promise<any[]> {
    if (!this.services.schedulingEngineIntegration) {
      throw new Error('Scheduling engine integration not initialized')
    }
    return await this.services.schedulingEngineIntegration.runSchedule(orders, settings)
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
