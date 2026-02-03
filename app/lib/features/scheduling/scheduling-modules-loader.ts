// Scheduling Modules Loader
// This service loads all the scheduling modules from the backend

export class SchedulingModulesLoader {
  private static instance: SchedulingModulesLoader
  private modulesLoaded = false

  static getInstance(): SchedulingModulesLoader {
    if (!SchedulingModulesLoader.instance) {
      SchedulingModulesLoader.instance = new SchedulingModulesLoader()
    }
    return SchedulingModulesLoader.instance
  }

  async loadModules(): Promise<void> {
    if (this.modulesLoaded) return

    try {

      // Load all scheduling modules in the correct order
      await this.loadModule('/services/scheduling/core/config.js')
      await this.loadModule('/services/scheduling/core/logger.js')
      await this.loadModule('/services/scheduling/batch/batch-processor.js')
      await this.loadModule('/services/scheduling/machine/machine-selector.js')
      await this.loadModule('/services/scheduling/operator/operator-manager.js')
      await this.loadModule('/services/scheduling/timing/timing-calculator.js')
      await this.loadModule('/services/scheduling/main/scheduling-engine-modular.js')
      
      // Load Excel exporter module
      await this.loadModule('/services/excel-exporter.js')

      // Wait for modules to be available in global scope
      await this.waitForModules()

      this.modulesLoaded = true
    } catch (error) {
      throw error
    }
  }

  private async loadModule(modulePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.isModuleLoaded(modulePath)) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = modulePath
      script.async = false // Load synchronously to maintain order
      
      script.onload = () => {
        resolve()
      }
      
      script.onerror = () => {
        reject(new Error(`Failed to load module: ${modulePath}`))
      }

      document.head.appendChild(script)
    })
  }

  private isModuleLoaded(modulePath: string): boolean {
    // Check if script tag already exists
    const existingScript = document.querySelector(`script[src="${modulePath}"]`)
    return !!existingScript
  }

  private async waitForModules(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 100 // 10 seconds max wait

      const checkModules = () => {
        attempts++
        
        const requiredModules = [
          'BatchProcessor',
          'MachineSelector', 
          'OperatorManager',
          'TimingCalculator',
          'ModularSchedulingEngine',
          'ExcelExporter'
        ]

        const allLoaded = requiredModules.every(moduleName => {
          return typeof window !== 'undefined' && (window as any)[moduleName]
        })

        if (allLoaded) {
          resolve()
        } else if (attempts >= maxAttempts) {
          const missingModules = requiredModules.filter(moduleName => 
            !((typeof window !== 'undefined' && (window as any)[moduleName]))
          )
          reject(new Error(`Modules not loaded after 10 seconds: ${missingModules.join(', ')}`))
        } else {
          setTimeout(checkModules, 100)
        }
      }

      checkModules()
    })
  }

  isModulesLoaded(): boolean {
    return this.modulesLoaded
  }

  // Check if specific module is available
  isModuleAvailable(moduleName: string): boolean {
    return typeof window !== 'undefined' && !!(window as any)[moduleName]
  }

  // Get list of available modules
  getAvailableModules(): string[] {
    const moduleNames = [
      'BatchProcessor',
      'MachineSelector', 
      'OperatorManager',
      'TimingCalculator',
      'ModularSchedulingEngine'
    ]

    return moduleNames.filter(moduleName => this.isModuleAvailable(moduleName))
  }
}
