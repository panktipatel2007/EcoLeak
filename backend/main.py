"""
EcoLeak Backend API — Industrial Emission Leak-Point Detector & Circular Recommender.

FastAPI application providing endpoints for processing factory CSV/TXT data,
detecting carbon emission leaks, and recommending circular alternatives.
"""

from typing import List, Optional
import logging
from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.emission_calculator import calculate_emissions_from_csv, CSVValidationError

# Configure logger
logger = logging.getLogger("ecoleak")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="EcoLeak API",
    description="Industrial Emission Leak-Point Detector & Circular Recommender API",
    version="1.1.0",
)

# Configure CORS for local frontend development (Next.js, Vite, etc.)
ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Response Models
class EmissionBreakdownItem(BaseModel):
    name: str = Field(..., description="Name of the emission source / material")
    emissions: float = Field(..., description="Calculated emissions in metric tonnes of CO2e (tCO2e)")
    percentage: float = Field(..., description="Percentage contribution to total emissions")


class TopLeakItem(BaseModel):
    name: str = Field(..., description="The single highest emission source (leak point)")
    percentage: float = Field(..., description="Percentage contribution of the top leak")


class CircularRecommendationItem(BaseModel):
    target_source: str = Field(..., description="The high-impact emission source targeted")
    alternative_name: str = Field(..., description="Name of the circular alternative solution")
    action: str = Field(..., description="Concrete transition action for the facility")
    reduction_percentage: float = Field(..., description="Expected emission reduction percentage")
    potential_co2e_savings: float = Field(..., description="Estimated potential emissions reduction in tCO2e")
    co_benefits: str = Field(..., description="Operational, financial, and environmental co-benefits")


class EmissionCalculationResponse(BaseModel):
    total_emissions: float = Field(..., description="Total calculated emissions")
    unit: str = Field(default="tCO2e", description="Unit of measurement")
    breakdown: List[EmissionBreakdownItem] = Field(..., description="Sorted list of emission sources")
    top_leak: TopLeakItem = Field(..., description="The hotspot emission leak-point")
    circular_recommendation: Optional[CircularRecommendationItem] = Field(
        default=None,
        description="Actionable circular substitution recommendation for the top leak",
    )


@app.get("/")
def root():
    """Health check / root endpoint."""
    return {
        "status": "online",
        "service": "EcoLeak Backend API",
        "version": "1.1.0",
        "docs": "/docs",
    }


ALLOWED_EXTENSIONS = (".csv", ".txt", ".tsv")


@app.post(
    "/calculate-emissions",
    response_model=EmissionCalculationResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculate Industrial Emissions & Detect Leak Point",
    description="Upload a factory CSV or TXT file containing columns: name, type, quantity, unit to calculate emissions.",
)
async def calculate_emissions(file: UploadFile = File(...)):
    """
    Accepts CSV/TXT upload via multipart/form-data, processes in-memory without persistent disk storage,
    validates data, calculates emissions, identifies the hotspot leak, and suggests circular recommendations.
    """
    # 1. Basic file format check (accepts .csv, .txt, .tsv)
    filename = (file.filename or "").lower()
    if not any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format '{file.filename}'. Please upload a valid CSV or TXT file (.csv, .txt, .tsv).",
        )

    # 2. Read file in-memory
    try:
        content = await file.read()
    except Exception as exc:
        logger.error(f"Failed to read uploaded file: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to read the uploaded file. Please verify the file and try again.",
        )

    if not content or len(content.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty. Please provide data rows with columns: name, type, quantity, unit.",
        )

    # 3. Calculate emissions using domain service
    try:
        result = calculate_emissions_from_csv(content)
        return result
    except CSVValidationError as ve:
        logger.warning(f"CSV validation failed: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as exc:
        logger.error(f"Unexpected calculation error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred while processing the calculation.",
        )
