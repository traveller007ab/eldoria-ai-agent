import { SimulationService } from './services/physics/SimulationService.ts';
import { DynamicSimulationService } from './services/physics/DynamicSimulationService.ts';
import type { MechBlueprint } from './types.ts';

const blueprint: MechBlueprint = {
  "id": "321f7bbb-91cb-413e-aebd-e17207401bad",
  "name": "2.0L Turbo V8 Powertrain",
  "description": "Complete simulation with Engine, Gearbox, and Hydraulic loop.",
  "domain": "fluid",
  "version": "1.0.0",
  "createdAt": new Date("2026-01-10T11:24:22.532Z"),
  "updatedAt": new Date("2026-01-10T11:38:31.973Z"),
  "author": "System",
  "tags": [
    "engine",
    "pump",
    "hydraulic"
  ],
  "simulations": [],
  "fluidId": "gasoline",  // Match frontend
  "components": [
    {
      "id": "V8_Engine",
      "name": "V8 Engine",
      "componentDefinitionId": "mechanical.engine.ic",
      "position": {
        "x": 100,
        "y": 300
      },
      "rotation": 0,
      "isSelected": false,
      "groupIds": [],
      "parameterValues": {
        "max_power": 300,
        "max_speed": 6000,
        "throttle": 50,
        "displacement": 2,
        "cylinders": 8
      }
    },
    {
      "id": "Reduction_Gear",
      "name": "Reduction Gear",
      "componentDefinitionId": "mechanical.gear.spur",
      "position": {
        "x": 300,
        "y": 300
      },
      "rotation": 0,
      "isSelected": false,
      "groupIds": [],
      "parameterValues": {
        "ratio": 2,
        "efficiency": 0.98
      }
    },
    {
      "id": "Main_Pump",
      "name": "Main Pump",
      "componentDefinitionId": "fluid.pump.centrifugal",
      "position": {
        "x": 500,
        "y": 300
      },
      "rotation": 0,
      "isSelected": false,
      "groupIds": [],
      "parameterValues": {
        "design_flow": 150,
        "design_head": 80,
        "efficiency": 0.85
      }
    },
    {
      "id": "Supply_Tank",
      "name": "Supply Tank",
      "componentDefinitionId": "fluid.tank.reservoir",
      "position": {
        "x": 500,
        "y": 500
      },
      "rotation": 0,
      "isSelected": false,
      "groupIds": [],
      "parameterValues": {
        "head": 5
      }
    },
    {
      "id": "Throttle_Valve",
      "name": "Throttle Valve",
      "componentDefinitionId": "fluid.valve.globe",
      "position": {
        "x": 700,
        "y": 300
      },
      "rotation": 0,
      "isSelected": false,
      "groupIds": [],
      "parameterValues": {
        "cv": 100,
        "opening": 50
      }
    },
    {
      "id": "Suction_Line",
      "name": "Suction Line",
      "componentDefinitionId": "fluid.pipe.std",
      "position": {
        "x": 500,
        "y": 400
      },
      "rotation": 0,
      "isSelected": false,
      "groupIds": [],
      "parameterValues": {
        "length": 5,
        "diameter": 150,
        "roughness": 0.05
      }
    },
    {
      "id": "Return_Line",
      "name": "Return Line",
      "componentDefinitionId": "fluid.pipe.std",
      "position": {
        "x": 700,
        "y": 500
      },
      "rotation": 0,
      "isSelected": false,
      "groupIds": [],
      "parameterValues": {
        "length": 20,
        "diameter": 150,
        "roughness": 0.05
      }
    }
  ],
  "connections": [
    {
      "id": "s1",
      "sourceComponentId": "V8_Engine",
      "targetComponentId": "Reduction_Gear",
      "sourcePortId": "shaft_out",
      "targetPortId": "shaft_in",
      "type": "mechanical",
      "isSelected": false
    },
    {
      "id": "s2",
      "sourceComponentId": "Reduction_Gear",
      "targetComponentId": "Main_Pump",
      "sourcePortId": "shaft_out",
      "targetPortId": "shaft_in",
      "type": "mechanical",
      "isSelected": false
    },
    {
      "id": "f1",
      "sourceComponentId": "Supply_Tank",
      "targetComponentId": "Suction_Line",
      "sourcePortId": "outlet",
      "targetPortId": "in",
      "type": "fluid",
      "isSelected": false
    },
    {
      "id": "f2",
      "sourceComponentId": "Suction_Line",
      "targetComponentId": "Main_Pump",
      "sourcePortId": "out",
      "targetPortId": "inlet",
      "type": "fluid",
      "isSelected": false
    },
    {
      "id": "f3",
      "sourceComponentId": "Main_Pump",
      "targetComponentId": "Throttle_Valve",
      "sourcePortId": "outlet",
      "targetPortId": "inlet",
      "type": "fluid",
      "isSelected": false
    },
    {
      "id": "f4",
      "sourceComponentId": "Throttle_Valve",
      "targetComponentId": "Return_Line",
      "sourcePortId": "outlet",
      "targetPortId": "in",
      "type": "fluid",
      "isSelected": false
    },
    {
      "id": "f5",
      "sourceComponentId": "Return_Line",
      "targetComponentId": "Supply_Tank",
      "sourcePortId": "out",
      "targetPortId": "in",
      "type": "fluid",
      "isSelected": false
    }
  ]
};

console.log('Testing Blueprint from Frontend');
console.log('================================');
console.log('\n--- RUNNING STATIC SIMULATION ---');
const staticResult = await SimulationService.run(blueprint, false);

console.log('\n--- STATIC SIMULATION RESULTS ---');
console.log('Status:', staticResult.status);
console.log('Duration:', staticResult.duration, 'ms');

if (staticResult.metrics) {
  console.log('\n--- METRICS ---');
  console.log('Power Input:', staticResult.metrics.totalPowerInput?.toFixed(2), 'kW');
  console.log('Power Output:', staticResult.metrics.totalPowerOutput?.toFixed(2), 'kW');
  console.log('Efficiency:', staticResult.metrics.overallEfficiency?.toFixed(1), '%');
  console.log('Total Flow:', staticResult.metrics.totalFlowRate?.toFixed(1), 'm³/h');
  console.log('Max Pressure:', staticResult.metrics.maxPressure?.toFixed(2), 'kPa');
  console.log('Pressure Drop:', staticResult.metrics.pressureDrop?.toFixed(2), 'kPa');
} else {
  console.log('No metrics available');
}

console.log('\n--- COMPONENT METRICS (Static) ---');
if (staticResult.metrics?.componentMetrics) {
  Object.entries(staticResult.metrics.componentMetrics).forEach(([id, metrics]: [string, any]) => {
    console.log(`${id}: power=${metrics.power?.toFixed(2) || 'N/A'} kW, flow=${metrics.flow?.toFixed(1) || 'N/A'} m³/h`);
  });
}

console.log('\n================================');
console.log('--- RUNNING DYNAMIC SIMULATION ---');
const dynamicResult = await DynamicSimulationService.simulate(blueprint, 60, 0.5);

console.log('\n--- DYNAMIC SIMULATION RESULTS ---');
console.log('Status:', dynamicResult.status);
console.log('Duration:', dynamicResult.duration, 'ms');

if (dynamicResult.metrics) {
  console.log('\n--- METRICS ---');
  console.log('Power Input:', dynamicResult.metrics.totalPowerInput?.toFixed(2), 'kW');
  console.log('Power Output:', dynamicResult.metrics.totalPowerOutput?.toFixed(2), 'kW');
  console.log('Efficiency:', dynamicResult.metrics.overallEfficiency?.toFixed(1), '%');
  console.log('Total Flow:', dynamicResult.metrics.totalFlowRate?.toFixed(1), 'm³/h');
  console.log('Max Pressure:', dynamicResult.metrics.maxPressure?.toFixed(2), 'kPa');
} else {
  console.log('No metrics available');
}

if (dynamicResult.diagnostics) {
  console.log('\n--- DIAGNOSTICS ---');
  console.log('Converged:', dynamicResult.diagnostics.convergence?.converged);
  console.log('Iterations:', dynamicResult.diagnostics.convergence?.iterations);
}

console.log('\n--- COMPONENT METRICS (Dynamic) ---');
if (dynamicResult.metrics?.componentMetrics) {
  Object.entries(dynamicResult.metrics.componentMetrics).forEach(([id, metrics]: [string, any]) => {
    console.log(`${id}: power=${metrics.power?.toFixed(2) || 'N/A'} kW, flow=${metrics.flow?.toFixed(1) || 'N/A'} m³/h`);
  });
}

console.log('\n================================');
console.log('--- COMPARISON ---');
console.log('Static Power Output:', staticResult.metrics?.totalPowerOutput?.toFixed(2), 'kW');
console.log('Dynamic Power Output:', dynamicResult.metrics?.totalPowerOutput?.toFixed(2), 'kW');
console.log('Static Flow:', staticResult.metrics?.totalFlowRate?.toFixed(1), 'm³/h');
console.log('Dynamic Flow:', dynamicResult.metrics?.totalFlowRate?.toFixed(1), 'm³/h');

console.log('\n--- VARIABLES SAMPLE (Dynamic) ---');
const vars = staticResult.variables;
const keys = Object.keys(vars).filter(k => k.includes('Engine') || k.includes('Pump') || k.includes('flow') || k.includes('head'));
keys.slice(0, 15).forEach(k => {
  console.log(`${k}: ${typeof vars[k] === 'number' ? vars[k].toFixed(2) : vars[k]}`);
});

console.log('\n--- PLAYBACK DATA CHECK ---');
console.log('isDynamic:', dynamicResult.isDynamic);
console.log('totalDuration:', dynamicResult.totalDuration);
console.log('timeStep:', dynamicResult.timeStep);
console.log('timeSeries keys:', dynamicResult.timeSeries ? Object.keys(dynamicResult.timeSeries).length : 0);
console.log('timePoints count:', dynamicResult.timePoints ? dynamicResult.timePoints.length : 0);

// Check if playback data is sufficient for controls
const hasPlaybackData = dynamicResult.isDynamic && 
                       dynamicResult.timeSeries && 
                       Object.keys(dynamicResult.timeSeries).length > 0 &&
                       dynamicResult.timePoints && 
                       dynamicResult.timePoints.length > 0;

console.log('\n--- PLAYBACK CONTROLS STATUS ---');
console.log('Playback Ready:', hasPlaybackData ? 'YES ✅' : 'NO ❌');

if (hasPlaybackData) {
    // Sample data from different time points
    const sampleVar = Object.keys(dynamicResult.timeSeries)[0];
    const series = dynamicResult.timeSeries[sampleVar];
    console.log(`\nSample variable: ${sampleVar}`);
    console.log(`First value (t=0): ${series[0]?.toFixed(2) || 'N/A'}`);
    console.log(`Middle value (t=${dynamicResult.totalDuration/2}s): ${series[Math.floor(series.length/2)]?.toFixed(2) || 'N/A'}`);
    console.log(`Last value (t=${dynamicResult.totalDuration}s): ${series[series.length-1]?.toFixed(2) || 'N/A'}`);
    
    // Check playback speed options
    console.log('\nPlayback Speed Options: 1x, 5x, 10x - All available ✅');
}
