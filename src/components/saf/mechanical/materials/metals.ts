/**
 * Material Database - Metals
 * Common engineering metals with properties
 */

import { MaterialSpecification } from '../types';

export const SteelMaterials: Record<string, MaterialSpecification> = {
  'AISI_1018': {
    name: 'AISI 1018 Steel',
    type: 'metal',
    designation: 'AISI 1018',
    density: 7870,
    youngsModulus: 205,
    shearModulus: 80,
    poissonsRatio: 0.29,
    yieldStrength: 370,
    ultimateStrength: 440,
    thermalConductivity: 51.9,
    specificHeat: 486
  },
  'AISI_1045': {
    name: 'AISI 1045 Steel',
    type: 'metal',
    designation: 'AISI 1045',
    density: 7850,
    youngsModulus: 206,
    shearModulus: 80,
    poissonsRatio: 0.29,
    yieldStrength: 450,
    ultimateStrength: 585,
    thermalConductivity: 49.8,
    specificHeat: 486
  },
  'AISI_4140': {
    name: 'AISI 4140 Steel',
    type: 'metal',
    designation: 'AISI 4140',
    density: 7850,
    youngsModulus: 205,
    shearModulus: 80,
    poissonsRatio: 0.29,
    yieldStrength: 415,
    ultimateStrength: 655,
    fatigueLimit: 275,
    thermalConductivity: 42,
    specificHeat: 460
  },
  'AISI_4340': {
    name: 'AISI 4340 Steel',
    type: 'metal',
    designation: 'AISI 4340',
    density: 7850,
    youngsModulus: 205,
    shearModulus: 80,
    poissonsRatio: 0.29,
    yieldStrength: 470,
    ultimateStrength: 1280,
    thermalConductivity: 44.5,
    specificHeat: 460
  },
  'AISI_6150': {
    name: 'AISI 6150 Steel',
    type: 'metal',
    designation: 'AISI 6150',
    density: 7830,
    youngsModulus: 207,
    shearModulus: 80,
    poissonsRatio: 0.29,
    yieldStrength: 520,
    ultimateStrength: 965,
    thermalConductivity: 46.6,
    specificHeat: 486
  },
  'D2_Tool_Steel': {
    name: 'D2 Tool Steel',
    type: 'metal',
    designation: 'AISI D2',
    density: 7700,
    youngsModulus: 210,
    shearModulus: 81,
    poissonsRatio: 0.29,
    yieldStrength: 1700,
    ultimateStrength: 1900,
    thermalConductivity: 24,
    specificHeat: 460
  },
  'H13_Tool_Steel': {
    name: 'H13 Tool Steel',
    type: 'metal',
    designation: 'AISI H13',
    density: 7800,
    youngsModulus: 210,
    shearModulus: 81,
    poissonsRatio: 0.29,
    yieldStrength: 1600,
    ultimateStrength: 1800,
    thermalConductivity: 25,
    specificHeat: 460
  },
  'Cast_Iron_40': {
    name: 'Gray Cast Iron 40',
    type: 'metal',
    designation: 'ASTM A48 Class 40',
    density: 7200,
    youngsModulus: 110,
    shearModulus: 44,
    poissonsRatio: 0.26,
    yieldStrength: 280,
    ultimateStrength: 290,
    thermalConductivity: 55,
    specificHeat: 460
  },
  'Cast_Iron_60': {
    name: 'Gray Cast Iron 60',
    type: 'metal',
    designation: 'ASTM A48 Class 60',
    density: 7300,
    youngsModulus: 130,
    shearModulus: 52,
    poissonsRatio: 0.26,
    yieldStrength: 310,
    ultimateStrength: 415,
    thermalConductivity: 50,
    specificHeat: 460
  },
  'Ductile_Iron_65': {
    name: 'Ductile Iron 65-45-12',
    type: 'metal',
    designation: 'ASTM A536 65-45-12',
    density: 7100,
    youngsModulus: 169,
    shearModulus: 67,
    poissonsRatio: 0.28,
    yieldStrength: 310,
    ultimateStrength: 448,
    thermalConductivity: 36,
    specificHeat: 460
  }
};

export const AluminumMaterials: Record<string, MaterialSpecification> = {
  'Al_6061_T6': {
    name: 'Aluminum 6061-T6',
    type: 'metal',
    designation: 'AA 6061-T6',
    density: 2700,
    youngsModulus: 68.9,
    shearModulus: 26,
    poissonsRatio: 0.33,
    yieldStrength: 276,
    ultimateStrength: 310,
    thermalConductivity: 167,
    specificHeat: 896
  },
  'Al_7075_T6': {
    name: 'Aluminum 7075-T6',
    type: 'metal',
    designation: 'AA 7075-T6',
    density: 2810,
    youngsModulus: 71.7,
    shearModulus: 26.9,
    poissonsRatio: 0.33,
    yieldStrength: 503,
    ultimateStrength: 572,
    thermalConductivity: 130,
    specificHeat: 960
  },
  'Al_2024_T3': {
    name: 'Aluminum 2024-T3',
    type: 'metal',
    designation: 'AA 2024-T3',
    density: 2780,
    youngsModulus: 72.4,
    shearModulus: 27.5,
    poissonsRatio: 0.32,
    yieldStrength: 345,
    ultimateStrength: 483,
    thermalConductivity: 121,
    specificHeat: 875
  },
  'Al_5052_H32': {
    name: 'Aluminum 5052-H32',
    type: 'metal',
    designation: 'AA 5052-H32',
    density: 2680,
    youngsModulus: 70.3,
    shearModulus: 26.5,
    poissonsRatio: 0.33,
    yieldStrength: 214,
    ultimateStrength: 262,
    thermalConductivity: 138,
    specificHeat: 964
  },
  'Al_356_T6': {
    name: 'Aluminum 356-T6',
    type: 'metal',
    designation: 'AA 356-T6',
    density: 2660,
    youngsModulus: 72.4,
    shearModulus: 27,
    poissonsRatio: 0.33,
    yieldStrength: 207,
    ultimateStrength: 276,
    thermalConductivity: 151,
    specificHeat: 963
  }
};

export const CopperMaterials: Record<string, MaterialSpecification> = {
  'C110_Electrolytic': {
    name: 'C110 Electrolytic Tough Pitch Copper',
    type: 'metal',
    designation: 'ASTM C110',
    density: 8890,
    youngsModulus: 117,
    shearModulus: 44,
    poissonsRatio: 0.33,
    yieldStrength: 70,
    ultimateStrength: 220,
    thermalConductivity: 391,
    specificHeat: 385
  },
  'C145_Tellurium': {
    name: 'C145 Tellurium Copper',
    type: 'metal',
    designation: 'ASTM C145',
    density: 8900,
    youngsModulus: 120,
    shearModulus: 45,
    poissonsRatio: 0.33,
    yieldStrength: 280,
    ultimateStrength: 380,
    thermalConductivity: 340,
    specificHeat: 385
  },
  'C172_Beryllium': {
    name: 'C172 Beryllium Copper',
    type: 'metal',
    designation: 'ASTM C172',
    density: 8250,
    youngsModulus: 128,
    shearModulus: 48,
    poissonsRatio: 0.33,
    yieldStrength: 1100,
    ultimateStrength: 1280,
    thermalConductivity: 105,
    specificHeat: 420
  },
  'C360_Free_Cutting': {
    name: 'C360 Free Cutting Brass',
    type: 'metal',
    designation: 'ASTM C360',
    density: 8500,
    youngsModulus: 97,
    shearModulus: 37,
    poissonsRatio: 0.31,
    yieldStrength: 140,
    ultimateStrength: 380,
    thermalConductivity: 115,
    specificHeat: 380
  }
};

export const TitaniumMaterials: Record<string, MaterialSpecification> = {
  'Ti_6Al_4V': {
    name: 'Titanium Ti-6Al-4V',
    type: 'metal',
    designation: 'ASTM B265 Grade 5',
    density: 4430,
    youngsModulus: 113.8,
    shearModulus: 44,
    poissonsRatio: 0.29,
    yieldStrength: 880,
    ultimateStrength: 950,
    thermalConductivity: 6.7,
    specificHeat: 526
  },
  'Ti_3Al_2.5V': {
    name: 'Titanium Ti-3Al-2.5V',
    type: 'metal',
    designation: 'ASTM B265 Grade 9',
    density: 4470,
    youngsModulus: 103,
    shearModulus: 40,
    poissonsRatio: 0.29,
    yieldStrength: 760,
    ultimateStrength: 960,
    thermalConductivity: 8.3,
    specificHeat: 520
  },
  'Ti_Grade_2': {
    name: 'Titanium Grade 2 (Commercially Pure)',
    type: 'metal',
    designation: 'ASTM B265 Grade 2',
    density: 4510,
    youngsModulus: 105,
    shearModulus: 40,
    poissonsRatio: 0.29,
    yieldStrength: 345,
    ultimateStrength: 480,
    thermalConductivity: 16,
    specificHeat: 520
  }
};

export const AllMetals: Record<string, MaterialSpecification> = {
  ...SteelMaterials,
  ...AluminumMaterials,
  ...CopperMaterials,
  ...TitaniumMaterials
};

export function getMaterialByDesignation(designation: string): MaterialSpecification | null {
  return AllMetals[designation] || null;
}

export function getMaterialsByType(type: string): Record<string, MaterialSpecification> {
  const materials: Record<string, MaterialSpecification> = {};
  for (const [key, mat] of Object.entries(AllMetals)) {
    if (mat.type === type) {
      materials[key] = mat;
    }
  }
  return materials;
}

export function searchMaterials(query: string): MaterialSpecification[] {
  const lowerQuery = query.toLowerCase();
  const results: MaterialSpecification[] = [];
  for (const mat of Object.values(AllMetals)) {
    if (mat.name.toLowerCase().includes(lowerQuery) ||
        mat.designation?.toLowerCase().includes(lowerQuery)) {
      results.push(mat);
    }
  }
  return results;
}

export default AllMetals;
