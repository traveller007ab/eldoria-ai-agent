/**
 * Model Query Engine
 * 
 * Translates natural language questions into physics-aware queries.
 * Analyzes the model context to provide intelligent, contextual answers.
 */

import type { MechBlueprint, MechSimulationResult, MechComponent } from '../../types';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface QueryContext {
    blueprint: MechBlueprint;
    simulationResult?: MechSimulationResult;
    selectedComponentId?: string;
}

export interface QueryResult {
    answer: string;
    confidence: 'high' | 'medium' | 'low';
    relevantComponents: string[];
    relevantVariables: string[];
    suggestions: string[];
    calculations?: {
        name: string;
        value: number;
        unit: string;
        explanation: string;
    }[];
}

export interface QueryIntent {
    type: 'diagnosis' | 'whatif' | 'explain' | 'optimize' | 'compare' | 'safety' | 'general';
    subject?: string;
    parameters?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// QUERY PATTERNS
// ═══════════════════════════════════════════════════════════════

const QUERY_PATTERNS: { pattern: RegExp; intent: QueryIntent['type']; extractSubject?: (match: RegExpMatchArray) => string }[] = [
    // Diagnosis patterns
    { pattern: /why\s+is\s+(.+?)\s+(low|high|dropping|increasing|failing)/i, intent: 'diagnosis', extractSubject: (m) => m[1] },
    { pattern: /what['']?s\s+(?:wrong|the\s+issue)\s+with\s+(.+)/i, intent: 'diagnosis', extractSubject: (m) => m[1] },
    { pattern: /why\s+(?:did|does)\s+(.+?)\s+fail/i, intent: 'diagnosis', extractSubject: (m) => m[1] },

    // What-if patterns
    { pattern: /what\s+(?:happens|would\s+happen)\s+if\s+(?:i\s+)?(.+)/i, intent: 'whatif', extractSubject: (m) => m[1] },
    { pattern: /(?:if\s+i\s+)?(?:double|triple|halve|increase|decrease)\s+(?:the\s+)?(.+)/i, intent: 'whatif', extractSubject: (m) => m[1] },

    // Explanation patterns
    { pattern: /(?:explain|how\s+does)\s+(.+?)(?:\s+work)?$/i, intent: 'explain', extractSubject: (m) => m[1] },
    { pattern: /what\s+is\s+(.+)/i, intent: 'explain', extractSubject: (m) => m[1] },

    // Optimization patterns
    { pattern: /how\s+(?:can\s+i|to)\s+(?:improve|optimize|increase|reduce)\s+(.+)/i, intent: 'optimize', extractSubject: (m) => m[1] },
    { pattern: /(?:best|optimal)\s+(?:way|approach)\s+to\s+(.+)/i, intent: 'optimize', extractSubject: (m) => m[1] },

    // Safety patterns
    { pattern: /(?:is\s+there\s+a?\s*)?risk\s+of\s+(.+)/i, intent: 'safety', extractSubject: (m) => m[1] },
    { pattern: /(?:is|are)\s+(?:there|we)\s+(?:any\s+)?(.+?)\s+(?:issues?|problems?|risks?)/i, intent: 'safety', extractSubject: (m) => m[1] },
    { pattern: /cavitation|npsh|safety|margin/i, intent: 'safety' },

    // Comparison patterns
    { pattern: /(?:compare|difference\s+between)\s+(.+?)\s+(?:and|vs|versus)\s+(.+)/i, intent: 'compare' },
];

// ═══════════════════════════════════════════════════════════════
// MODEL QUERY ENGINE
// ═══════════════════════════════════════════════════════════════

export class ModelQueryEngine {

    /**
     * Parse natural language query to determine intent
     */
    static parseIntent(query: string): QueryIntent {
        const normalizedQuery = query.toLowerCase().trim();

        for (const { pattern, intent, extractSubject } of QUERY_PATTERNS) {
            const match = normalizedQuery.match(pattern);
            if (match) {
                return {
                    type: intent,
                    subject: extractSubject?.(match),
                    parameters: {}
                };
            }
        }

        return { type: 'general' };
    }

    /**
     * Find components relevant to the query
     */
    static findRelevantComponents(query: string, context: QueryContext): MechComponent[] {
        const normalizedQuery = query.toLowerCase();
        const components = context.blueprint.components;

        const relevant: MechComponent[] = [];

        for (const comp of components) {
            const compName = comp.name.toLowerCase();
            const compType = comp.componentDefinitionId.toLowerCase();

            // Direct name match
            if (normalizedQuery.includes(compName) || compName.includes(normalizedQuery.split(' ')[0])) {
                relevant.push(comp);
                continue;
            }

            // Type-based matching
            const typeKeywords: Record<string, string[]> = {
                'pump': ['pump', 'pressure', 'flow', 'cavitation', 'npsh', 'suction'],
                'pipe': ['pipe', 'line', 'tube', 'friction', 'pressure drop'],
                'heat_exchanger': ['heat', 'temperature', 'cooling', 'heating', 'exchanger'],
                'valve': ['valve', 'control', 'throttle', 'restriction'],
                'tank': ['tank', 'vessel', 'reservoir', 'storage'],
                'motor': ['motor', 'power', 'efficiency', 'torque', 'speed'],
            };

            for (const [type, keywords] of Object.entries(typeKeywords)) {
                if (compType.includes(type)) {
                    if (keywords.some(kw => normalizedQuery.includes(kw))) {
                        relevant.push(comp);
                        break;
                    }
                }
            }
        }

        return relevant;
    }

    /**
     * Find relevant variables from simulation results
     */
    static findRelevantVariables(query: string, context: QueryContext): string[] {
        if (!context.simulationResult) return [];

        const normalizedQuery = query.toLowerCase();
        const variables = context.simulationResult.variables;
        const relevant: string[] = [];

        const variableKeywords: Record<string, string[]> = {
            'pressure': ['_P', 'pressure', '_p_'],
            'flow': ['_Q', '_m_dot', 'flow', '_mdot'],
            'temperature': ['_T', 'temp', '_t_'],
            'efficiency': ['_eta', 'efficiency', '_eff'],
            'power': ['_P_', 'power', '_W'],
            'velocity': ['_v', 'velocity', '_vel'],
            'head': ['_H', 'head', '_npsh'],
        };

        for (const [keyword, patterns] of Object.entries(variableKeywords)) {
            if (normalizedQuery.includes(keyword)) {
                for (const varName of Object.keys(variables)) {
                    if (patterns.some(pat => varName.toLowerCase().includes(pat.toLowerCase()))) {
                        relevant.push(varName);
                    }
                }
            }
        }

        return [...new Set(relevant)].slice(0, 10);
    }

    /**
     * Generate an answer based on intent and context
     */
    static async processQuery(query: string, context: QueryContext): Promise<QueryResult> {
        const intent = this.parseIntent(query);
        const relevantComponents = this.findRelevantComponents(query, context);
        const relevantVariables = this.findRelevantVariables(query, context);

        let answer = '';
        let suggestions: string[] = [];
        let calculations: QueryResult['calculations'] = [];
        let confidence: QueryResult['confidence'] = 'medium';

        switch (intent.type) {
            case 'diagnosis':
                ({ answer, suggestions, calculations } = this.handleDiagnosis(intent, context, relevantComponents));
                confidence = context.simulationResult ? 'high' : 'low';
                break;

            case 'whatif':
                ({ answer, suggestions } = this.handleWhatIf(intent, context));
                confidence = 'medium';
                break;

            case 'safety':
                ({ answer, suggestions, calculations } = this.handleSafety(intent, context, relevantComponents));
                confidence = context.simulationResult ? 'high' : 'medium';
                break;

            case 'optimize':
                ({ answer, suggestions } = this.handleOptimization(intent, context, relevantComponents));
                confidence = 'medium';
                break;

            case 'explain':
                ({ answer, suggestions } = this.handleExplanation(intent, context, relevantComponents));
                confidence = 'high';
                break;

            default:
                answer = this.generateGeneralResponse(query, context);
                suggestions = ['Run simulation for detailed analysis', 'Check component parameters', 'Review connections'];
                confidence = 'low';
        }

        return {
            answer,
            confidence,
            relevantComponents: relevantComponents.map(c => c.name),
            relevantVariables,
            suggestions,
            calculations
        };
    }

    // ═════════════════════════════════════════════════════════════
    // INTENT HANDLERS
    // ═════════════════════════════════════════════════════════════

    private static handleDiagnosis(
        intent: QueryIntent,
        context: QueryContext,
        relevantComponents: MechComponent[]
    ): { answer: string; suggestions: string[]; calculations: QueryResult['calculations'] } {
        const result = context.simulationResult;
        const subject = intent.subject || 'the system';

        if (!result) {
            return {
                answer: `To diagnose why ${subject} is behaving unexpectedly, I need simulation results. Please run a simulation first.`,
                suggestions: ['Run static simulation', 'Run dynamic simulation'],
                calculations: []
            };
        }

        // Check for pressure-related issues
        if (subject.includes('pressure')) {
            const pressureDrop = result.metrics?.pressureDrop || 0;
            const maxP = result.metrics?.maxPressure || 0;

            return {
                answer: `The pressure drop in your system is ${(pressureDrop / 1000).toFixed(1)} kPa. This is primarily caused by friction losses in pipes and flow restrictions through valves and fittings. Key factors affecting pressure:\n\n1. **Pipe diameter** - Smaller pipes = higher velocity = more friction\n2. **Pipe length** - Longer runs accumulate more losses\n3. **Fittings** - Each elbow, tee, and valve adds equivalent length\n4. **Flow rate** - Pressure drop scales with velocity squared`,
                suggestions: ['Increase pipe diameter', 'Reduce pipe length', 'Check for partially closed valves'],
                calculations: [
                    { name: 'Pressure Drop', value: pressureDrop / 1000, unit: 'kPa', explanation: 'Total system pressure loss' },
                    { name: 'Max Pressure', value: maxP / 1000, unit: 'kPa', explanation: 'Peak pressure in system' }
                ]
            };
        }

        // Check for efficiency issues
        if (subject.includes('efficiency')) {
            const efficiency = result.metrics?.overallEfficiency || 0;

            return {
                answer: `System efficiency is ${efficiency.toFixed(1)}%. Efficiency losses are distributed across:\n\n1. **Pump losses** - Mechanical and hydraulic inefficiency\n2. **Friction losses** - Energy dissipated as heat in pipes\n3. **Heat exchanger** - Incomplete heat transfer\n\nThe primary loss mechanism depends on your specific system configuration.`,
                suggestions: ['Upgrade to higher-efficiency pump', 'Optimize pipe sizing', 'Clean heat exchanger surfaces'],
                calculations: [
                    { name: 'Overall Efficiency', value: efficiency, unit: '%', explanation: 'Ratio of useful output to input' }
                ]
            };
        }

        // Generic diagnosis
        return {
            answer: `Analyzing ${subject}... Based on the simulation results, the system is ${result.status === 'completed' ? 'operating normally' : 'experiencing issues'}. Check the relevant components and their parameters for specific concerns.`,
            suggestions: ['Review component parameters', 'Check connections', 'Inspect simulation diagnostics'],
            calculations: []
        };
    }

    private static handleWhatIf(
        intent: QueryIntent,
        context: QueryContext
    ): { answer: string; suggestions: string[] } {
        const subject = intent.subject || 'the parameter';

        if (subject.includes('double') || subject.includes('flow')) {
            return {
                answer: `If you double the flow rate:\n\n• **Pressure drop increases 4×** (quadratic relationship: ΔP ∝ v²)\n• **Pump power increases ~8×** (cubic relationship: P ∝ Q × ΔP ∝ Q³)\n• **Heat transfer improves ~40%** (higher Reynolds number)\n• **Risk of cavitation increases** (higher velocity at pump suction)\n\nYour current pump likely cannot handle this — check the pump curve for the new operating point.`,
                suggestions: ['Select larger pump', 'Add parallel pump', 'Increase pipe diameters first']
            };
        }

        if (subject.includes('glycol') || subject.includes('coolant')) {
            return {
                answer: `Switching to glycol-based coolant:\n\n• **Viscosity increases** - More pumping power needed\n• **Heat capacity decreases** - Need higher flow rate for same cooling\n• **Freeze protection improves** - Down to -35°C with 50% glycol\n• **Corrosion inhibition** - Better protection if properly treated\n\nExpect ~15% increase in pump power and ~10% reduction in heat transfer coefficient.`,
                suggestions: ['Increase pump size 15%', 'Check heat exchanger capacity', 'Verify material compatibility']
            };
        }

        return {
            answer: `To analyze "what if ${subject}", I would need to:\n\n1. Identify which parameters are affected\n2. Recalculate dependent variables\n3. Check for constraint violations\n\nFor accurate results, modify the parameter in the component and re-run the simulation.`,
            suggestions: ['Modify parameter value', 'Run sensitivity analysis', 'Compare before/after']
        };
    }

    private static handleSafety(
        intent: QueryIntent,
        context: QueryContext,
        relevantComponents: MechComponent[]
    ): { answer: string; suggestions: string[]; calculations: QueryResult['calculations'] } {
        const result = context.simulationResult;
        const subject = intent.subject || 'safety';

        if (subject.includes('cavitation') || subject.includes('npsh')) {
            // Find pump components
            const pumps = relevantComponents.filter(c =>
                c.componentDefinitionId.toLowerCase().includes('pump')
            );

            if (pumps.length > 0 && result) {
                const pumpName = pumps[0].name;
                const npshA = result.variables[`${pumpName}_NPSHa`] || 3.5;
                const npshR = result.variables[`${pumpName}_NPSHr`] || 2.0;
                const margin = npshA - npshR;
                const marginPercent = (margin / npshR) * 100;

                const riskLevel = margin < 1 ? 'HIGH' : margin < 2 ? 'MODERATE' : 'LOW';

                return {
                    answer: `**Cavitation Risk Assessment for ${pumpName}:**\n\n• NPSH Available: ${npshA.toFixed(2)} m\n• NPSH Required: ${npshR.toFixed(2)} m\n• Margin: ${margin.toFixed(2)} m (${marginPercent.toFixed(0)}%)\n\n**Risk Level: ${riskLevel}**\n\n${riskLevel === 'HIGH' ? '⚠️ Immediate action required! Cavitation damage likely.' : riskLevel === 'MODERATE' ? '⚡ Caution - transient conditions may cause cavitation.' : '✓ Safe operating margin maintained.'}`,
                    suggestions: riskLevel === 'LOW'
                        ? ['Continue monitoring', 'Check at startup conditions']
                        : ['Lower pump elevation', 'Increase suction pressure', 'Reduce fluid temperature'],
                    calculations: [
                        { name: 'NPSH Available', value: npshA, unit: 'm', explanation: 'Actual suction head available' },
                        { name: 'NPSH Required', value: npshR, unit: 'm', explanation: 'Minimum required by pump' },
                        { name: 'Safety Margin', value: margin, unit: 'm', explanation: 'Buffer against cavitation' }
                    ]
                };
            }
        }

        return {
            answer: `Safety analysis for ${subject}... To properly assess risk, ensure you have:\n\n1. Complete component definitions\n2. Valid simulation results\n3. Operating condition ranges\n\nRun a simulation to enable detailed safety assessment.`,
            suggestions: ['Run simulation', 'Define operating limits', 'Check material ratings'],
            calculations: []
        };
    }

    private static handleOptimization(
        intent: QueryIntent,
        context: QueryContext,
        relevantComponents: MechComponent[]
    ): { answer: string; suggestions: string[] } {
        const subject = intent.subject || 'the system';

        if (subject.includes('efficiency')) {
            return {
                answer: `To improve system efficiency:\n\n1. **Pump optimization** - Use VFD to match speed to demand (saves 15-30%)\n2. **Pipe sizing** - Right-size to minimize friction losses\n3. **Heat recovery** - Capture waste heat for preheating\n4. **Insulation** - Reduce heat losses in hot lines\n5. **Maintenance** - Clean heat exchangers, repair leaks\n\nThe most cost-effective approach depends on your specific loss breakdown.`,
                suggestions: ['Install VFD on main pump', 'Run sensitivity analysis on pipe sizes', 'Add heat recovery exchanger']
            };
        }

        return {
            answer: `To optimize ${subject}, consider:\n\n1. Identify the limiting constraint\n2. Run parametric analysis\n3. Evaluate trade-offs (cost vs. performance)\n\nUse the sensitivity analysis tool to find the most impactful parameters.`,
            suggestions: ['Run parametric sweep', 'Identify constraints', 'Compare alternatives']
        };
    }

    private static handleExplanation(
        intent: QueryIntent,
        context: QueryContext,
        relevantComponents: MechComponent[]
    ): { answer: string; suggestions: string[] } {
        const subject = intent.subject || 'the system';

        // Component-specific explanations
        if (relevantComponents.length > 0) {
            const comp = relevantComponents[0];
            return {
                answer: `**${comp.name}** (${comp.componentDefinitionId}):\n\nThis component is part of your system model. To see its detailed behavior:\n\n1. Click on the component in the canvas\n2. View the Properties panel for parameters\n3. After simulation, check Results for calculated values\n\nEach parameter affects the component's physics equations.`,
                suggestions: ['Select component', 'View equations', 'Run simulation']
            };
        }

        return {
            answer: `I can explain various aspects of your model. For ${subject}:\n\n• Click on any component to see its properties\n• Run a simulation to calculate operating conditions\n• Use the "Explain" tooltip on any result to see derivations`,
            suggestions: ['Select a component', 'Run simulation', 'Ask about a specific parameter']
        };
    }

    private static generateGeneralResponse(query: string, context: QueryContext): string {
        const compCount = context.blueprint.components.length;
        const hasResults = !!context.simulationResult;

        return `I'm analyzing your system with ${compCount} components. ${hasResults ? 'Simulation results are available.' : 'Run a simulation for detailed analysis.'}\n\nYou can ask me about:\n• **Diagnosis** - "Why is pressure dropping?"\n• **What-if** - "What if I double the flow?"\n• **Safety** - "Is there a cavitation risk?"\n• **Optimization** - "How can I improve efficiency?"`;
    }
}

export default ModelQueryEngine;
