"""
Automated Unit and Integration Tests for EcoLeak Backend.
"""

import io
import pytest
from fastapi.testclient import TestClient
from main import app
from services.emission_calculator import (
    calculate_emissions_from_csv,
    get_circular_recommendation,
    CSVValidationError,
)

client = TestClient(app)


def test_root_endpoint():
    """Test the health check / root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "EcoLeak" in data["service"]


def test_calculate_emissions_valid_csv():
    """Test valid CSV calculation through API."""
    csv_content = (
        "name,type,quantity,unit\n"
        "Electricity,electricity,1000,kWh\n"
        "Diesel,diesel,200,L\n"
        "Virgin Plastic,material,500,kg\n"
    )
    files = {"file": ("data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/calculate-emissions", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["total_emissions"] > 0
    assert data["unit"] == "tCO2e"
    assert len(data["breakdown"]) == 3

    # Top leak must be Virgin Plastic (500 * 0.0035 = 1.75 tCO2e)
    assert data["top_leak"]["name"] == "Virgin Plastic"
    assert data["top_leak"]["percentage"] > 40.0

    # Circular recommendation check
    rec = data.get("circular_recommendation")
    assert rec is not None
    assert rec["target_source"] == "Virgin Plastic"
    assert "Recycled" in rec["alternative_name"]
    assert rec["potential_co2e_savings"] > 0


def test_calculate_emissions_valid_txt_file():
    """Test that .txt files with CSV formatted data are accepted."""
    txt_content = (
        "name,type,quantity,unit\n"
        "Electricity,electricity,500,kWh\n"
        "Diesel,diesel,100,L\n"
    )
    files = {"file": ("operations.txt", io.BytesIO(txt_content.encode("utf-8")), "text/plain")}
    response = client.post("/calculate-emissions", files=files)
    assert response.status_code == 200
    data = response.json()
    assert len(data["breakdown"]) == 2


def test_tab_delimited_data():
    """Test tab-delimited factory data parsing."""
    tsv_content = (
        "name\ttype\tquantity\tunit\n"
        "Electricity\telectricity\t1000\tkWh\n"
        "Coal\tcoal\t200\tkg\n"
    )
    result = calculate_emissions_from_csv(tsv_content)
    assert result["total_emissions"] > 0
    assert len(result["breakdown"]) == 2


def test_duplicate_items_aggregation():
    """Test that items with the same name are correctly summed."""
    csv_content = (
        "name,type,quantity,unit\n"
        "Diesel,diesel,100,L\n"
        "Diesel,diesel,150,L\n"
    )
    result = calculate_emissions_from_csv(csv_content)
    assert len(result["breakdown"]) == 1
    # 250 * 0.00268 = 0.67 tCO2e
    assert round(result["total_emissions"], 2) == 0.67
    assert result["top_leak"]["name"] == "Diesel"
    assert result["top_leak"]["percentage"] == 100.0


def test_missing_required_column():
    """Test rejection when required columns are missing."""
    csv_content = "name,quantity,unit\nElectricity,1000,kWh\n"
    files = {"file": ("bad.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/calculate-emissions", files=files)
    assert response.status_code == 400
    assert "Missing required column" in response.json()["detail"]


def test_negative_quantity():
    """Test rejection when quantity is negative."""
    csv_content = "name,type,quantity,unit\nDiesel,diesel,-50,L\n"
    files = {"file": ("bad.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/calculate-emissions", files=files)
    assert response.status_code == 400
    assert "cannot be negative" in response.json()["detail"]


def test_non_numeric_quantity():
    """Test rejection when quantity is non-numeric."""
    csv_content = "name,type,quantity,unit\nDiesel,diesel,abc,L\n"
    files = {"file": ("bad.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/calculate-emissions", files=files)
    assert response.status_code == 400
    assert "valid numeric value" in response.json()["detail"]


def test_empty_file():
    """Test rejection when file is empty."""
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    response = client.post("/calculate-emissions", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_unsupported_file_extension():
    """Test rejection of unsupported file extensions (e.g. .pdf)."""
    files = {"file": ("report.pdf", io.BytesIO(b"%PDF-1.4..."), "application/pdf")}
    response = client.post("/calculate-emissions", files=files)
    assert response.status_code == 400
    assert "Invalid file format" in response.json()["detail"]


def test_circular_recommendation_helper():
    """Test circular recommendation for various materials."""
    rec = get_circular_recommendation("Virgin Plastic", "material", 10.0)
    assert rec["reduction_percentage"] > 50
    assert rec["potential_co2e_savings"] > 0
    assert "alternative_name" in rec

    rec_general = get_circular_recommendation("Custom Chemical X", "chemical", 5.0)
    assert "audit" in rec_general["action"].lower()
