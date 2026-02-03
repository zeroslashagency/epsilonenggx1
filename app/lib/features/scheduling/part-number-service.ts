import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client'

const supabase = typeof window !== 'undefined' ? getSupabaseBrowserClient() : null as any

export interface PartNumber {
  partnumber: string
  operations: string[]
}

export interface Operation {
  PartNumber: string
  OperationSeq: number
  OperationName: string
  SetupTime_Min: number
  Operater: string
  CycleTime_Min: number
  Minimum_BatchSize: number
  EligibleMachines: string
}

export interface MasterData {
  PartNumber: string
  OperationSeq: number
  OperationName: string
  SetupTime_Min: number
  Operater: string
  CycleTime_Min: number
  Minimum_BatchSize: number
  EligibleMachines: string
}

export class PartNumberService {
  // Load master data from the same source as the original HTML version
  static async getMasterData(): Promise<MasterData[]> {
    try {
      // First try to fetch from Supabase
      const { data, error } = await supabase
        .from('master_operations')
        .select('*')
        .order('partnumber, operationseq')

      if (error) throw error

      // Convert Supabase data to master data format
      if (data && data.length > 0) {
        return data.map((op: any) => ({
          PartNumber: op.partnumber,
          OperationSeq: op.operationseq,
          OperationName: op.operationname || 'Facing',
          SetupTime_Min: op.setuptime_min || 70,
          Operater: op.operator || '',
          CycleTime_Min: op.cycletime_min || 18,
          Minimum_BatchSize: op.minimum_batchsize || 175,
          EligibleMachines: op.eligiblemachines?.join(', ') || 'VMC 1,VMC 2,VMC 3,VMC 4'
        }))
      }

      // Fallback to sample master data if database is empty
      return sampleMasterData
    } catch (error) {
      // Return sample data as fallback
      return sampleMasterData
    }
  }

  // Fetch all part numbers with their operations
  static async getPartNumbers(): Promise<PartNumber[]> {
    try {
      const masterData = await this.getMasterData()

      // Group operations by part number
      const partNumberMap = new Map<string, string[]>()

      masterData.forEach((op) => {
        const partNum = op.PartNumber
        const operationSeq = `OP${op.OperationSeq}`

        if (!partNumberMap.has(partNum)) {
          partNumberMap.set(partNum, [])
        }
        partNumberMap.get(partNum)?.push(operationSeq)
      })

      // Convert to array format
      const result: PartNumber[] = []
      partNumberMap.forEach((operations, partnumber) => {
        result.push({
          partnumber,
          operations: operations.sort()
        })
      })

      return result.sort((a, b) => a.partnumber.localeCompare(b.partnumber))
    } catch (error) {
      return []
    }
  }

  // Search part numbers by query
  static async searchPartNumbers(query: string): Promise<PartNumber[]> {
    try {
      const masterData = await this.getMasterData()

      // Filter by part number
      const filteredData = masterData.filter(op =>
        op.PartNumber.toLowerCase().includes(query.toLowerCase())
      )

      // Group operations by part number
      const partNumberMap = new Map<string, string[]>()

      filteredData.forEach((op) => {
        const partNum = op.PartNumber
        const operationSeq = `OP${op.OperationSeq}`

        if (!partNumberMap.has(partNum)) {
          partNumberMap.set(partNum, [])
        }
        partNumberMap.get(partNum)?.push(operationSeq)
      })

      // Convert to array format
      const result: PartNumber[] = []
      partNumberMap.forEach((operations, partnumber) => {
        result.push({
          partnumber,
          operations: operations.sort()
        })
      })

      return result.sort((a, b) => a.partnumber.localeCompare(b.partnumber))
    } catch (error) {
      return []
    }
  }

  // Get operations for a specific part number
  static async getOperationsForPart(partNumber: string): Promise<Operation[]> {
    try {
      const masterData = await this.getMasterData()

      // Filter operations for the specific part number
      const operations = masterData.filter(op => op.PartNumber === partNumber)

      return operations.map(op => ({
        PartNumber: op.PartNumber,
        OperationSeq: op.OperationSeq,
        OperationName: op.OperationName,
        SetupTime_Min: op.SetupTime_Min,
        Operater: op.Operater,
        CycleTime_Min: op.CycleTime_Min,
        Minimum_BatchSize: op.Minimum_BatchSize,
        EligibleMachines: op.EligibleMachines
      }))
    } catch (error) {
      return []
    }
  }

  // Get all master data (for compatibility with original HTML version)
  static async getAllMasterData(): Promise<MasterData[]> {
    return await this.getMasterData()
  }
}

// Sample master data (same structure as the original master-data.js)
export const sampleMasterData: MasterData[] = [
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

// Sample data for testing (fallback if database is empty)
export const samplePartNumbers: PartNumber[] = [
  {
    partnumber: 'PN10001',
    operations: ['OP1', 'OP2']
  },
  {
    partnumber: 'PN1001',
    operations: ['OP1', 'OP2', 'OP3', 'OP4']
  },
  {
    partnumber: 'PN2001',
    operations: ['OP1', 'OP2', 'OP3']
  }
]
