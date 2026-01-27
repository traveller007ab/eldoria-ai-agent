
import { DynamicSimulationService } from '../services/physics/DynamicSimulationService.ts';
import type { MechBlueprint, MechComponentInstance, MechConnection } from '../types.ts';

async function runStressTest() {
    console.log("==========================================");
    console.log("    SAF LAB STRESS TEST SUITE            ");
    console.log("==========================================\n");

    const COMPONENT_COUNT = 100;
    console.log(`Generating Blueprint with ${COMPONENT_COUNT} components...`);

    const components: MechComponentInstance[] = [];
    const connections: MechConnection[] = [];

    // Create a long daisy chain: Tank -> Pump1 -> Pipe1 -> Pump2 -> Pipe2 ... -> Tank (Sink)

    // 1. Source Tank
    components.push({
        id: 'source_tank', componentDefinitionId: 'fluid.tank.reservoir',
        name: 'Source', position: { x: 0, y: 0 }, rotation: 0,
        parameterValues: { head: 10 }, isSelected: false, groupIds: []
    });

    // 2. Sink Tank
    components.push({
        id: 'sink_tank', componentDefinitionId: 'fluid.tank.reservoir',
        name: 'Sink', position: { x: (COMPONENT_COUNT + 1) * 100, y: 0 }, rotation: 0,
        parameterValues: { head: 0 }, isSelected: false, groupIds: []
    });

    let previousId = 'source_tank';
    let previousPort = 'outlet';

    for (let i = 0; i < COMPONENT_COUNT; i++) {
        const isPump = i % 2 === 0;
        const id = `comp_${i}`;
        const type = isPump ? 'fluid.pump.centrifugal' : 'fluid.pipe.std';

        components.push({
            id: id, componentDefinitionId: type,
            name: isPump ? `Pump ${i}` : `Pipe ${i}`,
            position: { x: (i + 1) * 100, y: 0 }, rotation: 0,
            parameterValues: isPump
                ? { design_flow: 100, design_head: 50, speed: 1450 }
                : { length: 10, diameter: 0.1, roughness: 0.001 },
            isSelected: false, groupIds: []
        });

        // Determine ports
        const targetPort = isPump ? 'inlet' : 'in';
        const nextSourcePort = isPump ? 'outlet' : 'out';

        // Connect from previous
        connections.push({
            id: `conn_${i}_in`,
            sourceComponentId: previousId, sourcePortId: previousPort,
            targetComponentId: id, targetPortId: targetPort,
            type: 'fluid', isSelected: false
        });

        previousId = id;
        previousPort = nextSourcePort;
    }

    // Connect last component to Sink
    connections.push({
        id: `conn_sink`,
        sourceComponentId: previousId, sourcePortId: previousPort,
        targetComponentId: 'sink_tank', targetPortId: 'inlet',
        type: 'fluid', isSelected: false
    });

    const blueprint: MechBlueprint = {
        id: 'stress_test_1',
        name: 'Massive Chain',
        domain: 'fluid',
        version: '1.0.0',
        components,
        connections,
        simulations: []
    };

    console.log(`Blueprint Created. Components: ${blueprint.components.length}, Connections: ${blueprint.connections.length}`);

    // Run Simulation
    const start = Date.now();
    try {
        console.log("Starting Simulation (5s, dt=0.5s)...");
        const result = await DynamicSimulationService.simulate(blueprint, 5, 0.5);
        const end = Date.now();

        console.log(`Simulation Complete in ${(end - start) / 1000} seconds.`);
        console.log(`Convergence Status: ${result.diagnostics.convergence.converged}`);
        console.log(`Total Time Points: ${result.timePoints.length}`);
        console.log(`Metrics: Power Input=${result.metrics.totalPowerInput.toFixed(2)} kW, Flow=${result.metrics.totalFlowRate.toFixed(2)} m3/h`);

        if ((end - start) < 5000) {
            console.log("[PERFORMANCE]: EXCELLENT (< 5s)");
        } else if ((end - start) < 15000) {
            console.log("[PERFORMANCE]: ACCEPTABLE (< 15s)");
        } else {
            console.log("[PERFORMANCE]: SLOW (> 15s)");
        }

    } catch (e) {
        console.error("Stress Test Failed:", e);
    }
}

runStressTest();
