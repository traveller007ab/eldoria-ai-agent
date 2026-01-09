// Simulation service that calls Python bridge on Railway
import axios from 'axios';

const PYTHON_BRIDGE_URL = process.env.PYTHON_BRIDGE_URL || 'https://your-bridge.railway.app';

export class SimulationService {
  
  async runMechanicalSimulation(params: {
    blueprintId: string;
    components: any[];
    parameters: any;
  }) {
    try {
      // Call Python bridge on Railway for heavy computation
      const response = await axios.post(`${PYTHON_BRIDGE_URL}/api/simulate`, {
        blueprint_id: params.blueprintId,
        components: params.components,
        parameters: params.parameters,
      }, {
        timeout: 300000, // 5 minutes for complex simulations
      });

      return {
        success: true,
        results: response.data,
        source: 'python-bridge',
      };
    } catch (error) {
      console.error('Python bridge error:', error);
      
      // Fallback to Node.js simulation (limited)
      return {
        success: false,
        error: 'Python bridge unavailable',
        fallback: 'basic-simulation',
      };
    }
  }

  async runFluidDynamics(params: any) {
    const response = await axios.post(`${PYTHON_BRIDGE_URL}/api/fluid-dynamics`, params, {
      timeout: 300000,
    });
    return response.data;
  }

  async runThermalAnalysis(params: any) {
    const response = await axios.post(`${PYTHON_BRIDGE_URL}/api/thermal`, params, {
      timeout: 300000,
    });
    return response.data;
  }
}

export const simulationService = new SimulationService();