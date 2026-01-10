// Standalone test for new parseBlueprint implementation
// Run with: npx tsx test_topology.ts

interface HydraulicNode {
    id: number;
    componentId: string;
    isFixed: boolean;
    fixedHead: number;
    elevation: number;
    initialHeadGuess: number;
}

interface HydraulicLink {
    id: string;
    componentId: string;
    startNode: number;
    endNode: number;
    type: 'pipe' | 'valve' | 'pump';
    params: Record<string, number>;
}

interface Blueprint {
    id: string;
    name: string;
    components: any[];
    connections: any[];
}

function parseBlueprintNew(blueprint: Blueprint): { nodes: HydraulicNode[], links: HydraulicLink[], unknownsMap: Record<string, number> } {
    const nodes: HydraulicNode[] = [];
    const nodeMap = new Map<string, number>();
    const links: HydraulicLink[] = [];
    let nodeCounter = 0;

    const createNode = (componentId: string, portName: string, isFixed: boolean = false, fixedHead: number = 50): number => {
        const nodeId = `${componentId}_${portName}`;
        if (!nodeMap.has(nodeId)) {
            nodeMap.set(nodeId, nodeCounter);
            nodes.push({
                id: nodeCounter++,
                componentId,
                isFixed,
                fixedHead,
                elevation: 0,
                initialHeadGuess: fixedHead
            });
        }
        return nodeMap.get(nodeId)!;
    };

    if (!blueprint.components || blueprint.components.length === 0) {
        return { nodes: [], links: [], unknownsMap: {} };
    }

    // Step 1: Create nodes for FLUID ports only
    blueprint.components.forEach((comp: any) => {
        const compType = String(comp.componentDefinitionId).toLowerCase();
        const params = comp.parameterValues || {};

        // Skip mechanical components (engine, gearbox)
        if (compType.includes('engine') || compType.includes('motor') || compType.includes('gear')) {
            return; // Mechanical components don't have hydraulic nodes
        }

        if (compType.includes('tank') || compType.includes('reservoir')) {
            const head = Number(params.head) || Number(params.initial_level) || 5;
            createNode(comp.id, 'in', true, head);
            createNode(comp.id, 'out', true, head);
        } else if (compType.includes('pump')) {
            const pumpHead = Number(params.design_head) || Number(params.head) || 50;
            createNode(comp.id, 'in', false, pumpHead * 1.2);
            createNode(comp.id, 'out', false, pumpHead);
        } else {
            // Pipe, valve, etc.
            createNode(comp.id, 'in', false);
            createNode(comp.id, 'out', false);
        }
    });

    // Step 2: Create links from connections
    blueprint.connections.forEach((conn: any) => {
        if (conn.type !== 'fluid') return;

        // Normalize port names (handle outlet/inlet/in/out variations)
        const normalizePort = (portName: string): string => {
            const lower = String(portName).toLowerCase();
            if (lower.includes('out') && !lower.includes('in')) return 'out';
            if (lower.includes('in') && !lower.includes('out')) return 'in';
            return lower;
        };

        const sourcePort = normalizePort(conn.sourcePortId);
        const targetPort = normalizePort(conn.targetPortId);

        const sourceNodeId = `${conn.sourceComponentId}_${sourcePort}`;
        const targetNodeId = `${conn.targetComponentId}_${targetPort}`;

        const sourceNode = nodeMap.get(sourceNodeId);
        const targetNode = nodeMap.get(targetNodeId);

        if (sourceNode === undefined || targetNode === undefined) return;

        const targetComp = blueprint.components.find((c: any) => c.id === conn.targetComponentId);
        if (!targetComp) return;

        const targetType = String(targetComp.componentDefinitionId).toLowerCase();
        const targetParams = targetComp.parameterValues || {};

        let linkType: 'pipe' | 'valve' | 'pump' = 'pipe';
        let params: Record<string, number> = {};

        if (targetType.includes('pump')) {
            linkType = 'pump';
            params = {
                design_flow: Number(targetParams.design_flow) || 100,
                design_head: Number(targetParams.design_head) || 50,
                speed: Number(targetParams.speed) || 1450
            };
        } else if (targetType.includes('valve')) {
            linkType = 'valve';
            params = {
                opening: Number(targetParams.opening) || 100,
                cv: Number(targetParams.cv) || 100,
                diameter: Number(targetParams.diameter) || 50
            };
        } else {
            const linkComp = targetParams.diameter ? targetComp : 
                             blueprint.components.find((c: any) => c.id === conn.sourceComponentId);
            if (linkComp) {
                const linkParams = linkComp.parameterValues || {};
                params = {
                    length: Number(linkParams.length) || 10,
                    diameter: Number(linkParams.diameter) || 100,
                    roughness: Number(linkParams.roughness) || 0.045
                };
            }
        }

        links.push({
            id: conn.id || `link_${links.length}`,
            componentId: targetComp.id,
            startNode: sourceNode,
            endNode: targetNode,
            type: linkType,
            params
        });
    });

    const unknownsMap: Record<string, number> = {};
    nodes.forEach((node: any, i: number) => {
        if (!node.isFixed) {
            unknownsMap[`H[${i}]`] = i;
        }
    });

    return { nodes, links, unknownsMap };
}

// Test with V8 Engine Pump Loop blueprint
const testBlueprint: Blueprint = {
    id: 'demo-engine-pump-001',
    name: 'V8 Engine Pump Loop',
    components: [
        { id: 'engine-1', componentDefinitionId: 'mechanical.engine.ic', name: 'V8 Engine', parameterValues: { max_power: 300, throttle: 50 } },
        { id: 'gearbox-1', componentDefinitionId: 'mechanical.gear.spur', name: 'Reduction Gear', parameterValues: { z1: 20, z2: 40 } },
        { id: 'pump-1', componentDefinitionId: 'fluid.pump.centrifugal', name: 'Main Pump', parameterValues: { design_flow: 150, design_head: 80 } },
        { id: 'tank-1', componentDefinitionId: 'fluid.tank.reservoir', name: 'Supply Tank', parameterValues: { head: 5, initial_level: 5 } },
        { id: 'pipe-suction', componentDefinitionId: 'fluid.pipe.std', name: 'Suction Line', parameterValues: { length: 5, diameter: 200, roughness: 0.045 } },
        { id: 'valve-discharge', componentDefinitionId: 'fluid.valve.globe', name: 'Throttle Valve', parameterValues: { opening: 100, cv: 200 } },
        { id: 'pipe-return', componentDefinitionId: 'fluid.pipe.std', name: 'Return Line', parameterValues: { length: 20, diameter: 150 } }
    ],
    connections: [
        { id: 'c1', sourceComponentId: 'engine-1', sourcePortId: 'shaft_out', targetComponentId: 'gearbox-1', targetPortId: 'shaft_in', type: 'mechanical' },
        { id: 'c2', sourceComponentId: 'gearbox-1', sourcePortId: 'shaft_out', targetComponentId: 'pump-1', targetPortId: 'shaft_in', type: 'mechanical' },
        { id: 'c3', sourceComponentId: 'tank-1', sourcePortId: 'outlet', targetComponentId: 'pipe-suction', targetPortId: 'in', type: 'fluid' },
        { id: 'c4', sourceComponentId: 'pipe-suction', sourcePortId: 'out', targetComponentId: 'pump-1', targetPortId: 'inlet', type: 'fluid' },
        { id: 'c5', sourceComponentId: 'pump-1', sourcePortId: 'outlet', targetComponentId: 'valve-discharge', targetPortId: 'in', type: 'fluid' },
        { id: 'c6', sourceComponentId: 'valve-discharge', sourcePortId: 'out', targetComponentId: 'pipe-return', targetPortId: 'in', type: 'fluid' },
        { id: 'c7', sourceComponentId: 'pipe-return', sourcePortId: 'out', targetComponentId: 'tank-1', targetPortId: 'inlet', type: 'fluid' }
    ]
};

// Run test
console.log('=== Testing NEW parseBlueprint Implementation ===\n');

const result = parseBlueprintNew(testBlueprint);

console.log('NODES CREATED:', result.nodes.length);
result.nodes.forEach((node: any) => {
    console.log(`  Node ${node.id}: ${node.componentId} (${node.isFixed ? 'FIXED' : 'VARIABLE'}, head=${node.initialHeadGuess})`);
});

console.log('\nLINKS CREATED:', result.links.length);
result.links.forEach((link: any) => {
    console.log(`  Link ${link.id}: ${link.componentId} [${link.startNode} -> ${link.endNode}] (${link.type})`);
});

console.log('\nUNKNOWN NODES:', Object.keys(result.unknownsMap).length);
console.log('Fixed nodes:', result.nodes.filter((n: any) => n.isFixed).length);
console.log('Variable nodes:', result.nodes.filter((n: any) => !n.isFixed).length);

console.log('\n=== Test Result ===');
if (result.nodes.length >= 4 && result.links.length >= 6) {
    console.log('✅ SUCCESS: Topology correctly identifies multiple nodes and links');
    console.log('   Expected: 4-8 nodes for closed-loop system');
    console.log('   Actual:', result.nodes.length, 'nodes');
} else {
    console.log('❌ FAIL: Topology not creating enough nodes');
    console.log('   Expected: 4-8 nodes, Got:', result.nodes.length);
}
