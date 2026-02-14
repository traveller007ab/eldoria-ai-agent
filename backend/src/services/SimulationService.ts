import { logger } from '@/utils/logger';
import { CodeExecutionService } from './CodeExecutionService';
import fs from 'fs';
import path from 'path';

interface SimulationResult {
  success: boolean;
  output?: any;
  error?: string;
  metrics?: Record<string, any>;
  visualizationData?: any;
  executionTimeMs: number;
  timestamp: string;
}

interface SimulationParameters {
  [key: string]: any;
}

interface SimulationBlueprint {
  id: string;
  name: string;
  description: string;
  engine: 'python' | 'javascript' | 'external';
  codeTemplate: string;
  parametersSchema: any;
  inputFiles?: string[];
  outputFiles?: string[];
}

export class SimulationService {
  private codeExecutionService: CodeExecutionService;
  private blueprints: SimulationBlueprint[] = [];
  private simulationResultsDir: string;

  constructor() {
    this.codeExecutionService = new CodeExecutionService();
    this.simulationResultsDir = path.join(__dirname, '../../simulation_results');
    
    // Ensure results directory exists
    this.ensureResultsDirectory();
    
    // Load default blueprints
    this.loadDefaultBlueprints();
    
    logger.info('🧪 Simulation service initialized');
  }

  private ensureResultsDirectory(): void {
    try {
      if (!fs.existsSync(this.simulationResultsDir)) {
        fs.mkdirSync(this.simulationResultsDir, { recursive: true });
      }
    } catch (error) {
      logger.error('Failed to create simulation results directory:', error);
      throw new Error('Could not initialize simulation results directory');
    }
  }

  private loadDefaultBlueprints(): void {
    // Default simulation blueprints
    this.blueprints = [
      {
        id: 'mechanical-stress',
        name: 'Mechanical Stress Analysis',
        description: 'Finite element analysis for mechanical stress distribution',
        engine: 'python',
        codeTemplate: `
import numpy as np
import json

def calculate_stress(force, area, material_properties):
    """Calculate stress distribution in a mechanical component"""
    
    # Basic stress calculation (simplified for example)
    stress = force / area
    
    # Material properties adjustment
    youngs_modulus = material_properties.get('youngs_modulus', 200e9)  # Default: Steel
    poisson_ratio = material_properties.get('poisson_ratio', 0.3)
    
    # Simplified strain calculation
    strain = stress / youngs_modulus
    
    return {
        'max_stress': stress,
        'max_strain': strain,
        'safety_factor': youngs_modulus / (stress * 10) if stress > 0 else 0,
        'material': material_properties.get('material', 'steel'),
        'units': 'Pa'
    }

# Read parameters from file
try:
    with open('params.json', 'r') as f:
        params = json.load(f)
    
    result = calculate_stress(
        force=params.get('force', 1000),
        area=params.get('area', 0.01),
        material_properties=params.get('material_properties', {})
    )
    
    # Write results
    with open('results.json', 'w') as f:
        json.dump(result, f, indent=2)
    
    print(json.dumps(result))
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    exit(1)
`,
        parametersSchema: {
          type: 'object',
          properties: {
            force: { type: 'number', description: 'Applied force in Newtons' },
            area: { type: 'number', description: 'Cross-sectional area in m²' },
            material_properties: {
              type: 'object',
              properties: {
                youngs_modulus: { type: 'number', description: 'Young\'s modulus in Pa' },
                poisson_ratio: { type: 'number', description: 'Poisson\'s ratio' },
                material: { type: 'string', description: 'Material name' }
              }
            }
          }
        }
      },
      {
        id: 'thermal-analysis',
        name: 'Thermal Analysis',
        description: 'Heat transfer and thermal distribution simulation',
        engine: 'python',
        codeTemplate: `
import numpy as np
import json

def thermal_analysis(temperature, conductivity, dimensions):
    """Simulate thermal distribution in a material"""
    
    # Simplified thermal analysis
    volume = dimensions['length'] * dimensions['width'] * dimensions['height']
    surface_area = 2 * (dimensions['length'] * dimensions['width'] + 
                       dimensions['length'] * dimensions['height'] + 
                       dimensions['width'] * dimensions['height'])
    
    # Basic heat transfer calculation (simplified)
    heat_flux = conductivity * (temperature - 25)  # Assuming 25°C ambient
    total_heat_transfer = heat_flux * surface_area
    
    return {
        'temperature': temperature,
        'heat_flux': heat_flux,
        'total_heat_transfer': total_heat_transfer,
        'thermal_conductivity': conductivity,
        'volume': volume,
        'surface_area': surface_area,
        'units': {'temperature': '°C', 'conductivity': 'W/m·K', 'heat_flux': 'W/m²'}
    }

# Read parameters
try:
    with open('params.json', 'r') as f:
        params = json.load(f)
    
    result = thermal_analysis(
        temperature=params.get('temperature', 100),
        conductivity=params.get('conductivity', 50),
        dimensions=params.get('dimensions', {'length': 1, 'width': 1, 'height': 1})
    )
    
    with open('results.json', 'w') as f:
        json.dump(result, f, indent=2)
    
    print(json.dumps(result))
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    exit(1)
`,
        parametersSchema: {
          type: 'object',
          properties: {
            temperature: { type: 'number', description: 'Temperature in °C' },
            conductivity: { type: 'number', description: 'Thermal conductivity in W/m·K' },
            dimensions: {
              type: 'object',
              properties: {
                length: { type: 'number', description: 'Length in meters' },
                width: { type: 'number', description: 'Width in meters' },
                height: { type: 'number', description: 'Height in meters' }
              }
            }
          }
        }
      },
      {
        id: 'fluid-dynamics',
        name: 'Fluid Dynamics Simulation',
        description: 'Basic fluid flow and pressure analysis',
        engine: 'python',
        codeTemplate: `
import numpy as np
import json

def fluid_analysis(velocity, density, viscosity, pipe_diameter, pipe_length):
    """Simulate fluid dynamics in a pipe"""
    
    # Calculate Reynolds number
    reynolds = (density * velocity * pipe_diameter) / viscosity
    
    # Determine flow type
    flow_type = 'laminar' if reynolds < 2300 else 'turbulent' if reynolds > 4000 else 'transitional'
    
    # Pressure drop (simplified Darcy-Weisbach)
    friction_factor = 0.316 / (reynolds ** 0.25) if flow_type == 'turbulent' else 64 / reynolds
    pressure_drop = friction_factor * (pipe_length / pipe_diameter) * (density * velocity ** 2) / 2
    
    return {
        'reynolds_number': reynolds,
        'flow_type': flow_type,
        'pressure_drop': pressure_drop,
        'velocity': velocity,
        'density': density,
        'viscosity': viscosity,
        'pipe_diameter': pipe_diameter,
        'pipe_length': pipe_length,
        'units': {'pressure': 'Pa', 'velocity': 'm/s', 'density': 'kg/m³', 'viscosity': 'Pa·s'}
    }

# Read parameters
try:
    with open('params.json', 'r') as f:
        params = json.load(f)
    
    result = fluid_analysis(
        velocity=params.get('velocity', 1.5),
        density=params.get('density', 1000),
        viscosity=params.get('viscosity', 0.001),
        pipe_diameter=params.get('pipe_diameter', 0.1),
        pipe_length=params.get('pipe_length', 10)
    )
    
    with open('results.json', 'w') as f:
        json.dump(result, f, indent=2)
    
    print(json.dumps(result))
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    exit(1)
`,
        parametersSchema: {
          type: 'object',
          properties: {
            velocity: { type: 'number', description: 'Fluid velocity in m/s' },
            density: { type: 'number', description: 'Fluid density in kg/m³' },
            viscosity: { type: 'number', description: 'Fluid viscosity in Pa·s' },
            pipe_diameter: { type: 'number', description: 'Pipe diameter in meters' },
            pipe_length: { type: 'number', description: 'Pipe length in meters' }
          }
        }
      }
    ];
  }

  getAvailableBlueprints(): SimulationBlueprint[] {
    return [...this.blueprints];
  }

  getBlueprint(blueprintId: string): SimulationBlueprint | null {
    return this.blueprints.find(b => b.id === blueprintId) || null;
  }

  async runSimulation(
    blueprintId: string,
    parameters: SimulationParameters,
    options: { timeoutMs?: number; allowNetwork?: boolean } = {}
  ): Promise<SimulationResult> {
    const startTime = Date.now();
    const blueprint = this.getBlueprint(blueprintId);

    if (!blueprint) {
      throw new Error(`Simulation blueprint ${blueprintId} not found`);
    }

    try {
      logger.info(`🔧 Running simulation: ${blueprint.name} (${blueprintId})`);

      // Create simulation working directory
      const simDir = path.join(this.simulationResultsDir, `${blueprintId}_${Date.now()}`);
      fs.mkdirSync(simDir, { recursive: true });

      // Write parameters file
      const paramsFile = path.join(simDir, 'params.json');
      fs.writeFileSync(paramsFile, JSON.stringify(parameters, null, 2), 'utf8');

      // Prepare simulation code
      let simulationCode = blueprint.codeTemplate;

      // For Python simulations, we need to handle file I/O in the sandbox
      if (blueprint.engine === 'python') {
        simulationCode = `
import json
import os
import sys

# Change working directory to simulation directory
os.chdir('${simDir}')

` + simulationCode;
      }

      // Execute the simulation
      const executionResult = await this.codeExecutionService.executeSafeCode(
        simulationCode,
        blueprint.engine as 'python' | 'javascript',
        {
          timeoutMs: options.timeoutMs || 30000,
          memoryLimitMb: 512,
          allowNetwork: options.allowNetwork || false,
        }
      );

      const executionTime = Date.now() - startTime;

      if (!executionResult.success) {
        throw new Error(executionResult.error || 'Simulation execution failed');
      }

      // Read results if available
      let simulationOutput;
      try {
        const resultsFile = path.join(simDir, 'results.json');
        if (fs.existsSync(resultsFile)) {
          simulationOutput = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
        } else {
          // Parse output from stdout
          simulationOutput = JSON.parse(executionResult.output || '{}');
        }
      } catch (parseError) {
        // If we can't parse JSON, use raw output
        simulationOutput = executionResult.output || 'Simulation completed successfully';
      }

      return {
        success: true,
        output: simulationOutput,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString(),
        metrics: {
          blueprintId,
          blueprintName: blueprint.name,
          executionTimeMs: executionTime,
          parametersUsed: Object.keys(parameters).length
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error(`❌ Simulation failed for ${blueprintId}:`, 
        error instanceof Error ? error.message : error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown simulation error',
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runCustomSimulation(
    code: string,
    language: 'python' | 'javascript',
    parameters: SimulationParameters = {},
    options: { timeoutMs?: number; allowNetwork?: boolean } = {}
  ): Promise<SimulationResult> {
    const startTime = Date.now();

    try {
      logger.info('🔧 Running custom simulation');

      // Create simulation working directory
      const simDir = path.join(this.simulationResultsDir, `custom_${Date.now()}`);
      fs.mkdirSync(simDir, { recursive: true });

      // Write parameters file
      const paramsFile = path.join(simDir, 'params.json');
      fs.writeFileSync(paramsFile, JSON.stringify(parameters, null, 2), 'utf8');

      // Prepare code with parameter loading
      let finalCode = code;
      
      if (language === 'python') {
        finalCode = `
import json
import os

# Load parameters
try:
    with open('params.json', 'r') as f:
        params = json.load(f)
    globals().update(params)
except:
    pass

` + code;
      } else if (language === 'javascript') {
        finalCode = `
const fs = require('fs');

// Load parameters
try {
    const params = JSON.parse(fs.readFileSync('params.json', 'utf8'));
    Object.assign(global, params);
} catch (e) {
    console.log('No parameters file found');
}

` + code;
      }

      // Execute the simulation
      const executionResult = await this.codeExecutionService.executeSafeCode(
        finalCode,
        language,
        {
          timeoutMs: options.timeoutMs || 30000,
          memoryLimitMb: 512,
          allowNetwork: options.allowNetwork || false,
        }
      );

      const executionTime = Date.now() - startTime;

      if (!executionResult.success) {
        throw new Error(executionResult.error || 'Custom simulation execution failed');
      }

      return {
        success: true,
        output: executionResult.output || 'Custom simulation completed',
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString(),
        metrics: {
          type: 'custom',
          language,
          executionTimeMs: executionTime
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('❌ Custom simulation failed:', 
        error instanceof Error ? error.message : error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown custom simulation error',
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async validateSimulationParameters(
    blueprintId: string,
    parameters: SimulationParameters
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const blueprint = this.getBlueprint(blueprintId);

    if (!blueprint) {
      return { valid: false, errors: [`Blueprint ${blueprintId} not found`] };
    }

    // Basic validation - in a real implementation, use a proper validator
    const errors: string[] = [];

    try {
      // Check required parameters based on the schema
      if (blueprint.parametersSchema?.required) {
        blueprint.parametersSchema.required.forEach((param: string) => {
          if (!(param in parameters)) {
            errors.push(`Missing required parameter: ${param}`);
          }
        });
      }

      // Type checking (simplified)
      if (blueprint.parametersSchema?.properties) {
        for (const [param, schema] of Object.entries(blueprint.parametersSchema.properties)) {
          if (param in parameters) {
            const expectedType = schema.type;
            const actualValue = parameters[param];
            
            if (expectedType === 'number' && typeof actualValue !== 'number') {
              errors.push(`Parameter ${param} should be a number`);
            } else if (expectedType === 'string' && typeof actualValue !== 'string') {
              errors.push(`Parameter ${param} should be a string`);
            } else if (expectedType === 'object' && (typeof actualValue !== 'object' || actualValue === null)) {
              errors.push(`Parameter ${param} should be an object`);
            }
          }
        }
      }

    } catch (error) {
      logger.error('Parameter validation error:', error);
      errors.push('Parameter validation failed');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  cleanupOldSimulations(maxAgeHours: number = 24): void {
    try {
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      if (fs.existsSync(this.simulationResultsDir)) {
        const directories = fs.readdirSync(this.simulationResultsDir);

        directories.forEach(dir => {
          const dirPath = path.join(this.simulationResultsDir, dir);
          const stats = fs.statSync(dirPath);

          if (now - stats.mtimeMs > maxAgeMs) {
            try {
              fs.rmSync(dirPath, { recursive: true, force: true });
              logger.info(`🗑️ Cleaned up old simulation: ${dir}`);
            } catch (error) {
              logger.warn(`Failed to cleanup old simulation ${dir}:`, error);
            }
          }
        });
      }
    } catch (error) {
      logger.error('Failed to cleanup old simulations:', error);
    }
  }

  getSimulationInfo(): { 
    blueprintsCount: number; 
    resultsDirectory: string; 
    availableBlueprints: string[] 
  } {
    return {
      blueprintsCount: this.blueprints.length,
      resultsDirectory: this.simulationResultsDir,
      availableBlueprints: this.blueprints.map(b => b.id)
    };
  }
}