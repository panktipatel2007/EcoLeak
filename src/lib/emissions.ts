/**
 * EcoLeak Emission Calculation Engine & Automatic Data Parser
 *
 * Implements:
 * 1. Intelligent CSV/TXT/TSV parsing with unit cleaning and missing-value fallbacks
 * 2. Automatic category detection (electricity, diesel/fuels, materials, transport, waste, etc.)
 * 3. Standard GHG Protocol / EPA / DEFRA emission factors
 * 4. Normalization across energy, mass, volume, and distance units
 * 5. Monthly/period grouping if date timestamps exist
 * 6. Top carbon leak identification and mitigation guidance
 */

export type EmissionCategory =
  | 'Electricity & Power'
  | 'Fuels & Combustion'
  | 'Raw Materials'
  | 'Transport & Logistics'
  | 'Water & Waste'
  | 'Other Operations'

export type EmissionScope = 'Scope 1' | 'Scope 2' | 'Scope 3'

export interface ParsedRecord {
  id: string
  rowNumber: number
  rawText: string
  itemName: string
  rawQuantity: string
  rawUnit: string
  parsedQuantity: number
  normalizedQuantity: number
  normalizedUnit: string
  category: EmissionCategory
  scope: EmissionScope
  emissionFactor: number // kg CO2e per normalized unit
  factorSource: string
  emissionsKg: number
  emissionsTonnes: number
  date?: string
  status: 'valid' | 'unit_normalized' | 'inferred' | 'warning'
  statusNote?: string
}

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface CircularRecommendation {
  reduction_percentage: number
  target_source: string
  alternative_name: string
  action: string
  potential_co2e_savings: number
  co_benefits: string
}

export interface EmissionSource {
  name: string
  category: EmissionCategory
  scope: EmissionScope
  quantity: number
  unit: string
  emissions: number // in current display unit
  emissionsKg: number
  percentage: number
  factor: number
  factorUnit: string
  severity?: SeverityLevel
  explanation?: string
  cumulative_percentage?: number
}

export interface CategoryBreakdown {
  category: EmissionCategory
  emissions: number
  emissionsKg: number
  percentage: number
  count: number
  scope: EmissionScope
  color: string
}

export interface MonthlyBreakdown {
  period: string
  emissions: number
  emissionsKg: number
  sourcesCount: number
}

export interface TopLeak {
  name: string
  category: EmissionCategory
  scope: EmissionScope
  emissions: number
  percentage: number
  severity?: SeverityLevel
  explanation?: string
  recommendation: string
  alternativeAction: string
}

export interface ParetoAnalysis {
  sources_to_80_percent: number
  pareto_percentage: number
}

export interface EmissionsResult {
  total_emissions: number
  total_emissions_kg: number
  unit: string
  breakdown: EmissionSource[]
  categories: CategoryBreakdown[]
  monthly: MonthlyBreakdown[]
  hasDates: boolean
  top_leak: TopLeak
  pareto?: ParetoAnalysis
  records: ParsedRecord[]
  validRecordsCount: number
  totalRowsCount: number
  warnings: string[]
  equivalencies: {
    treesPerYear: number
    carKilometers: number
    homesAnnualEnergy: number
  }
}

/**
 * Phase 2 Severity Thresholds Configuration
 * LOW: < 10%
 * MEDIUM: 10% - 25%
 * HIGH: 25% - 50%
 * CRITICAL: > 50%
 */
export const SEVERITY_THRESHOLDS = {
  CRITICAL: 50.0,
  HIGH: 25.0,
  MEDIUM: 10.0,
  LOW: 0.0,
} as const

export function classifySeverity(percentage: number): SeverityLevel {
  if (percentage > SEVERITY_THRESHOLDS.CRITICAL) {
    return 'CRITICAL'
  }
  if (percentage >= SEVERITY_THRESHOLDS.HIGH) {
    return 'HIGH'
  }
  if (percentage >= SEVERITY_THRESHOLDS.MEDIUM) {
    return 'MEDIUM'
  }
  return 'LOW'
}

export function generateHotspotExplanation(
  name: string,
  percentage: number,
  rank: number,
  totalSources: number,
  severity: SeverityLevel,
): string {
  if (totalSources === 0 || percentage === 0) {
    return `${name} contributes 0% of recorded emissions in this dataset.`
  }
  if (totalSources === 1) {
    return `${name} contributes 100% of recorded emissions, making it the sole emission source in this dataset.`
  }
  if (rank === 1) {
    return `${name} contributes ${percentage}% of recorded emissions, making it the largest emission hotspot in this dataset.`
  }
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return `${name} contributes ${percentage}% of recorded emissions, representing a high-impact hotspot in this dataset.`
  }
  if (severity === 'MEDIUM') {
    return `${name} contributes ${percentage}% of recorded emissions, representing a moderate emission source.`
  }
  return `${name} contributes ${percentage}% of recorded emissions, representing a minor emission source.`
}

export const ACCEPTED_EXTENSIONS = ['.csv', '.txt', '.tsv'] as const

/**
 * Standard Emission Factors (kg CO2e per normalized base unit)
 * Grounded in GHG Protocol, US EPA Emission Factors Hub, and UK DEFRA.
 */
interface FactorDef {
  category: EmissionCategory
  scope: EmissionScope
  baseUnit: string
  factor: number // kg CO2e per baseUnit
  source: string
  keywords: string[]
  mitigation: {
    recommendation: string
    alternative: string
  }
}

const EMISSION_FACTORS: FactorDef[] = [
  // 1. Electricity & Power (Scope 2)
  {
    category: 'Electricity & Power',
    scope: 'Scope 2',
    baseUnit: 'kWh',
    factor: 0.417, // US/Global average industrial grid
    source: 'EPA eGRID / GHG Protocol Scope 2',
    keywords: ['electricity', 'grid', 'power', 'kwh', 'mwh', 'substation', 'lighting', 'utility power'],
    mitigation: {
      recommendation: 'Procure on-site solar PPA or install variable frequency drives (VFDs) on heavy industrial motors.',
      alternative: 'Switch to certified renewable energy tariffs (REC / Green Power contracts).',
    },
  },
  {
    category: 'Electricity & Power',
    scope: 'Scope 2',
    baseUnit: 'kWh',
    factor: 0.02,
    source: 'NREL Life Cycle Assessment (Solar/Wind)',
    keywords: ['solar', 'wind', 'renewable electricity', 'green power', 'hydro power'],
    mitigation: {
      recommendation: 'Maintain optimal inverter efficiency and panel cleaning schedules.',
      alternative: 'Expand energy storage batteries to buffer peak solar yield.',
    },
  },

  // 2. Fuels & Thermal Combustion (Scope 1)
  {
    category: 'Fuels & Combustion',
    scope: 'Scope 1',
    baseUnit: 'L',
    factor: 2.68, // kg CO2e / liter
    source: 'UK DEFRA / EPA GHG Factors for Diesel',
    keywords: ['diesel', 'hsd', 'gas oil', 'fleet diesel', 'backup diesel', 'diesel fuel', 'generator fuel'],
    mitigation: {
      recommendation: 'Electrify internal yard forklifts & switch backup generators to HVO (Hydrotreated Vegetable Oil) biofuel.',
      alternative: 'Optimize generator maintenance cycles and idle shut-off protocols.',
    },
  },
  {
    category: 'Fuels & Combustion',
    scope: 'Scope 1',
    baseUnit: 'L',
    factor: 2.31,
    source: 'EPA GHG Factors (Gasoline / Petrol)',
    keywords: ['petrol', 'gasoline', 'motor spirit', 'fleet petrol'],
    mitigation: {
      recommendation: 'Transition company fleet to battery electric vehicles (BEVs).',
      alternative: 'Institute route optimization and eco-driving programs.',
    },
  },
  {
    category: 'Fuels & Combustion',
    scope: 'Scope 1',
    baseUnit: 'm3',
    factor: 2.03, // kg CO2e / m3
    source: 'EPA GHG Hub (Natural Gas)',
    keywords: ['natural gas', 'cng', 'piped gas', 'methane', 'boiler gas', 'gas furnace'],
    mitigation: {
      recommendation: 'Recover waste heat from boiler flues and upgrade burner insulation to cut gas consumption by 25%.',
      alternative: 'Evaluate industrial heat pumps for process water heating up to 90°C.',
    },
  },
  {
    category: 'Fuels & Combustion',
    scope: 'Scope 1',
    baseUnit: 'L',
    factor: 1.51,
    source: 'DEFRA (LPG/Propane)',
    keywords: ['lpg', 'propane', 'butane', 'bottled gas'],
    mitigation: {
      recommendation: 'Audit pipe joints for thermal loss and upgrade burner air-fuel ratio controllers.',
      alternative: 'Replace LPG heaters with electric induction or infrared radiant heaters.',
    },
  },
  {
    category: 'Fuels & Combustion',
    scope: 'Scope 1',
    baseUnit: 'kg',
    factor: 2.42,
    source: 'IPCC Industrial Coal Combustion',
    keywords: ['coal', 'bituminous', 'anthracite', 'lignite', 'coke'],
    mitigation: {
      recommendation: 'Phase out coal boiler for biomass pellet or electric steam generation.',
      alternative: 'Install economizers and oxygen trim controls to maximize combustion efficiency.',
    },
  },
  {
    category: 'Fuels & Combustion',
    scope: 'Scope 1',
    baseUnit: 'L',
    factor: 3.15,
    source: 'DEFRA Heavy Fuel Oil',
    keywords: ['heavy fuel oil', 'hfo', 'furnace oil', 'bunker fuel', 'residual oil'],
    mitigation: {
      recommendation: 'High priority carbon hazard: retrofit burner to dual-fuel natural gas or electric induction.',
      alternative: 'Preheat fuel with waste heat exchangers to reduce burner load.',
    },
  },

  // 3. Raw Materials (Scope 3)
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 3.10, // kg CO2e / kg
    source: 'PlasticsEurope LCA (Virgin Polymer)',
    keywords: ['virgin plastic', 'plastic', 'pet resin', 'hdpe', 'ldpe', 'polypropylene', 'pp pellets', 'polystyrene', 'polymer', 'pvc'],
    mitigation: {
      recommendation: 'Blend in 30-50% post-consumer recycled (PCR) resin to immediately slash resin footprint by ~60%.',
      alternative: 'Redesign mould geometries for lightweighting and minimal runner scrap.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 1.10,
    source: 'PlasticsEurope LCA (Recycled Resin)',
    keywords: ['recycled plastic', 'rpet', 'rhdpe', 'pcr plastic', 'regrind'],
    mitigation: {
      recommendation: 'Optimize closed-loop regrind regranulation in internal factory trim loops.',
      alternative: 'Source locally collected mono-material feedstock to minimize transport emissions.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 1.85,
    source: 'World Steel Association (Blast Furnace BOF)',
    keywords: ['virgin steel', 'steel sheet', 'carbon steel', 'hot rolled steel', 'steel rod', 'steel coil', 'raw steel', 'iron'],
    mitigation: {
      recommendation: 'Request supplier Environmental Product Declarations (EPDs) and shift orders to Electric Arc Furnace (EAF) steel.',
      alternative: 'Optimize nesting patterns on laser/punch cutters to reduce sheet offcut scrap below 5%.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 0.45,
    source: 'World Steel Association (Recycled EAF)',
    keywords: ['recycled steel', 'scrap steel', 'eaf steel', 'secondary steel'],
    mitigation: {
      recommendation: 'Maintain strict alloy segregation in factory offcut collection bins.',
      alternative: 'Negotiate closed-loop buyback contracts with scrap mill recyclers.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 11.5,
    source: 'International Aluminium Institute (Primary)',
    keywords: ['aluminium', 'aluminum', 'virgin aluminium', 'bauxite', 'primary aluminium', 'alu ingot', 'alu sheet'],
    mitigation: {
      recommendation: 'Primary aluminium is carbon-intensive: switch to recycled secondary aluminium (yields 95% lower emissions).',
      alternative: 'Source exclusively from smelters powered by dedicated hydroelectricity.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 0.82,
    source: 'IAI Recycled Aluminium',
    keywords: ['recycled aluminium', 'recycled aluminum', 'secondary aluminium', 'alu scrap'],
    mitigation: {
      recommendation: 'Expand closed-loop machining swarf compaction and briquetting for remelting.',
      alternative: 'Standardize alloys to avoid downcycling high-grade structural grades.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 0.89,
    source: 'Cembureau / EPA (Portland Cement)',
    keywords: ['cement', 'clinker', 'concrete', 'portland cement', 'mortar'],
    mitigation: {
      recommendation: 'Substitute 30-40% ordinary Portland cement with fly ash, GGBS slag, or calcined clay.',
      alternative: 'Incorporate chemical plasticizers to reduce cement-water binder ratio.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 0.75,
    source: 'FEFCO LCA (Corrugated Board)',
    keywords: ['cardboard', 'carton', 'paper', 'corrugated box', 'packaging box', 'kraft paper'],
    mitigation: {
      recommendation: 'Switch to 100% recycled unbleached kraft board and right-size shipping cartons.',
      alternative: 'Implement reusable collapsible plastic totes for B2B supplier loops.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 2.50,
    source: 'EcoInvent (Industrial Chemicals & Resins)',
    keywords: ['chemicals', 'solvent', 'adhesive', 'resin', 'paint', 'epoxy', 'coating', 'lubricant'],
    mitigation: {
      recommendation: 'Switch to bio-based waterborne coatings or low-VOC hot melt adhesives.',
      alternative: 'Install automated solvent recovery distillation stills in parts cleaning bays.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 8.50,
    source: 'Higg Index / Textile LCA (Raw Cotton)',
    keywords: ['cotton', 'fabric', 'yarn', 'textile', 'denim', 'wool'],
    mitigation: {
      recommendation: 'Transition to certified organic or regenerative cotton and waterless cold-pad batch dyeing.',
      alternative: 'Recycle pre-consumer cutting fabric scrap into recycled blended yarns.',
    },
  },
  {
    category: 'Raw Materials',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 5.50,
    source: 'Higg Index (Polyester Filament)',
    keywords: ['polyester', 'synthetic fabric', 'nylon', 'acrylic yarn'],
    mitigation: {
      recommendation: 'Replace virgin polyester with post-consumer rPET recycled yarn.',
      alternative: 'Eliminate over-dyeing cycles with solution-dyed filaments.',
    },
  },

  // 4. Transport & Logistics (Scope 3)
  {
    category: 'Transport & Logistics',
    scope: 'Scope 3',
    baseUnit: 'tkm',
    factor: 0.105, // kg CO2e per tonne-km
    source: 'GLEC Framework / DEFRA (Freight Truck)',
    keywords: ['truck', 'road freight', 'transport', 'shipping', 'delivery', 'hauling', 'freight', 'logistics', 'tkm', 'trucking'],
    mitigation: {
      recommendation: 'Consolidate freight to achieve >85% container cubing and mandate Euro VI / electric drayage fleets.',
      alternative: 'Shift long-haul routes exceeding 500 km to intermodal rail freight.',
    },
  },
  {
    category: 'Transport & Logistics',
    scope: 'Scope 3',
    baseUnit: 'tkm',
    factor: 1.15,
    source: 'ICAO / DEFRA (Air Cargo Freight)',
    keywords: ['air freight', 'air cargo', 'aviation freight', 'air express'],
    mitigation: {
      recommendation: 'Critical leak: air freight emits ~75x more CO2e than ocean shipping. Shift rush orders to expedited maritime.',
      alternative: 'Buffer regional warehouse stock to prevent air freight emergency shipments.',
    },
  },
  {
    category: 'Transport & Logistics',
    scope: 'Scope 3',
    baseUnit: 'tkm',
    factor: 0.015,
    source: 'IMO / DEFRA (Container Ocean Vessel)',
    keywords: ['ocean freight', 'sea freight', 'container ship', 'maritime freight'],
    mitigation: {
      recommendation: 'Select ocean carriers with energy-efficiency slow-steaming certification.',
      alternative: 'Optimize packaging cube utilization to fit more units per 40ft high-cube container.',
    },
  },

  // 5. Water & Waste (Scope 3)
  {
    category: 'Water & Waste',
    scope: 'Scope 3',
    baseUnit: 'm3',
    factor: 0.344,
    source: 'DEFRA Water Supply and Treatment',
    keywords: ['water', 'municipal water', 'cooling water', 'process water'],
    mitigation: {
      recommendation: 'Install closed-loop cooling towers and rainwater harvesting on factory roofs.',
      alternative: 'Deploy flow restrictors and ultrasonic leak detection on high-pressure wash lines.',
    },
  },
  {
    category: 'Water & Waste',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 0.58,
    source: 'EPA WARM (Landfilled Industrial Waste)',
    keywords: ['waste', 'landfill', 'refuse', 'garbage', 'solid waste', 'trash'],
    mitigation: {
      recommendation: 'Achieve Zero Waste to Landfill (ZWTL) certification by routing solid waste to certified recycling streams.',
      alternative: 'Audit upstream packaging from parts suppliers to mandate returnable dunnage.',
    },
  },
]

/**
 * Normalizes input units to the base unit required by emission factors.
 */
interface UnitConversion {
  baseUnit: string
  multiplier: number
}

const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Energy -> kWh
  kwh: { baseUnit: 'kWh', multiplier: 1 },
  'kw-h': { baseUnit: 'kWh', multiplier: 1 },
  'kilowatt-hour': { baseUnit: 'kWh', multiplier: 1 },
  'kilowatt hours': { baseUnit: 'kWh', multiplier: 1 },
  mwh: { baseUnit: 'kWh', multiplier: 1000 },
  'mw-h': { baseUnit: 'kWh', multiplier: 1000 },
  'megawatt hour': { baseUnit: 'kWh', multiplier: 1000 },
  gwh: { baseUnit: 'kWh', multiplier: 1000000 },
  gj: { baseUnit: 'kWh', multiplier: 277.778 },
  mj: { baseUnit: 'kWh', multiplier: 0.277778 },
  mmbtu: { baseUnit: 'kWh', multiplier: 293.07 },
  therm: { baseUnit: 'kWh', multiplier: 29.3 },
  therms: { baseUnit: 'kWh', multiplier: 29.3 },

  // Volume -> L or m3
  l: { baseUnit: 'L', multiplier: 1 },
  liter: { baseUnit: 'L', multiplier: 1 },
  liters: { baseUnit: 'L', multiplier: 1 },
  litre: { baseUnit: 'L', multiplier: 1 },
  litres: { baseUnit: 'L', multiplier: 1 },
  gal: { baseUnit: 'L', multiplier: 3.78541 },
  gallon: { baseUnit: 'L', multiplier: 3.78541 },
  gallons: { baseUnit: 'L', multiplier: 3.78541 },
  bbl: { baseUnit: 'L', multiplier: 158.987 },
  barrel: { baseUnit: 'L', multiplier: 158.987 },
  barrels: { baseUnit: 'L', multiplier: 158.987 },
  m3: { baseUnit: 'm3', multiplier: 1 },
  'm^3': { baseUnit: 'm3', multiplier: 1 },
  cbm: { baseUnit: 'm3', multiplier: 1 },
  'cubic meter': { baseUnit: 'm3', multiplier: 1 },
  'cubic meters': { baseUnit: 'm3', multiplier: 1 },

  // Mass -> kg
  kg: { baseUnit: 'kg', multiplier: 1 },
  kilos: { baseUnit: 'kg', multiplier: 1 },
  kilogram: { baseUnit: 'kg', multiplier: 1 },
  kilograms: { baseUnit: 'kg', multiplier: 1 },
  t: { baseUnit: 'kg', multiplier: 1000 },
  mt: { baseUnit: 'kg', multiplier: 1000 },
  tonne: { baseUnit: 'kg', multiplier: 1000 },
  tonnes: { baseUnit: 'kg', multiplier: 1000 },
  'metric ton': { baseUnit: 'kg', multiplier: 1000 },
  'metric tons': { baseUnit: 'kg', multiplier: 1000 },
  ton: { baseUnit: 'kg', multiplier: 907.185 }, // US short ton
  tons: { baseUnit: 'kg', multiplier: 907.185 },
  lb: { baseUnit: 'kg', multiplier: 0.453592 },
  lbs: { baseUnit: 'kg', multiplier: 0.453592 },
  pound: { baseUnit: 'kg', multiplier: 0.453592 },
  pounds: { baseUnit: 'kg', multiplier: 0.453592 },
  g: { baseUnit: 'kg', multiplier: 0.001 },
  grams: { baseUnit: 'kg', multiplier: 0.001 },

  // Freight -> tkm
  tkm: { baseUnit: 'tkm', multiplier: 1 },
  'tonne-km': { baseUnit: 'tkm', multiplier: 1 },
  'ton-km': { baseUnit: 'tkm', multiplier: 1 },
  'ton-miles': { baseUnit: 'tkm', multiplier: 1.45997 },
  'ton miles': { baseUnit: 'tkm', multiplier: 1.45997 },
  km: { baseUnit: 'km', multiplier: 1 },
  miles: { baseUnit: 'km', multiplier: 1.60934 },
}

/**
 * Colors for categories in UI & charts
 */
export const CATEGORY_COLORS: Record<EmissionCategory, string> = {
  'Electricity & Power': '#0ea5e9', // Vibrant Cyan / Blue
  'Fuels & Combustion': '#f97316', // Burnt Orange
  'Raw Materials': '#10b981', // Emerald Green
  'Transport & Logistics': '#8b5cf6', // Violet
  'Water & Waste': '#64748b', // Slate
  'Other Operations': '#a855f7', // Purple
}

/**
 * Matches an activity description to the best-fitting emission factor and category.
 */
function matchEmissionFactor(itemName: string, userUnit?: string): FactorDef {
  const cleanName = itemName.toLowerCase()
  const cleanUnit = (userUnit || '').toLowerCase().trim()

  // 1. Direct keyword match
  for (const def of EMISSION_FACTORS) {
    for (const kw of def.keywords) {
      if (cleanName.includes(kw)) {
        return def
      }
    }
  }

  // 2. Unit-based inference
  if (['kwh', 'mwh', 'gwh'].includes(cleanUnit)) {
    return EMISSION_FACTORS[0] // Electricity
  }
  if (['tkm', 'ton-miles'].includes(cleanUnit)) {
    return EMISSION_FACTORS.find((f) => f.keywords.includes('truck')) || EMISSION_FACTORS[0]
  }
  if (cleanUnit === 'm3' && cleanName.includes('water')) {
    return EMISSION_FACTORS.find((f) => f.keywords.includes('water')) || EMISSION_FACTORS[0]
  }

  // 3. Fallback generic raw material
  return {
    category: 'Other Operations',
    scope: 'Scope 3',
    baseUnit: 'kg',
    factor: 1.5,
    source: 'GHG Protocol Standard Industrial Operations',
    keywords: [],
    mitigation: {
      recommendation: 'Perform detailed supplier lifecycle assessment (LCA) to specify precise carbon intensity.',
      alternative: 'Request supplier Environmental Product Declarations (EPDs).',
    },
  }
}

/**
 * Clean and parse numbers handling commas, currency, European commas, units embedded in strings.
 */
export function cleanNumberAndUnit(val: string): { num: number; unit?: string } {
  if (!val) return { num: 0 }
  let str = val.trim()

  // Strip currency prefixes if present
  str = str.replace(/^[$€£¥₹]/, '').trim()

  // Check for embedded units (e.g. "1,200.50 kWh", "500 L", "3.2 MT")
  const match = str.match(/^([0-9.,\s+-]+)\s*([a-zA-Z\^3/_-]+)?$/)
  if (match) {
    let numStr = match[1].trim()
    const detectedUnit = match[2]?.trim()

    // Handle European comma formatting (e.g. "1.250,50" -> "1250.50") vs US "1,250.50"
    if (numStr.includes(',') && numStr.includes('.')) {
      if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
        numStr = numStr.replace(/\./g, '').replace(',', '.')
      } else {
        numStr = numStr.replace(/,/g, '')
      }
    } else if (numStr.includes(',') && !numStr.includes('.')) {
      // Could be "1,250" (one thousand) or "1,5" (one point five)
      const parts = numStr.split(',')
      if (parts[1] && parts[1].length === 3) {
        numStr = numStr.replace(/,/g, '')
      } else {
        numStr = numStr.replace(',', '.')
      }
    }

    const parsed = parseFloat(numStr.replace(/\s/g, ''))
    return {
      num: isNaN(parsed) ? 0 : parsed,
      unit: detectedUnit,
    }
  }

  const fallback = parseFloat(str.replace(/,/g, ''))
  return { num: isNaN(fallback) ? 0 : fallback }
}

/**
 * Date detection helper (detects "2024-01", "Jan 2024", "01/2024", "2024-03-15", etc.)
 */
function extractPeriod(val?: string): string | undefined {
  if (!val) return undefined
  const str = val.trim()

  // Check YYYY-MM
  const yyyyMm = str.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b/)
  if (yyyyMm) {
    const year = yyyyMm[1]
    const month = yyyyMm[2].padStart(2, '0')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`
  }

  // Check Month Name YYYY (e.g. "Jan 2024", "March 2024")
  const namedMatch = str.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+(20\d{2})\b/i)
  if (namedMatch) {
    const shortMonth = namedMatch[1].slice(0, 3)
    const capitalized = shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1).toLowerCase()
    return `${capitalized} ${namedMatch[2]}`
  }

  // Check Q1 2024
  const quarterMatch = str.match(/\b(Q[1-4])[,\s]+(20\d{2})\b/i)
  if (quarterMatch) {
    return `${quarterMatch[1].toUpperCase()} ${quarterMatch[2]}`
  }

  return undefined
}

/**
 * Parse raw text content (CSV, TSV, or comma/tab separated lines).
 */
export function parseFactoryText(text: string): {
  records: ParsedRecord[]
  warnings: string[]
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))

  if (lines.length === 0) {
    return { records: [], warnings: ['Uploaded file is empty.'] }
  }

  const warnings: string[] = []
  const records: ParsedRecord[] = []

  // Check if first line is a header
  const firstLine = lines[0]
  const delimiter = firstLine.includes('\t')
    ? '\t'
    : firstLine.includes(';')
      ? ';'
      : ','

  const headerCols = firstLine.split(delimiter).map((c) => c.trim().toLowerCase().replace(/["']/g, ''))
  const isHeader = headerCols.some((col) =>
    ['item', 'input', 'activity', 'material', 'source', 'name', 'qty', 'quantity', 'amount', 'unit'].some((k) =>
      col.includes(k),
    ),
  )

  let nameColIdx = 0
  let qtyColIdx = 1
  let unitColIdx = 2
  let dateColIdx = -1

  if (isHeader) {
    nameColIdx = headerCols.findIndex((c) =>
      ['item', 'input', 'activity', 'material', 'source', 'name', 'description'].some((k) => c.includes(k)),
    )
    if (nameColIdx === -1) nameColIdx = 0

    qtyColIdx = headerCols.findIndex((c) =>
      ['qty', 'quantity', 'amount', 'value', 'volume', 'consumption', 'usage'].some((k) => c.includes(k)),
    )
    if (qtyColIdx === -1) qtyColIdx = 1

    unitColIdx = headerCols.findIndex((c) => ['unit', 'uom', 'measure'].some((k) => c.includes(k)))
    dateColIdx = headerCols.findIndex((c) => ['date', 'month', 'period', 'timestamp', 'time', 'quarter'].some((k) => c.includes(k)))
  }

  const startIndex = isHeader ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const rowNumber = i + 1
    const rawText = lines[i]
    const cells = rawText.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''))

    if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) {
      continue
    }

    const rawName = cells[nameColIdx] || cells[0] || `Operational Input #${rowNumber}`
    const rawQuantityStr = cells[qtyColIdx] !== undefined ? cells[qtyColIdx] : cells[1] || ''
    const rawUnitStr = unitColIdx !== -1 && cells[unitColIdx] !== undefined ? cells[unitColIdx] : ''
    const rawDateStr = dateColIdx !== -1 ? cells[dateColIdx] : cells.find((c) => extractPeriod(c) !== undefined)

    // Clean number and extract embedded units
    const { num: cleanedNum, unit: embeddedUnit } = cleanNumberAndUnit(rawQuantityStr)
    const finalUnitStr = (rawUnitStr || embeddedUnit || '').trim()

    // Missing or invalid value check
    let status: ParsedRecord['status'] = 'valid'
    let statusNote: string | undefined = undefined

    if (isNaN(cleanedNum) || cleanedNum <= 0) {
      warnings.push(`Row ${rowNumber}: "${rawName}" has zero or missing quantity (${rawQuantityStr}). Calculated as 0 emissions.`)
      status = 'warning'
      statusNote = 'Quantity was missing or invalid'
    }

    // Match emission factor
    const factorDef = matchEmissionFactor(rawName, finalUnitStr)

    // Normalize unit
    let normalizedQuantity = cleanedNum
    let normalizedUnit = factorDef.baseUnit

    const lookupUnit = finalUnitStr.toLowerCase().replace(/[^a-z0-9^/-]/g, '')
    if (lookupUnit && UNIT_CONVERSIONS[lookupUnit]) {
      const conv = UNIT_CONVERSIONS[lookupUnit]
      normalizedQuantity = cleanedNum * conv.multiplier
      normalizedUnit = conv.baseUnit
      if (conv.multiplier !== 1) {
        status = 'unit_normalized'
        statusNote = `Converted from ${finalUnitStr} to ${conv.baseUnit} (×${conv.multiplier})`
      }
    } else if (!finalUnitStr) {
      // Inferred unit from standard factor
      normalizedUnit = factorDef.baseUnit
      status = 'inferred'
      statusNote = `Unit inferred as standard ${factorDef.baseUnit}`
    } else if (lookupUnit !== factorDef.baseUnit.toLowerCase()) {
      // Unit given doesn't match default baseUnit, but apply standard multiplier if available
      normalizedUnit = factorDef.baseUnit
    }

    const emissionsKg = normalizedQuantity * factorDef.factor
    const emissionsTonnes = emissionsKg / 1000

    const period = extractPeriod(rawDateStr)

    records.push({
      id: `rec-${rowNumber}-${Math.random().toString(36).substr(2, 6)}`,
      rowNumber,
      rawText,
      itemName: rawName,
      rawQuantity: rawQuantityStr,
      rawUnit: finalUnitStr || normalizedUnit,
      parsedQuantity: cleanedNum,
      normalizedQuantity: parseFloat(normalizedQuantity.toFixed(2)),
      normalizedUnit,
      category: factorDef.category,
      scope: factorDef.scope,
      emissionFactor: factorDef.factor,
      factorSource: factorDef.source,
      emissionsKg: parseFloat(emissionsKg.toFixed(2)),
      emissionsTonnes: parseFloat(emissionsTonnes.toFixed(4)),
      date: period,
      status,
      statusNote,
    })
  }

  return { records, warnings }
}

/**
 * Calculates complete aggregated emissions, breakdown, category totals, and monthly trends.
 */
export function calculateEmissionsFromRecords(
  records: ParsedRecord[],
  preferredUnit: 'tCO2e' | 'kgCO2e' = 'tCO2e',
): EmissionsResult {
  const isTons = preferredUnit === 'tCO2e'
  const unitFactor = isTons ? 0.001 : 1 // 1 kg = 0.001 t

  const totalKg = records.reduce((acc, r) => acc + r.emissionsKg, 0)
  const totalDisplay = parseFloat((totalKg * unitFactor).toFixed(isTons ? 2 : 1))

  // Aggregate by Item Name
  const sourceMap = new Map<
    string,
    {
      category: EmissionCategory
      scope: EmissionScope
      quantity: number
      unit: string
      emissionsKg: number
      factor: number
      factorUnit: string
    }
  >()

  for (const r of records) {
    const existing = sourceMap.get(r.itemName)
    if (existing) {
      existing.quantity += r.normalizedQuantity
      existing.emissionsKg += r.emissionsKg
    } else {
      sourceMap.set(r.itemName, {
        category: r.category,
        scope: r.scope,
        quantity: r.normalizedQuantity,
        unit: r.normalizedUnit,
        emissionsKg: r.emissionsKg,
        factor: r.emissionFactor,
        factorUnit: `kg CO₂e/${r.normalizedUnit}`,
      })
    }
  }

  const sortedRawBreakdown = Array.from(sourceMap.entries())
    .map(([name, data]) => {
      const emissionsVal = parseFloat((data.emissionsKg * unitFactor).toFixed(isTons ? 3 : 1))
      const percentage = totalKg > 0 ? Math.round((data.emissionsKg / totalKg) * 100) : 0
      return {
        name,
        category: data.category,
        scope: data.scope,
        quantity: parseFloat(data.quantity.toFixed(1)),
        unit: data.unit,
        emissions: emissionsVal,
        emissionsKg: parseFloat(data.emissionsKg.toFixed(2)),
        percentage,
        factor: data.factor,
        factorUnit: data.factorUnit,
      }
    })
    .sort((a, b) => b.emissionsKg - a.emissionsKg)

  // Phase 2: Pareto Analysis, Severity Classification & Data-Based Explanations
  let runningCumulative = 0
  let sourcesTo80 = 0
  let paretoPercentage = 0
  let reached80 = false

  const breakdown: EmissionSource[] = sortedRawBreakdown.map((item, index) => {
    runningCumulative += item.percentage
    const cumulative_percentage = totalKg > 0 ? Math.min(100, Math.round(runningCumulative)) : 0
    const severity = classifySeverity(item.percentage)
    const explanation = generateHotspotExplanation(
      item.name,
      item.percentage,
      index + 1,
      sortedRawBreakdown.length,
      severity,
    )

    if (totalKg > 0 && !reached80 && cumulative_percentage >= 80) {
      reached80 = true
      sourcesTo80 = index + 1
      paretoPercentage = cumulative_percentage
    }

    return {
      ...item,
      severity,
      explanation,
      cumulative_percentage,
    }
  })

  // Handle fallback if cumulative didn't reach 80 due to rounding
  if (totalKg > 0 && !reached80 && breakdown.length > 0) {
    sourcesTo80 = breakdown.length
    paretoPercentage = breakdown[breakdown.length - 1].cumulative_percentage ?? 100
  }

  const pareto: ParetoAnalysis = {
    sources_to_80_percent: sourcesTo80,
    pareto_percentage: paretoPercentage,
  }

  // Top Leak with Phase 2 severity & explanation
  const topSource = breakdown[0] || {
    name: 'None',
    category: 'Other Operations' as EmissionCategory,
    scope: 'Scope 3' as EmissionScope,
    emissions: 0,
    percentage: 0,
    severity: 'LOW' as SeverityLevel,
    explanation: 'No emission sources detected.',
  }

  const topFactorDef = matchEmissionFactor(topSource.name)
  const topLeak: TopLeak = {
    name: topSource.name,
    category: topSource.category,
    scope: topSource.scope,
    emissions: topSource.emissions,
    percentage: topSource.percentage,
    severity: topSource.severity ?? 'LOW',
    explanation: topSource.explanation ?? `${topSource.name} has no recorded emissions.`,
    recommendation: topFactorDef.mitigation.recommendation,
    alternativeAction: topFactorDef.mitigation.alternative,
  }

  // Category Breakdown
  const catMap = new Map<EmissionCategory, { kg: number; count: number; scope: EmissionScope }>()
  for (const r of records) {
    const curr = catMap.get(r.category) || { kg: 0, count: 0, scope: r.scope }
    curr.kg += r.emissionsKg
    curr.count += 1
    catMap.set(r.category, curr)
  }

  const categories: CategoryBreakdown[] = Array.from(catMap.entries())
    .map(([cat, data]) => ({
      category: cat,
      emissions: parseFloat((data.kg * unitFactor).toFixed(isTons ? 3 : 1)),
      emissionsKg: parseFloat(data.kg.toFixed(2)),
      percentage: totalKg > 0 ? Math.round((data.kg / totalKg) * 100) : 0,
      count: data.count,
      scope: data.scope,
      color: CATEGORY_COLORS[cat] || '#10b981',
    }))
    .sort((a, b) => b.emissionsKg - a.emissionsKg)

  // Monthly / Period Trends
  const monthMap = new Map<string, { kg: number; count: number }>()
  let hasDates = false

  for (const r of records) {
    if (r.date) {
      hasDates = true
      const curr = monthMap.get(r.date) || { kg: 0, count: 0 }
      curr.kg += r.emissionsKg
      curr.count += 1
      monthMap.set(r.date, curr)
    }
  }

  const monthly: MonthlyBreakdown[] = Array.from(monthMap.entries()).map(([period, data]) => ({
    period,
    emissions: parseFloat((data.kg * unitFactor).toFixed(isTons ? 3 : 1)),
    emissionsKg: parseFloat(data.kg.toFixed(2)),
    sourcesCount: data.count,
  }))

  // Environmental Equivalencies (EPA Greenhouse Gas Equivalencies Calculator)
  // - 1 mature tree absorbs ~22 kg CO2 / year
  // - 1 passenger car emits ~0.21 kg CO2 / km
  // - 1 US household uses ~7,500 kg CO2e / year in electricity
  const treesPerYear = Math.round(totalKg / 22)
  const carKilometers = Math.round(totalKg / 0.21)
  const homesAnnualEnergy = parseFloat((totalKg / 7500).toFixed(1))

  return {
    total_emissions: totalDisplay,
    total_emissions_kg: parseFloat(totalKg.toFixed(2)),
    unit: preferredUnit,
    breakdown,
    categories,
    monthly,
    hasDates,
    top_leak: topLeak,
    pareto,
    records,
    validRecordsCount: records.filter((r) => r.status !== 'warning').length,
    totalRowsCount: records.length,
    warnings: [],
    equivalencies: {
      treesPerYear,
      carKilometers,
      homesAnnualEnergy,
    },
  }
}

/**
 * High-level parser & analyzer for an uploaded file.
 */
export async function calculateEmissions(
  file: File,
  preferredUnit: 'tCO2e' | 'kgCO2e' = 'tCO2e',
): Promise<EmissionsResult> {
  const text = await file.text()
  const { records, warnings } = parseFactoryText(text)
  const result = calculateEmissionsFromRecords(records, preferredUnit)
  result.warnings = warnings
  return result
}

/**
 * True when the file extension is supported.
 */
export function isSupportedFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/**
 * Human-readable file size format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let size = bytes / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Sample datasets for instant hackathon demonstration.
 */
export const SAMPLE_DATASETS = [
  {
    id: 'automotive-assembly',
    name: 'Automotive Parts Assembly (Quarterly)',
    description: 'Medium plant with steel stamping, fleet diesel, grid electricity, and transport.',
    content: `Item,Quantity,Unit,Date
Grid Electricity,145 MWh,kWh,Jan 2024
Virgin Steel Sheet,42 metric tons,kg,Jan 2024
Heavy Fleet Diesel,3200 gallons,L,Jan 2024
Road Freight (Truck),18000 ton-miles,tkm,Jan 2024
Natural Gas Boiler,4800 m3,m3,Jan 2024
Primary Aluminium Castings,12.5 tons,kg,Feb 2024
Grid Electricity,138 MWh,kWh,Feb 2024
Heavy Fleet Diesel,2950 gallons,L,Feb 2024
Virgin Steel Sheet,39 metric tons,kg,Feb 2024
Municipal Process Water,1850 m3,m3,Feb 2024
Grid Electricity,152 MWh,kWh,Mar 2024
Virgin Steel Sheet,45 metric tons,kg,Mar 2024
Air Freight Logistics,8500 ton-miles,tkm,Mar 2024
Heavy Fleet Diesel,3400 gallons,L,Mar 2024
Industrial Landfill Waste,4.2 tons,kg,Mar 2024`,
  },
  {
    id: 'packaging-plastics',
    name: 'Plastic Packaging & Extrusion Plant',
    description: 'High material footprint plant with virgin polymer resins and grid power.',
    content: `Input,Consumption,Unit,Month
Virgin Plastic (HDPE Resins),68.5 metric tons,kg,Jan 2024
Grid Electricity,185 MWh,kWh,Jan 2024
Recycled rPET Resin,18 metric tons,kg,Jan 2024
Natural Gas Thermal Burner,6200 m3,m3,Jan 2024
Corrugated Cardboard Cartons,8.4 tonnes,kg,Jan 2024
Delivery Truck Freight,14200 tkm,tkm,Jan 2024
Virgin Plastic (PP Polymer),74 metric tons,kg,Feb 2024
Grid Electricity,192 MWh,kWh,Feb 2024
Recycled rPET Resin,22 metric tons,kg,Feb 2024
Heavy Fuel Oil,4200 L,L,Feb 2024
Industrial Solvents & Coatings,3500 kg,kg,Feb 2024`,
  },
  {
    id: 'textile-garments',
    name: 'Textile Weaving & Dyeing Facility',
    description: 'Thermal steam boilers, fabric inputs, dyeing chemicals, and international air shipping.',
    content: `Activity,Usage,Unit,Period
Raw Cotton Yarn,28000 kg,kg,Q1 2024
Coal Boiler Steam,18.5 tonnes,kg,Q1 2024
Grid Electricity,94000 kWh,kWh,Q1 2024
Dyeing Chemicals & Bleach,6400 kg,kg,Q1 2024
Process Water Consumption,4200 m3,m3,Q1 2024
Air Freight (Rush Garments),4500 tkm,tkm,Q1 2024
Synthetic Polyester Fabric,14500 kg,kg,Q2 2024
Grid Electricity,98500 kWh,kWh,Q2 2024
Coal Boiler Steam,16.2 tonnes,kg,Q2 2024
Ocean Container Freight,38000 tkm,tkm,Q2 2024`,
  },
]
