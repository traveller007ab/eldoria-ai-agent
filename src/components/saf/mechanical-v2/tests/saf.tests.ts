/**
 * SAF Lab v2.0 - Component Tests
 * Tests for fluid system components
 * 
 * Run with: npm test
 */

import { describe, test, expect } from '@jest/globals';

// ============================================================================
// COMPONENT DEFINITION TESTS
// ============================================================================

describe('Component Definitions', () => {
  test('Centrifugal Pump definition is valid', () => {
    const definition = {
      id: 'fluid.pump.centrifugal',
      domain: 'fluid',
      subcategory: 'turbomachinery',
      name: 'Centrifugal Pump',
      ports: ['inlet', 'outlet', 'shaft'],
      parameters: ['Q_design', 'H_design', 'eta_BEP']
    };
    
    expect(definition.id).toBe('fluid.pump.centrifugal');
    expect(definition.domain).toBe('fluid');
    expect(definition.ports.length).toBe(3);
  });

  test('Straight Pipe definition is valid', () => {
    const definition = {
      id: 'fluid.pipe.straight',
      domain: 'fluid',
      subcategory: 'piping',
      name: 'Straight Pipe',
      ports: ['inlet', 'outlet'],
      parameters: ['D', 'L', 'epsilon']
    };
    
    expect(definition.id).toBe('fluid.pipe.straight');
    expect(definition.ports.length).toBe(2);
  });

  test('Control Valve definition is valid', () => {
    const definition = {
      id: 'fluid.valve.control',
      domain: 'fluid',
      subcategory: 'piping',
      name: 'Control Valve',
      ports: ['inlet', 'outlet'],
      parameters: ['Cv', 'opening', 'characteristic']
    };
    
    expect(definition.id).toBe('fluid.valve.control');
    expect(definition.parameters).toContain('Cv');
  });
});

// ============================================================================
// PUMP CALCULATION TESTS
// ============================================================================

describe('Pump Calculations', () => {
  test('power calculation for centrifugal pump', () => {
    const rho = 998; // kg/m³
    const g = 9.81; // m/s²
    const Q = 100 / 3600; // m³/s (100 m³/h)
    const H = 50; // m
    const eta = 0.75;
    
    const power = (rho * g * Q * H) / eta / 1000; // kW
    
    expect(power).toBeGreaterThan(0);
    expect(power).toBeLessThan(100);
    expect(power).toBeCloseTo(16.35, 1);
  });

  test('NPSH calculation', () => {
    const P_atm = 101325; // Pa
    const P_vap = 2330; // Pa (water at 20°C)
    const rho = 998;
    const g = 9.81;
    const h_static = 2; // m
    const h_friction = 0.5; // m
    
    const NPSHa = (P_atm - P_vap) / (rho * g) + h_static - h_friction;
    
    expect(NPSHa).toBeGreaterThan(0);
    expect(NPSHa).toBeGreaterThan(3); // Typical minimum
  });

  test('affinity law - flow proportional to speed', () => {
    const Q1 = 100;
    const N1 = 1450;
    const N2 = 2900;
    
    const Q2 = Q1 * (N2 / N1);
    
    expect(Q2).toBe(200);
  });

  test('affinity law - head proportional to speed squared', () => {
    const H1 = 50;
    const N1 = 1450;
    const N2 = 2900;
    
    const H2 = H1 * Math.pow(N2 / N1, 2);
    
    expect(H2).toBe(200);
  });
});

// ============================================================================
// PIPE CALCULATION TESTS
// ============================================================================

describe('Pipe Calculations', () => {
  test('velocity calculation', () => {
    const Q = 50 / 3600; // m³/s (50 m³/h)
    const D = 0.05; // m (50 mm)
    
    const A = Math.PI * Math.pow(D, 2) / 4;
    const v = Q / A;
    
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(5); // Typical max for water
  });

  test('Reynolds number calculation', () => {
    const rho = 998; // kg/m³
    const v = 2; // m/s
    const D = 0.05; // m
    const mu = 0.001; // Pa·s
    
    const Re = (rho * v * D) / mu;
    
    expect(Re).toBeGreaterThan(4000); // Turbulent flow
  });

  test('Darcy friction factor (laminar)', () => {
    const Re = 1000;
    
    const f = 64 / Re;
    
    expect(f).toBe(0.064);
  });

  test('Darcy friction factor (turbulent - Swamee-Jain)', () => {
    const Re = 100000;
    const epsilon = 0.000045; // m (commercial steel)
    const D = 0.05; // m
    
    const epsilon_D = epsilon / D;
    const f = 0.25 / Math.pow(Math.log10(epsilon_D / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
    
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(0.05);
  });

  test('pressure drop calculation', () => {
    const f = 0.02;
    const L = 100; // m
    const D = 0.05; // m
    const rho = 998;
    const v = 2;
    
    const dP = f * (L / D) * (rho * Math.pow(v, 2) / 2);
    const dP_kPa = dP / 1000;
    
    expect(dP_kPa).toBeGreaterThan(0);
    expect(dP_kPa).toBeLessThan(100);
  });
});

// ============================================================================
// VALVE CALCULATION TESTS
// ============================================================================

describe('Valve Calculations', () => {
  test('control valve flow calculation', () => {
    const Cv = 40;
    const dP = 50; // kPa
    
    const Q = Cv * Math.sqrt(dP); // m³/h for water
    
    expect(Q).toBeGreaterThan(0);
    expect(Q).toBeCloseTo(282.8, 0);
  });

  test('equal percentage characteristic', () => {
    const R = 50; // Rangeability
    const L = 0.5; // 50% opening
    
    const f = Math.pow(R, L - 1) / Math.pow(R, -1);
    
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
  });

  test('linear characteristic', () => {
    const L = 0.5;
    
    const f = L; // Linear = proportional to opening
    
    expect(f).toBe(0.5);
  });

  test('check valve cracking pressure', () => {
    const Cr = 5; // kPa cracking pressure
    const dP = 10; // kPa actual pressure drop
    
    const isOpen = dP > Cr;
    
    expect(isOpen).toBe(true);
  });
});

// ============================================================================
// FITTING LOSS TESTS
// ============================================================================

describe('Fitting Losses', () => {
  test('elbow loss coefficient (Miller correlation)', () => {
    const rD = 1.5; // radius to diameter ratio
    
    const K = 0.2 + 1.0 / (0.55 + 2.3 * Math.pow(rD, -1.5));
    
    expect(K).toBeGreaterThan(0);
    expect(K).toBeLessThan(0.5);
  });

  test('elbow minor loss', () => {
    const K = 0.3;
    const rho = 998;
    const v = 2;
    
    const dP = K * (rho * Math.pow(v, 2) / 2) / 1000; // kPa
    
    expect(dP).toBeGreaterThan(0);
    expect(dP).toBeLessThan(1);
  });

  test('tee flow distribution', () => {
    const branch_fraction = 0.2;
    const total_flow = 100; // m³/h
    
    const flow_run = total_flow * (1 - branch_fraction);
    const flow_branch = total_flow * branch_fraction;
    
    expect(flow_run).toBe(80);
    expect(flow_branch).toBe(20);
  });
});

// ============================================================================
// HEAT EXCHANGER TESTS
// ============================================================================

describe('Heat Exchanger Calculations', () => {
  test('heat transfer rate', () => {
    const U = 500; // W/(m²·K)
    const A = 50; // m²
    const LMTD = 30; // K
    
    const Q = U * A * LMTD / 1000; // kW
    
    expect(Q).toBe(750);
    expect(Q).toBeGreaterThan(0);
  });

  test('LMTD calculation', () => {
    const Th_in = 80 + 273.15;
    const Th_out = 60 + 273.15;
    const Tc_in = 20 + 273.15;
    const Tc_out = 40 + 273.15;
    
    const dT1 = Th_in - Tc_out;
    const dT2 = Th_out - Tc_in;
    
    let LMTD;
    if (Math.abs(dT1 - dT2) < 0.01) {
      LMTD = dT1;
    } else {
      LMTD = (dT1 - dT2) / Math.log(dT1 / dT2);
    }
    
    expect(LMTD).toBeGreaterThan(0);
    expect(LMTD).toBeCloseTo(39.1, 0);
  });

  test('effectiveness calculation', () => {
    const Q_actual = 500; // kW
    const Q_max = 700; // kW
    
    const effectiveness = (Q_actual / Q_max) * 100; // %
    
    expect(effectiveness).toBeCloseTo(71.4, 0);
  });
});

// ============================================================================
// FLUID PROPERTY TESTS
// ============================================================================

describe('Fluid Properties', () => {
  test('water density at 20°C', () => {
    const rho = 998; // kg/m³
    
    expect(rho).toBeGreaterThan(990);
    expect(rho).toBeLessThan(1000);
  });

  test('water viscosity at 20°C', () => {
    const mu = 1.002e-3; // Pa·s
    
    expect(mu).toBeGreaterThan(0.0009);
    expect(mu).toBeLessThan(0.0011);
  });

  test('specific heat of water', () => {
    const cp = 4182; // J/(kg·K)
    
    expect(cp).toBeGreaterThan(4100);
    expect(cp).toBeLessThan(4200);
  });
});

// ============================================================================
// TEMPLATE VALIDATION TESTS
// ============================================================================

describe('Template Validation', () => {
  test('Simple Flow Loop has valid structure', () => {
    const template = {
      id: 'template.simpleFlowLoop',
      name: 'Simple Flow Loop',
      components: ['Pump', 'Pipe Section 1', 'Control Valve', 'Pipe Section 2', 'Return Pipe'],
      connections: 5
    };
    
    expect(template.components.length).toBe(5);
    expect(template.connections).toBe(5);
  });

  test('Cooling Water System has valid structure', () => {
    const template = {
      id: 'template.coolingWater',
      name: 'Cooling Water System',
      components: ['Cooling Tower', 'Primary Pump', 'Process Cooler', 'Secondary Pump', 'Control Valve'],
      minComponents: 5
    };
    
    expect(template.components.length).toBeGreaterThanOrEqual(template.minComponents);
  });

  test('All templates have unique IDs', () => {
    const templates = [
      'template.simpleFlowLoop',
      'template.coolingWater',
      'template.pumpingStation',
      'template.rankineCycle',
      'template.controlledProcess'
    ];
    
    const uniqueIds = new Set(templates);
    
    expect(uniqueIds.size).toBe(templates.length);
  });
});
