import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from server import app, settings


# =============================================================================
# CONFIGURATION TESTS
# =============================================================================

@pytest.fixture
def client():
    """Client de test synchrone."""
    return TestClient(app)

@pytest.fixture
async def async_client():
    """Client de test asynchrone."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


# =============================================================================
# TESTS ENDPOINTS BASIQUES
# =============================================================================

def test_root_endpoint(client):
    """Test endpoint racine."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert data["version"] == "3.0.0"

def test_health_endpoint(client):
    """Test endpoint health check."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["version"] == "3.0.0"
    assert "timestamp" in data
    assert "environment" in data

def test_health_structure(client):
    """Test structure complète réponse health."""
    response = client.get("/api/health")
    data = response.json()
    
    required_fields = ["ok", "version", "timestamp", "environment", "database"]
    for field in required_fields:
        assert field in data
    
    assert isinstance(data["ok"], bool)
    assert isinstance(data["version"], str)
    assert isinstance(data["timestamp"], str)
    assert isinstance(data["environment"], str)
    assert isinstance(data["database"], str)


# =============================================================================
# TESTS AUTHENTIFICATION
# =============================================================================

def test_login_admin_default(client):
    """Test connexion admin par défaut."""
    response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert "user" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "admin"

def test_login_employee_default(client):
    """Test connexion employé par défaut."""
    response = client.post(
        "/api/auth/login",
        json={"username": "employe1", "password": "employe123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "employe1"
    assert data["user"]["role"] == "employee"

def test_login_invalid_credentials(client):
    """Test connexion avec identifiants invalides."""
    response = client.post(
        "/api/auth/login",
        json={"username": "invalid", "password": "invalid"}
    )
    assert response.status_code == 401

def test_login_missing_fields(client):
    """Test connexion avec champs manquants."""
    response = client.post(
        "/api/auth/login",
        json={"username": "admin"}
    )
    assert response.status_code == 422  # Validation error


# =============================================================================
# TESTS CLIENTS (AVEC AUTHENTIFICATION)
# =============================================================================

def test_get_clients_without_auth(client):
    """Test récupération clients sans authentification."""
    response = client.get("/api/clients")
    assert response.status_code == 403  # Forbidden

def test_get_clients_with_auth(client):
    """Test récupération clients avec authentification."""
    # Connexion admin
    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    
    # Récupération clients
    response = client.get(
        "/api/clients",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_client_with_auth(client):
    """Test création client avec authentification."""
    # Connexion admin
    login_response = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    token = login_response.json()["access_token"]
    
    # Création client
    client_data = {
        "nom": "Dupont",
        "prenom": "Jean",
        "telephone": "0123456789",
        "email": "jean.dupont@example.com",
        "adresse": "123 Rue de la Paix",
        "ville": "Paris",
        "code_postal": "75001"
    }
    
    response = client.post(
        "/api/clients",
        json=client_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["nom"] == "Dupont"
    assert data["prenom"] == "Jean"
    assert "id" in data
    assert "created_at" in data


# =============================================================================
# TESTS CORS
# =============================================================================

def test_cors_options_request(client):
    """Test requête OPTIONS pour CORS."""
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    # FastAPI handle CORS automatiquement
    assert response.status_code in [200, 204]


# =============================================================================
# TESTS CONFIGURATION
# =============================================================================

def test_settings_loading():
    """Test chargement des paramètres."""
    assert settings.jwt_secret is not None
    assert settings.mongo_url is not None
    assert settings.db_name is not None
    assert settings.port == 8001
    assert settings.host == "0.0.0.0"


# =============================================================================
# TESTS UTILITAIRES
# =============================================================================

def test_password_hashing():
    """Test hashage et vérification mot de passe."""
    from server import hash_password, verify_password
    
    password = "test123"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong", hashed) is False


# =============================================================================
# EXÉCUTION TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])