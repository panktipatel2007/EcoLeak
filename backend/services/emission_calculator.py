"""
Emission Calculation Service for EcoLeak.

Handles CSV and TXT parsing (supporting comma, tab, semicolon delimiters),
data validation, emission factor matching, and emission breakdown with
hotspot identification and circular economy recommendations.
"""

from io import BytesIO, StringIO
from typing import Any, Dict, List, Optional, Tuple, Union
import pandas as pd


class CSVValidationError(Exception):
    """Custom exception for user-correctable CSV/TXT validation errors."""
    pass


# Default emission factors in metric tonnes of CO2 equivalent per unit (tCO2e / unit)
# Normalized keys: (name_or_type, unit)
DEFAULT_EMISSION_FACTORS: Dict[Tuple[str, str], float] = {
    # Energy / Fuels
    ("electricity", "kwh"): 0.00082,      # 0.82 kg CO2e/kWh (national grid average approx)
    ("diesel", "l"): 0.00268,             # 2.68 kg CO2e/L
    ("petrol", "l"): 0.00231,             # 2.31 kg CO2e/L
    ("gasoline", "l"): 0.00231,           # 2.31 kg CO2e/L
    ("natural_gas", "m3"): 0.00190,       # 1.90 kg CO2e/m3
    ("natural gas", "m3"): 0.00190,
    ("lpg", "kg"): 0.00298,               # 2.98 kg CO2e/kg
    ("coal", "kg"): 0.00242,              # 2.42 kg CO2e/kg
    ("fuel_oil", "l"): 0.00310,           # 3.10 kg CO2e/L

    # General Materials baseline
    ("material", "kg"): 0.00250,

    # Specific material overrides (name, unit)
    ("virgin plastic", "kg"): 0.00350,    # High impact polymer production
    ("raw material", "kg"): 0.00180,      # Industrial raw material processing
    ("recycled plastic", "kg"): 0.00120,  # Circular alternative
    ("steel", "kg"): 0.00185,
    ("aluminum", "kg"): 0.00820,
    ("cardboard", "kg"): 0.00095,
    ("paper", "kg"): 0.00092,
    ("packaging", "kg"): 0.00150,

    # Logistics / Freight
    ("freight", "tkm"): 0.00015,
}

# Circular Economy Recommendations catalog
CIRCULAR_RECOMMENDATIONS_CATALOG: Dict[str, Dict[str, Any]] = {
    "virgin plastic": {
        "alternative_name": "Post-Consumer Recycled (PCR) Polymer",
        "action": "Transition from virgin resin pellets to certified recycled polymers (e.g. rPET or rHDPE).",
        "reduction_percentage": 65.7,
        "co_benefits": "Drastically cuts fossil feedstock dependency, reduces landfill waste, and complies with EPR regulations.",
    },
    "diesel": {
        "alternative_name": "Fleet/Equipment Electrification & HVO Biodiesel",
        "action": "Retrofit stationary diesel engines to electric drives and switch logistics transport to Hydrotreated Vegetable Oil (HVO).",
        "reduction_percentage": 80.5,
        "co_benefits": "Eliminates toxic localized NOx and particulate matter (PM2.5) while lowering operating fuel costs.",
    },
    "electricity": {
        "alternative_name": "Onsite Solar PV & Green Power Purchase Agreement (PPA)",
        "action": "Deploy factory rooftop solar arrays and contract certified renewable energy tariffs for remaining grid load.",
        "reduction_percentage": 88.0,
        "co_benefits": "Shields your facility against grid energy price spikes and reduces Scope 2 market-based emissions.",
    },
    "coal": {
        "alternative_name": "Biomass Briquettes & Waste Heat Recovery",
        "action": "Convert coal boilers to certified agricultural biomass pellets paired with industrial heat recovery loops.",
        "reduction_percentage": 82.0,
        "co_benefits": "Eliminates heavy ash disposal requirements and enables carbon offset credit eligibility.",
    },
    "natural_gas": {
        "alternative_name": "Industrial Heat Pumps & Renewable Biogas",
        "action": "Electrify low-to-medium temperature thermal processes with heat pumps and source biomethane for high-heat needs.",
        "reduction_percentage": 70.0,
        "co_benefits": "Dramatically reduces boiler combustion losses and lowers carbon tax liabilities.",
    },
    "cardboard": {
        "alternative_name": "Closed-Loop Reusable Polypropylene Crates",
        "action": "Replace single-use corrugated cardboard boxes with returnable collapsible bulk containers.",
        "reduction_percentage": 75.0,
        "co_benefits": "Extends packaging lifespan up to 100+ cycles and reduces warehousing waste handling fees.",
    },
    "packaging": {
        "alternative_name": "Molded Pulp / Circular Compostable Packaging",
        "action": "Switch single-use packaging fillers to bio-based molded fiber or 100% recycled paper cushion.",
        "reduction_percentage": 60.0,
        "co_benefits": "Offers biodegradable end-of-life disposal and enhances brand sustainability perception.",
    },
    "raw material": {
        "alternative_name": "Closed-Loop Secondary Industrial Feedstocks",
        "action": "Partner with regional industrial symbiosis networks to source byproduct or secondary feedstocks.",
        "reduction_percentage": 50.0,
        "co_benefits": "Stabilizes raw material supply volatility and supports regional circular economy hubs.",
    },
    "steel": {
        "alternative_name": "Electric Arc Furnace (EAF) Recycled Steel",
        "action": "Specify 100% scrap-fed electric arc furnace steel with verified low embodied carbon certifications.",
        "reduction_percentage": 64.0,
        "co_benefits": "Significantly lowers Scope 3 upstream emissions without sacrificing tensile strength.",
    },
    "aluminum": {
        "alternative_name": "Secondary Remelted Low-Carbon Aluminum",
        "action": "Procure secondary recycled aluminum billets requiring 95% less energy than primary bauxite smelting.",
        "reduction_percentage": 85.0,
        "co_benefits": "Preserves pristine natural resource reserves and minimizes industrial smelting energy usage.",
    },
}

REQUIRED_COLUMNS = ["name", "type", "quantity", "unit"]


def get_emission_factor(
    name: str,
    item_type: str,
    unit: str,
    custom_factors: Optional[Dict[Tuple[str, str], float]] = None,
) -> Tuple[float, str]:
    """
    Look up the emission factor for an item.
    Checks item-specific name override first, then falls back to item type.
    """
    factors = custom_factors or DEFAULT_EMISSION_FACTORS

    norm_name = name.strip().lower()
    norm_type_spaced = item_type.strip().lower()
    norm_type_underscored = norm_type_spaced.replace(" ", "_")
    norm_unit = unit.strip().lower()

    # 1. Try matching (norm_name, norm_unit)
    if (norm_name, norm_unit) in factors:
        return factors[(norm_name, norm_unit)], norm_name

    # 2. Try matching type variants
    if (norm_type_underscored, norm_unit) in factors:
        return factors[(norm_type_underscored, norm_unit)], norm_type_underscored

    if (norm_type_spaced, norm_unit) in factors:
        return factors[(norm_type_spaced, norm_unit)], norm_type_spaced

    # Not found
    supported_keys = [f"{k[0]} ({k[1]})" for k in factors.keys()]
    supported_summary = ", ".join(sorted(set(supported_keys))[:12]) + "..."
    raise CSVValidationError(
        f"Unsupported emission source or unit: name='{name}', type='{item_type}', unit='{unit}'. "
        f"Supported inputs include: {supported_summary}"
    )


def get_circular_recommendation(
    top_name: str,
    top_type: Optional[str] = None,
    top_emissions: float = 0.0,
) -> Dict[str, Any]:
    """
    Determines actionable circular recommendations and estimated carbon reduction
    for the identified hotspot leak point.
    """
    norm_name = top_name.strip().lower()
    norm_type = (top_type or "").strip().lower()

    match_info = None
    if norm_name in CIRCULAR_RECOMMENDATIONS_CATALOG:
        match_info = CIRCULAR_RECOMMENDATIONS_CATALOG[norm_name]
    elif norm_type in CIRCULAR_RECOMMENDATIONS_CATALOG:
        match_info = CIRCULAR_RECOMMENDATIONS_CATALOG[norm_type]
    else:
        # Check partial keyword match (e.g., 'plastic', 'diesel', 'solar', 'grid')
        for key, info in CIRCULAR_RECOMMENDATIONS_CATALOG.items():
            if key in norm_name or key in norm_type:
                match_info = info
                break

    if not match_info:
        # Default general circular recommendation
        match_info = {
            "alternative_name": "Resource Efficiency & Closed-Loop Circular Sourcing",
            "action": f"Conduct an input-output material audit on {top_name} to recover scrap and switch to verified recycled or renewable alternatives.",
            "reduction_percentage": 40.0,
            "co_benefits": "Reduces operational waste, mitigates supply chain volatility, and lowers Scope 1-3 footprint.",
        }

    pct = match_info["reduction_percentage"]
    potential_savings = round(top_emissions * (pct / 100.0), 2)

    return {
        "target_source": top_name,
        "alternative_name": match_info["alternative_name"],
        "action": match_info["action"],
        "reduction_percentage": pct,
        "potential_co2e_savings": potential_savings,
        "co_benefits": match_info["co_benefits"],
    }


def calculate_emissions_from_csv(
    csv_source: Union[bytes, str, BytesIO],
    custom_factors: Optional[Dict[Tuple[str, str], float]] = None,
) -> Dict[str, Any]:
    """
    Parses CSV/TXT content, validates schema and values, computes emissions,
    and returns a structured breakdown including top leak and circular recommendations.
    """
    # 1. Parse CSV/TXT into DataFrame with automatic delimiter sniffing fallback
    if isinstance(csv_source, bytes):
        raw_text = csv_source.decode("utf-8-sig", errors="replace")
    elif isinstance(csv_source, BytesIO):
        raw_text = csv_source.getvalue().decode("utf-8-sig", errors="replace")
    else:
        raw_text = str(csv_source)

    if not raw_text.strip():
        raise CSVValidationError("The uploaded file is empty or contains no readable text.")

    df = None
    parse_errors = []

    # Attempt comma, tab, semicolon or python delimiter detection
    for sep in [",", "\t", ";", None]:
        try:
            buffer = StringIO(raw_text)
            temp_df = pd.read_csv(buffer, sep=sep, engine="python" if sep is None else "c")
            temp_cols = [str(c).strip().lower() for c in temp_df.columns]
            # Check if all required columns are recognized
            if all(rc in temp_cols for rc in REQUIRED_COLUMNS):
                df = temp_df
                break
        except Exception as err:
            parse_errors.append(str(err))

    if df is None:
        # Final attempt with standard read_csv to surface standard pandas message if fails
        try:
            df = pd.read_csv(StringIO(raw_text))
        except Exception as e:
            raise CSVValidationError(f"Malformed or unreadable file: {str(e)}")

    # 2. Check if empty dataframe
    if df.empty:
        raise CSVValidationError("The file contains headers but no operational data rows.")

    # 3. Validate required columns
    df_columns_clean = [str(col).strip().lower() for col in df.columns]
    column_mapping = {str(col).strip().lower(): col for col in df.columns}

    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df_columns_clean]
    if missing_cols:
        raise CSVValidationError(
            f"Missing required column(s): {', '.join(missing_cols)}. "
            f"Expected columns: {', '.join(REQUIRED_COLUMNS)}."
        )

    name_col = column_mapping["name"]
    type_col = column_mapping["type"]
    qty_col = column_mapping["quantity"]
    unit_col = column_mapping["unit"]

    # 4. Validate rows and types
    items_calculated = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-based index + header row

        raw_name = row[name_col]
        raw_type = row[type_col]
        raw_qty = row[qty_col]
        raw_unit = row[unit_col]

        if pd.isna(raw_name) or str(raw_name).strip() == "":
            raise CSVValidationError(f"Row {row_num}: 'name' cannot be empty.")
        if pd.isna(raw_type) or str(raw_type).strip() == "":
            raise CSVValidationError(f"Row {row_num}: 'type' cannot be empty.")
        if pd.isna(raw_unit) or str(raw_unit).strip() == "":
            raise CSVValidationError(f"Row {row_num}: 'unit' cannot be empty.")
        if pd.isna(raw_qty) or str(raw_qty).strip() == "":
            raise CSVValidationError(f"Row {row_num}: 'quantity' cannot be empty.")

        try:
            quantity = float(str(raw_qty).strip().replace(",", ""))
        except (ValueError, TypeError):
            raise CSVValidationError(
                f"Row {row_num}: Invalid quantity '{raw_qty}'. Must be a valid numeric value."
            )

        if quantity < 0:
            raise CSVValidationError(
                f"Row {row_num}: Invalid quantity '{raw_qty}'. Quantity cannot be negative."
            )

        item_name = str(raw_name).strip()
        item_type = str(raw_type).strip()
        item_unit = str(raw_unit).strip()

        factor, _ = get_emission_factor(item_name, item_type, item_unit, custom_factors)
        emissions = quantity * factor

        items_calculated.append({
            "name": item_name,
            "type": item_type,
            "quantity": quantity,
            "unit": item_unit,
            "emissions": emissions,
        })

    # 5. Aggregate by name if multiple rows have the same item name
    aggregated: Dict[str, float] = {}
    item_types_by_name: Dict[str, str] = {}
    for item in items_calculated:
        aggregated[item["name"]] = aggregated.get(item["name"], 0.0) + item["emissions"]
        item_types_by_name[item["name"]] = item["type"]

    total_emissions = sum(aggregated.values())

    # 6. Format breakdown and calculate percentage contributions
    breakdown: List[Dict[str, Any]] = []
    for name, emissions in aggregated.items():
        if total_emissions > 0:
            percentage = round((emissions / total_emissions) * 100, 2)
        else:
            percentage = 0.0
        breakdown.append({
            "name": name,
            "emissions": round(emissions, 2),
            "percentage": percentage,
        })

    # Sort breakdown descending by emissions
    breakdown.sort(key=lambda x: x["emissions"], reverse=True)

    # 7. Identify Top Leak and Circular Recommendation
    if breakdown:
        top_item = breakdown[0]
        top_leak = {
            "name": top_item["name"],
            "percentage": top_item["percentage"],
        }
        top_type = item_types_by_name.get(top_item["name"], "")
        circular_rec = get_circular_recommendation(
            top_name=top_item["name"],
            top_type=top_type,
            top_emissions=top_item["emissions"],
        )
    else:
        top_leak = {
            "name": "None",
            "percentage": 0.0,
        }
        circular_rec = None

    return {
        "total_emissions": round(total_emissions, 2),
        "unit": "tCO2e",
        "breakdown": breakdown,
        "top_leak": top_leak,
        "circular_recommendation": circular_rec,
    }
