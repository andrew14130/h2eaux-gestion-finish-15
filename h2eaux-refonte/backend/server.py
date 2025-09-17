from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BaseSettings, Field
from typing import List, Optional
import os
import logging
import uuid
from datetime import datetime, timedelta
import bcrypt
from jose import JWTError, jwt
from pathlib import Path


# =============================================================================
# CONFIGURATION VIA PYDANTIC SETTINGS
# =============================================================================
class Settings(BaseSettings):
    # Database
    mongo_url: str = "mongodb://localhost:27017"
    db_name: str = "h2eaux_gestion"
    
    # JWT
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080  # 7 days
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    environment: str = "development"
    debug: bool = False
    
    # CORS
    allowed_origins: str = "*"
    
    # Security
    max_login_attempts: int = 5
    login_block_duration: int = 300
    bcrypt_rounds: int = 12
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Chargement de la configuration
settings = Settings()

# Conversion CORS origins en liste
if settings.allowed_origins == "*":
    allowed_origins = ["*"]
else:
    allowed_origins = [origin.strip() for origin in settings.allowed_origins.split(",")]


# =============================================================================
# INITIALISATION APPLICATION
# =============================================================================
app = FastAPI(
    title="H2EAUX Gestion API",
    description="API pour l'application PWA H2EAUX GESTION",
    version="3.0.0",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Router API
api_router = APIRouter(prefix="/api")

# Configuration logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
client = AsyncIOMotorClient(settings.mongo_url)
db = client[settings.db_name]

# JWT et sécurité
security = HTTPBearer()


# =============================================================================
# MODÈLES PYDANTIC
# =============================================================================

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str = "employee"  # admin or employee
    permissions: dict = Field(default_factory=lambda: {
        "clients": True,
        "documents": True,
        "chantiers": True,
        "calculs_pac": True,
        "catalogues": True,
        "chat": True,
        "parametres": False
    })
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "employee"
    permissions: Optional[dict] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nom: str
    prenom: str
    telephone: str = ""
    email: str = ""
    adresse: str = ""
    ville: str = ""
    code_postal: str = ""
    type_chauffage: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ClientCreate(BaseModel):
    nom: str
    prenom: str
    telephone: str = ""
    email: str = ""
    adresse: str = ""
    ville: str = ""
    code_postal: str = ""
    type_chauffage: str = ""
    notes: str = ""

class ClientUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    type_chauffage: Optional[str] = None
    notes: Optional[str] = None

class HealthResponse(BaseModel):
    ok: bool
    version: str
    timestamp: str
    environment: str
    database: str


# =============================================================================
# UTILITAIRES SÉCURITÉ
# =============================================================================

def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=settings.bcrypt_rounds)).decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe contre son hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crée un token JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Récupère l'utilisateur actuel depuis le token JWT."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"username": username})
    if user is None:
        raise credentials_exception
    
    return User(**user)


# =============================================================================
# INITIALISATION BASE DE DONNÉES
# =============================================================================

async def init_default_users():
    """Initialise les utilisateurs par défaut."""
    try:
        # Vérifier si l'admin existe
        admin_exists = await db.users.find_one({"username": "admin"})
        if not admin_exists:
            admin_user = User(
                username="admin",
                role="admin",
                permissions={
                    "clients": True,
                    "documents": True,
                    "chantiers": True,
                    "calculs_pac": True,
                    "catalogues": True,
                    "chat": True,
                    "parametres": True
                },
                hashed_password=hash_password("admin123")
            )
            await db.users.insert_one(admin_user.dict())
            logger.info("Utilisateur admin créé")

        # Vérifier si l'employé existe
        employee_exists = await db.users.find_one({"username": "employe1"})
        if not employee_exists:
            employee_user = User(
                username="employe1",
                role="employee",
                permissions={
                    "clients": True,
                    "documents": True,
                    "chantiers": True,
                    "calculs_pac": True,
                    "catalogues": True,
                    "chat": True,
                    "parametres": False
                },
                hashed_password=hash_password("employe123")
            )
            await db.users.insert_one(employee_user.dict())
            logger.info("Utilisateur employé créé")

        # Index utilisateurs
        await db.users.create_index("username", unique=True)
        await db.users.create_index("id", unique=True)
        
        logger.info("Base de données initialisée avec succès")
        
    except Exception as e:
        logger.error(f"Erreur initialisation base de données: {e}")


# =============================================================================
# ROUTES API
# =============================================================================

@api_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Point de contrôle santé de l'API."""
    try:
        # Test connexion MongoDB
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        logger.error(f"Erreur connexion MongoDB: {e}")
        db_status = "disconnected"
    
    return HealthResponse(
        ok=True,
        version="3.0.0",
        timestamp=datetime.utcnow().isoformat(),
        environment=settings.environment,
        database=db_status
    )

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    """Authentification utilisateur."""
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username ou mot de passe incorrect"
        )
    
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    # Ne pas retourner le mot de passe hashé
    user_safe = {k: v for k, v in user.items() if k != "hashed_password"}
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_safe
    )

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    """Création d'un nouvel utilisateur (admin uniquement)."""
    if not current_user.permissions.get("parametres", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission insuffisante"
        )
    
    # Vérifier si l'utilisateur existe
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom d'utilisateur déjà utilisé"
        )
    
    # Créer l'utilisateur
    new_user = User(
        username=user_data.username,
        role=user_data.role,
        permissions=user_data.permissions or User().permissions,
        hashed_password=hash_password(user_data.password)
    )
    
    await db.users.insert_one(new_user.dict())
    return new_user

# Routes Clients
@api_router.get("/clients", response_model=List[Client])
async def get_clients(current_user: User = Depends(get_current_user)):
    """Récupère la liste des clients."""
    if not current_user.permissions.get("clients", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission insuffisante")
    
    clients = await db.clients.find().sort("created_at", -1).to_list(1000)
    return [Client(**client) for client in clients]

@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    """Crée un nouveau client."""
    if not current_user.permissions.get("clients", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission insuffisante")
    
    new_client = Client(**client_data.dict())
    await db.clients.insert_one(new_client.dict())
    return new_client

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, current_user: User = Depends(get_current_user)):
    """Récupère un client par ID."""
    if not current_user.permissions.get("clients", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission insuffisante")
    
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")
    
    return Client(**client)

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: ClientUpdate, current_user: User = Depends(get_current_user)):
    """Met à jour un client."""
    if not current_user.permissions.get("clients", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission insuffisante")
    
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")
    
    update_data = {k: v for k, v in client_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.clients.update_one({"id": client_id}, {"$set": update_data})
    updated_client = await db.clients.find_one({"id": client_id})
    return Client(**updated_client)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: User = Depends(get_current_user)):
    """Supprime un client."""
    if not current_user.permissions.get("clients", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission insuffisante")
    
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client non trouvé")
    
    return {"message": "Client supprimé avec succès"}


# =============================================================================
# ROUTES SUPPLÉMENTAIRES (PLACEHOLDER)
# =============================================================================
# Note: Les autres routes (chantiers, calculs PAC, etc.) seront ajoutées
# en suivant le même pattern que les routes clients ci-dessus


# =============================================================================
# INTÉGRATION ROUTEUR
# =============================================================================
app.include_router(api_router)


# =============================================================================
# ÉVÉNEMENTS LIFECYCLE
# =============================================================================
@app.on_event("startup")
async def startup_event():
    """Initialisation au démarrage."""
    await init_default_users()
    logger.info(f"H2EAUX Gestion API démarré - Environnement: {settings.environment}")

@app.on_event("shutdown")
async def shutdown_event():
    """Nettoyage à l'arrêt."""
    client.close()
    logger.info("H2EAUX Gestion API arrêté")


# =============================================================================
# ROUTE RACINE
# =============================================================================
@app.get("/")
async def root():
    """Route racine de l'API."""
    return {
        "message": "H2EAUX Gestion API",
        "version": "3.0.0",
        "docs": "/api/docs" if settings.debug else "Documentation désactivée en production",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info"
    )