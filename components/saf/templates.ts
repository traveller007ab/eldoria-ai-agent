/**
 * SAF Template Library - Multi-domain starter blueprints
 * Each template provides a complete example with components, flows, parameters
 */

import { DeepSAFBlueprint } from './types';

export interface SAFTemplate {
    id: string;
    name: string;
    description: string;
    domain: string;
    icon: string; // Lucide icon name
    color: string; // Tailwind color class
    blueprint: DeepSAFBlueprint;
}

// ============================================
// MECHANICAL ENGINEERING TEMPLATES
// ============================================

export const RANKINE_CYCLE_TEMPLATE: SAFTemplate = {
    id: 'rankine-cycle',
    name: 'Rankine Cycle Power Plant',
    description: 'Classic thermodynamic power cycle with boiler, turbine, condenser, and pump',
    domain: 'mechanical',
    icon: 'Cog',
    color: 'cyan',
    blueprint: {
        project_name: 'Rankine Cycle Power Plant',
        version: '1.0',
        domain: 'mechanical',
        components: [
            {
                id: 'boiler',
                name: 'Boiler',
                type: 'core',
                description: 'Heat exchanger that converts water to high-pressure steam',
                dependencies: [],
                parameters: [
                    { name: 'Heat Input', value: 1000, unit: 'kW', min: 500, max: 5000 },
                    { name: 'Steam Temp', value: 500, unit: '°C', min: 300, max: 600 },
                    { name: 'Pressure', value: 10, unit: 'MPa', min: 1, max: 20 },
                ],
                outputs: [
                    { name: 'Steam Mass Flow', value: 2.5, unit: 'kg/s', formula: 'heat_input / enthalpy_diff' },
                ],
                position: { x: 100, y: 200 },
            },
            {
                id: 'turbine',
                name: 'Turbine',
                type: 'core',
                description: 'Converts steam thermal energy to mechanical work',
                dependencies: ['boiler'],
                parameters: [
                    { name: 'Isentropic Efficiency', value: 85, unit: '%', min: 70, max: 95 },
                ],
                outputs: [
                    { name: 'Power Output', value: 425, unit: 'kW', formula: 'mass_flow * enthalpy_drop * efficiency' },
                ],
                position: { x: 350, y: 100 },
            },
            {
                id: 'condenser',
                name: 'Condenser',
                type: 'subcore',
                description: 'Removes heat from exhaust steam to convert it back to liquid',
                dependencies: ['turbine'],
                parameters: [
                    { name: 'Cooling Water Temp', value: 25, unit: '°C', min: 15, max: 35 },
                ],
                outputs: [
                    { name: 'Outlet Quality', value: 0, unit: '-' },
                ],
                position: { x: 350, y: 300 },
            },
            {
                id: 'pump',
                name: 'Pump',
                type: 'subcore',
                description: 'Pressurizes liquid water to boiler inlet pressure',
                dependencies: ['condenser'],
                parameters: [
                    { name: 'Pump Efficiency', value: 75, unit: '%', min: 60, max: 90 },
                ],
                outputs: [
                    { name: 'Work Input', value: 15, unit: 'kW' },
                ],
                position: { x: 100, y: 350 },
            },
        ],
        flows: [
            { id: 'f1', from: 'boiler', to: 'turbine', type: 'energy', label: 'High-P Steam' },
            { id: 'f2', from: 'turbine', to: 'condenser', type: 'energy', label: 'Exhaust Steam' },
            { id: 'f3', from: 'condenser', to: 'pump', type: 'material', label: 'Liquid Water' },
            { id: 'f4', from: 'pump', to: 'boiler', type: 'material', label: 'Pressurized Water' },
        ],
        created_at: new Date().toISOString(),
    }
};

// ============================================
// GOVERNANCE & POLICY TEMPLATES
// ============================================

export const GOVERNANCE_FRAMEWORK_TEMPLATE: SAFTemplate = {
    id: 'governance-framework',
    name: 'Governance Framework',
    description: 'Organizational decision-making structure with policy enforcement',
    domain: 'governance',
    icon: 'Building2',
    color: 'purple',
    blueprint: {
        project_name: 'Democratic Governance System',
        version: '1.0',
        domain: 'governance',
        components: [
            {
                id: 'legislature',
                name: 'Legislative Body',
                type: 'core',
                description: 'Creates and passes laws through democratic voting',
                dependencies: [],
                parameters: [
                    { name: 'Members', value: 100, unit: 'seats' },
                    { name: 'Quorum', value: 51, unit: '%' },
                    { name: 'Vote Threshold', value: 50, unit: '%' },
                ],
                outputs: [
                    { name: 'Bills Passed', value: 45, unit: '/year' },
                ],
                position: { x: 200, y: 50 },
            },
            {
                id: 'executive',
                name: 'Executive Branch',
                type: 'core',
                description: 'Implements and enforces legislation',
                dependencies: ['legislature'],
                parameters: [
                    { name: 'Departments', value: 15, unit: '' },
                    { name: 'Budget', value: 500, unit: 'M$' },
                ],
                outputs: [
                    { name: 'Enforcement Rate', value: 87, unit: '%' },
                ],
                position: { x: 450, y: 150 },
            },
            {
                id: 'judiciary',
                name: 'Judicial Review',
                type: 'subcore',
                description: 'Interprets laws and resolves disputes',
                dependencies: ['legislature', 'executive'],
                parameters: [
                    { name: 'Courts', value: 3, unit: 'levels' },
                    { name: 'Judges', value: 50, unit: '' },
                ],
                outputs: [
                    { name: 'Cases Resolved', value: 1200, unit: '/year' },
                ],
                position: { x: 200, y: 300 },
            },
            {
                id: 'citizens',
                name: 'Citizens',
                type: 'micro',
                description: 'Public electorate that votes and provides feedback',
                dependencies: [],
                parameters: [
                    { name: 'Population', value: 1000000, unit: '' },
                    { name: 'Voter Turnout', value: 65, unit: '%' },
                ],
                outputs: [
                    { name: 'Public Trust', value: 72, unit: '%' },
                ],
                position: { x: 50, y: 150 },
            },
        ],
        flows: [
            { id: 'g1', from: 'citizens', to: 'legislature', type: 'signal', label: 'Elections' },
            { id: 'g2', from: 'legislature', to: 'executive', type: 'control', label: 'Legislation' },
            { id: 'g3', from: 'executive', to: 'citizens', type: 'data', label: 'Services' },
            { id: 'g4', from: 'citizens', to: 'judiciary', type: 'signal', label: 'Disputes' },
            { id: 'g5', from: 'judiciary', to: 'executive', type: 'control', label: 'Rulings' },
        ],
        created_at: new Date().toISOString(),
    }
};

// ============================================
// AI AGENT ARCHITECTURE TEMPLATES
// ============================================

export const AI_AGENT_TEMPLATE: SAFTemplate = {
    id: 'ai-agent',
    name: 'AI Agent Architecture',
    description: 'Modular AI agent with perception, reasoning, and action components',
    domain: 'ai',
    icon: 'Bot',
    color: 'emerald',
    blueprint: {
        project_name: 'Autonomous AI Agent',
        version: '1.0',
        domain: 'ai_agents',
        components: [
            {
                id: 'perception',
                name: 'Perception Module',
                type: 'core',
                description: 'Processes input from environment sensors',
                dependencies: [],
                parameters: [
                    { name: 'Input Channels', value: 5, unit: '' },
                    { name: 'Processing Rate', value: 60, unit: 'Hz' },
                    { name: 'Latency', value: 16, unit: 'ms' },
                ],
                outputs: [
                    { name: 'State Vector Size', value: 512, unit: 'dims' },
                ],
                position: { x: 100, y: 100 },
            },
            {
                id: 'memory',
                name: 'Memory System',
                type: 'subcore',
                description: 'Short and long-term memory storage with retrieval',
                dependencies: ['perception'],
                parameters: [
                    { name: 'Working Memory', value: 8, unit: 'items' },
                    { name: 'LTM Capacity', value: 1000000, unit: 'entries' },
                    { name: 'Retrieval Speed', value: 10, unit: 'ms' },
                ],
                outputs: [
                    { name: 'Recall Accuracy', value: 94, unit: '%' },
                ],
                position: { x: 100, y: 250 },
            },
            {
                id: 'reasoning',
                name: 'Reasoning Engine',
                type: 'core',
                description: 'Inference, planning, and decision making',
                dependencies: ['perception', 'memory'],
                parameters: [
                    { name: 'Model Size', value: 70, unit: 'B params' },
                    { name: 'Context Window', value: 128, unit: 'K tokens' },
                    { name: 'Temperature', value: 0.7, unit: '' },
                ],
                outputs: [
                    { name: 'Plans Generated', value: 5, unit: '/query' },
                ],
                position: { x: 350, y: 175 },
            },
            {
                id: 'action',
                name: 'Action Module',
                type: 'core',
                description: 'Executes planned actions in environment',
                dependencies: ['reasoning'],
                parameters: [
                    { name: 'Action Space', value: 50, unit: 'actions' },
                    { name: 'Execution Rate', value: 10, unit: 'Hz' },
                ],
                outputs: [
                    { name: 'Success Rate', value: 89, unit: '%' },
                ],
                position: { x: 550, y: 175 },
            },
            {
                id: 'reward',
                name: 'Reward Model',
                type: 'micro',
                description: 'Evaluates action outcomes for learning',
                dependencies: ['action'],
                parameters: [
                    { name: 'Discount Factor', value: 0.99, unit: '' },
                    { name: 'Learning Rate', value: 0.001, unit: '' },
                ],
                outputs: [
                    { name: 'Cumulative Reward', value: 847, unit: '' },
                ],
                position: { x: 550, y: 325 },
            },
        ],
        flows: [
            { id: 'a1', from: 'perception', to: 'memory', type: 'data', label: 'Observations' },
            { id: 'a2', from: 'perception', to: 'reasoning', type: 'data', label: 'State' },
            { id: 'a3', from: 'memory', to: 'reasoning', type: 'data', label: 'Context' },
            { id: 'a4', from: 'reasoning', to: 'action', type: 'control', label: 'Plan' },
            { id: 'a5', from: 'action', to: 'reward', type: 'signal', label: 'Outcome' },
            { id: 'a6', from: 'reward', to: 'reasoning', type: 'signal', label: 'Feedback' },
        ],
        created_at: new Date().toISOString(),
    }
};

// ============================================
// CREATIVE PROJECT TEMPLATES
// ============================================

export const CREATIVE_PROJECT_TEMPLATE: SAFTemplate = {
    id: 'creative-project',
    name: 'Creative Project Pipeline',
    description: 'End-to-end creative production workflow from concept to delivery',
    domain: 'creative',
    icon: 'Palette',
    color: 'amber',
    blueprint: {
        project_name: 'Creative Production Pipeline',
        version: '1.0',
        domain: 'creative',
        components: [
            {
                id: 'concept',
                name: 'Concept Development',
                type: 'core',
                description: 'Initial ideation and creative direction',
                dependencies: [],
                parameters: [
                    { name: 'Brainstorm Hours', value: 20, unit: 'hrs' },
                    { name: 'Concepts Generated', value: 15, unit: '' },
                ],
                outputs: [
                    { name: 'Selected Concepts', value: 3, unit: '' },
                ],
                position: { x: 100, y: 150 },
            },
            {
                id: 'design',
                name: 'Design Phase',
                type: 'core',
                description: 'Visual and structural design execution',
                dependencies: ['concept'],
                parameters: [
                    { name: 'Iterations', value: 5, unit: 'rounds' },
                    { name: 'Designers', value: 3, unit: '' },
                ],
                outputs: [
                    { name: 'Design Assets', value: 25, unit: 'files' },
                ],
                position: { x: 300, y: 100 },
            },
            {
                id: 'production',
                name: 'Production',
                type: 'core',
                description: 'Asset creation and content production',
                dependencies: ['design'],
                parameters: [
                    { name: 'Production Days', value: 10, unit: 'days' },
                    { name: 'Team Size', value: 8, unit: '' },
                ],
                outputs: [
                    { name: 'Deliverables', value: 50, unit: 'items' },
                ],
                position: { x: 500, y: 100 },
            },
            {
                id: 'review',
                name: 'Review & QA',
                type: 'subcore',
                description: 'Quality assurance and stakeholder approval',
                dependencies: ['production'],
                parameters: [
                    { name: 'Review Rounds', value: 3, unit: '' },
                    { name: 'Approval Rate', value: 85, unit: '%' },
                ],
                outputs: [
                    { name: 'Approved Items', value: 42, unit: '' },
                ],
                position: { x: 500, y: 250 },
            },
            {
                id: 'delivery',
                name: 'Delivery',
                type: 'micro',
                description: 'Final packaging and distribution',
                dependencies: ['review'],
                parameters: [
                    { name: 'Formats', value: 4, unit: '' },
                    { name: 'Channels', value: 6, unit: '' },
                ],
                outputs: [
                    { name: 'Deliveries Made', value: 24, unit: '' },
                ],
                position: { x: 300, y: 300 },
            },
        ],
        flows: [
            { id: 'c1', from: 'concept', to: 'design', type: 'data', label: 'Brief' },
            { id: 'c2', from: 'design', to: 'production', type: 'data', label: 'Specs' },
            { id: 'c3', from: 'production', to: 'review', type: 'material', label: 'Assets' },
            { id: 'c4', from: 'review', to: 'production', type: 'signal', label: 'Revisions' },
            { id: 'c5', from: 'review', to: 'delivery', type: 'control', label: 'Approved' },
        ],
        created_at: new Date().toISOString(),
    }
};

// ============================================
// TEMPLATE REGISTRY
// ============================================

export const SAF_TEMPLATES: SAFTemplate[] = [
    RANKINE_CYCLE_TEMPLATE,
    GOVERNANCE_FRAMEWORK_TEMPLATE,
    AI_AGENT_TEMPLATE,
    CREATIVE_PROJECT_TEMPLATE,
];

export function getTemplateById(id: string): SAFTemplate | undefined {
    return SAF_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByDomain(domain: string): SAFTemplate[] {
    return SAF_TEMPLATES.filter(t => t.domain === domain);
}
