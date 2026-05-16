# /// script
# requires-python = "==3.11.*"
# dependencies = [
#   "codewords-client==0.4.6",
#   "fastapi==0.116.1",
#   "pyjwt==2.9.0"
# ]
# [tool.env-checker]
# env_vars = [
#   "PORT=8000",
#   "LOGLEVEL=INFO",
#   "CODEWORDS_API_KEY",
#   "CODEWORDS_RUNTIME_URI"
# ]
# ///

"""API backend pour l'application de budget de Thibault & Celine.
Gere la persistance des donnees budgetaires mensuelles via Redis,
les calculs de projection et les alertes de solde negatif.
"""

import json
import hashlib
import uuid as _uuid
import time as _time
from typing import Optional
from contextvars import ContextVar

import jwt as _jwt
from codewords_client import logger, redis_client, run_service
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# -------------------------
# FastAPI Application
# -------------------------
app = FastAPI(
    title="Budget App API",
    description="API pour Budget Thibault & Celine 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Auth System
# -------------------------

JWT_SECRET = "budget-app-2026-secret-xK9mP2"
_uid_var: ContextVar[str] = ContextVar("uid", default="default")

def uid() -> str:
    return _uid_var.get()

def _hash_pw(pw: str) -> str:
    return hashlib.sha256(f"budget-salt-{pw}".encode()).hexdigest()

def _make_token(user_id: str, email: str) -> str:
    return _jwt.encode({"uid": user_id, "email": email, "exp": _time.time() + 86400 * 30}, JWT_SECRET, algorithm="HS256")

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    token = request.headers.get("x-user-token", "")
    u = "default"
    if token:
        try:
            payload = _jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            u = payload.get("uid", "default")
        except Exception:
            pass
    t = _uid_var.set(u)
    response = await call_next(request)
    _uid_var.reset(t)
    return response

MONTH_NAMES = ["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"]

# Multi-year range
START_YEAR = 2026
END_YEAR = 2036
ALL_MONTH_KEYS = [f"{y}-{str(m).zfill(2)}" for y in range(START_YEAR, END_YEAR + 1) for m in range(1, 13)]

def _parse_mk(mk: str) -> tuple:
    """Parse 'YYYY-MM' into (year, month_0based)."""
    p = mk.split("-")
    return int(p[0]), int(p[1]) - 1

def _blank_month(mk: str) -> dict:
    year, mi = _parse_mk(mk)
    return {"month_key": mk, "month_name": MONTH_NAMES[mi], "year": year, "income_salary": 0, "income_other": 0, "income_rente": 0, "income_epargne": 0, "income_actions": 0, "income_virements": 0, "expenses": [], "budget_allocation": {"courses": 0, "restaurants": 0, "services": 0, "revolut": 0, "amex": 0, "cera": 0}, "savings": {"target_monthly": 0, "actual_monthly": 0, "cumulative_target": 0, "cumulative_actual": 0}, "balance_end_of_month": 0, "notes": ""}

# Seed data lookup (populated after DEFAULT_BUDGET_2026)
_SEED_BY_KEY: dict[str, dict] = {}

async def _get_month(redis, ns, mk: str) -> dict:
    """Get month: Redis first, then seed data, then blank."""
    key = f"{ns}:u:{uid()}:budget:{mk}"
    data = await redis.get(key)
    if data:
        return json.loads(data)
    if mk in _SEED_BY_KEY:
        return dict(_SEED_BY_KEY[mk])
    return _blank_month(mk)

async def _get_or_init_month(redis, ns, mk: str) -> dict:
    """Get month for writing — same as _get_month but for mutation endpoints."""
    key = f"{ns}:u:{uid()}:budget:{mk}"
    data = await redis.get(key)
    if data:
        return json.loads(data)
    if mk in _SEED_BY_KEY:
        return dict(_SEED_BY_KEY[mk])
    if mk not in ALL_MONTH_KEYS:
        return None
    return _blank_month(mk)

@app.post("/auth/register")
async def register(request: dict):
    """Register a new user with email + password."""
    email = request.get("email", "").strip().lower()
    password = request.get("password", "")
    name = request.get("name", "")
    if not email or not password or len(password) < 4:
        raise HTTPException(status_code=400, detail="Email et mot de passe requis (min 4 car.)")
    async with redis_client() as (redis, ns):
        if await redis.get(f"{ns}:user:{email}"):
            raise HTTPException(status_code=409, detail="Cet email est deja utilise")
        new_uid = str(_uuid.uuid4())[:8]
        user = {"uid": new_uid, "email": email, "name": name, "pw_hash": _hash_pw(password), "created": _time.time()}
        await redis.set(f"{ns}:user:{email}", json.dumps(user))
        # Months are created lazily on first write. No pre-creation needed.
    return {"success": True, "token": _make_token(new_uid, email), "uid": new_uid, "email": email, "name": name, "needs_onboarding": True}

@app.post("/auth/login")
async def login(request: dict):
    """Login with email + password."""
    email = request.get("email", "").strip().lower()
    password = request.get("password", "")
    async with redis_client() as (redis, ns):
        raw = await redis.get(f"{ns}:user:{email}")
        if not raw:
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
        user = json.loads(raw)
        if user["pw_hash"] != _hash_pw(password):
            raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    return {"success": True, "token": _make_token(user["uid"], email), "uid": user["uid"], "email": email, "name": user.get("name", "")}

@app.get("/auth/me")
async def auth_me():
    """Check if authenticated."""
    u = uid()
    return {"authenticated": u != "default", "uid": u}

# -------------------------
# Data Models
# -------------------------

class ExpenseItem(BaseModel):
    label: str = Field(..., description="Nom de la depense")
    amount: float = Field(..., description="Montant en euros")
    category: str = Field(..., description="Categorie: fixed, variable, investment")
    validated: bool = Field(default=False, description="Depense validee/payee")
    icon: Optional[str] = Field(default=None, description="Icone Lucide")

class BudgetAllocation(BaseModel):
    courses: float = 0
    restaurants: float = 0
    services: float = 0
    revolut: float = 0
    amex: float = 0
    cera: float = 0

class SavingsData(BaseModel):
    target_monthly: float = 140.0
    actual_monthly: float = 0.0
    cumulative_target: float = 0.0
    cumulative_actual: float = 0.0
    # Actions / Cryptos
    pea: float = 0.0
    traderepublic: float = 0.0
    degiro: float = 0.0
    bitstack: float = 0.0
    swissborg: float = 0.0
    # Assurances Vie
    swisslife: float = 0.0
    assurance_vie_conservateur: float = 0.0
    uptimi: float = 0.0
    esalia: float = 0.0
    bdl_investment: float = 0.0
    # RSU
    etrade: float = 0.0
    shareworks: float = 0.0
    # Livrets
    livret_a: float = 0.0
    epargne_revolut: float = 0.0
    ldd: float = 0.0
    lel: float = 0.0
    # Retraite & Autres
    per: float = 0.0
    perco: float = 0.0
    irishlife: float = 0.0
    montres_objets_luxe: float = 0.0
    tontine: float = 0.0

class BudgetMonth(BaseModel):
    month_key: str
    month_name: str
    year: int = 2026
    income_salary: float = 0.0
    income_other: float = 0.0
    expenses: list[ExpenseItem] = []
    budget_allocation: BudgetAllocation = BudgetAllocation()
    savings: SavingsData = SavingsData()
    balance_end_of_month: float = 0.0
    notes: str = ""

class ForecastAlert(BaseModel):
    month_key: str
    month_name: str
    projected_balance: float
    alert_type: str
    message: str

class ApiResponse(BaseModel):
    success: bool = Field(..., description="Succes de l'operation")
    message: str = Field(..., description="Message de retour")
    data: Optional[dict] = Field(default=None, description="Donnees optionnelles")

class BudgetQuery(BaseModel):
    action: str = Field(default="get_months", description="Action: get_months, get_forecast, get_stats")
    year: int = Field(default=2026, description="Annee du budget")

class BudgetQueryResponse(BaseModel):
    success: bool = Field(default=True, description="Succes de la requete")
    action: str = Field(..., description="Action executee")
    data: list = Field(default_factory=list, description="Donnees retournees")
    meta: dict = Field(default_factory=dict, description="Metadonnees de la requete")

# -------------------------
# Excel Seed Data (2026)
# -------------------------

DEFAULT_BUDGET_2026 = [
    {
        "month_key": "2026-01", "month_name": "Janvier", "year": 2026,
        "income_salary": 5437.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": True, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": True, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": True, "icon": "PiggyBank"},
            {"label": "PEA", "amount": 550.0, "category": "investment", "validated": True, "icon": "TrendingUp"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": True, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 1501.0, "category": "investment", "validated": True, "icon": "TrendingUp"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": True, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 70.78, "category": "fixed", "validated": True, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": True, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": True, "icon": "Tv"},
            {"label": "Apple", "amount": 128.2, "category": "fixed", "validated": True, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 1.99, "category": "fixed", "validated": True, "icon": "Bot"},
            {"label": "Paypal", "amount": 1072.2, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Klarna", "amount": 544.57, "category": "variable", "validated": False, "icon": "ShoppingBag"},
            {"label": "Alma", "amount": 122.35, "category": "variable", "validated": False, "icon": "ShoppingCart"},
            {"label": "Peage autoroute", "amount": 17.3, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "HelloFresh", "amount": 213.13, "category": "variable", "validated": False, "icon": "UtensilsCrossed"},
            {"label": "RATP", "amount": 0.0, "category": "variable", "validated": False, "icon": "Train"},
        ],
        "budget_allocation": {"courses": 703.0, "restaurants": 436.0, "services": 409.0, "revolut": 529.99, "amex": 2617.7, "cera": 1016.5},
        "savings": {"target_monthly": 146.0, "actual_monthly": 146.0, "cumulative_target": 146.0, "cumulative_actual": 146.0,
                    "epargne_revolut": 51394.0, "pea": 11194.0, "traderepublic": 5498.0, "bitstack": 0.0,
                    "swissborg": 4532.0, "assurance_vie_conservateur": 12680.0, "per": 3466.0, "livret_a": 23502.0},
        "balance_end_of_month": -5800.0, "notes": ""
    },
    {
        "month_key": "2026-02", "month_name": "Fevrier", "year": 2026,
        "income_salary": 5659.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": True, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": True, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": True, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": True, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": True, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 51.52, "category": "investment", "validated": True, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": True, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 70.78, "category": "fixed", "validated": True, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 55.0, "category": "fixed", "validated": True, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": True, "icon": "Tv"},
            {"label": "Apple", "amount": 128.2, "category": "fixed", "validated": True, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 1.99, "category": "fixed", "validated": True, "icon": "Bot"},
            {"label": "Paypal", "amount": 697.22, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Klarna", "amount": 522.92, "category": "variable", "validated": False, "icon": "ShoppingBag"},
            {"label": "Alma", "amount": 124.72, "category": "variable", "validated": False, "icon": "ShoppingCart"},
            {"label": "Peage autoroute", "amount": 9.7, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "HelloFresh", "amount": 115.82, "category": "variable", "validated": False, "icon": "UtensilsCrossed"},
        ],
        "budget_allocation": {"courses": 676.0, "restaurants": 308.0, "services": 433.0, "revolut": 741.0, "amex": 2238.0, "cera": 179.0},
        "savings": {"target_monthly": 135.0, "actual_monthly": 135.0, "cumulative_target": 281.0, "cumulative_actual": 281.0,
                    "epargne_revolut": 49394.0, "pea": 0.0, "traderepublic": 6740.0, "bitstack": 51.0,
                    "swissborg": 7050.0, "assurance_vie_conservateur": 11669.0, "per": 3820.0, "livret_a": 23502.0},
        "balance_end_of_month": -3232.0, "notes": ""
    },
    {
        "month_key": "2026-03", "month_name": "Mars", "year": 2026,
        "income_salary": 4464.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 700.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 89.36, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 128.2, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 21.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Paypal", "amount": 538.93, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Klarna", "amount": 497.12, "category": "variable", "validated": False, "icon": "ShoppingBag"},
            {"label": "Alma", "amount": 119.23, "category": "variable", "validated": False, "icon": "ShoppingCart"},
            {"label": "Peage autoroute", "amount": 5.2, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "HelloFresh", "amount": 122.22, "category": "variable", "validated": False, "icon": "UtensilsCrossed"},
        ],
        "budget_allocation": {"courses": 633.0, "restaurants": 803.0, "services": 135.0, "revolut": 715.15, "amex": 2482.0, "cera": 0.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 421.0, "cumulative_actual": 421.0,
                    "epargne_revolut": 49670.0, "pea": 0.0, "traderepublic": 7580.0, "bitstack": 102.0,
                    "swissborg": 7050.0, "assurance_vie_conservateur": 11669.0, "per": 3970.0, "livret_a": 23502.0},
        "balance_end_of_month": 205.2, "notes": ""
    },
    {
        "month_key": "2026-04", "month_name": "Avril", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 128.2, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Vacances", "amount": 1300.0, "category": "variable", "validated": False, "icon": "Plane"},
            {"label": "Cadeaux", "amount": 100.0, "category": "variable", "validated": False, "icon": "Gift"},
            {"label": "Paypal", "amount": 537.78, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Alma", "amount": 119.23, "category": "variable", "validated": False, "icon": "ShoppingCart"},
            {"label": "Peage autoroute", "amount": 5.2, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
            {"label": "Cartes Bancaires", "amount": 172.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Projet", "amount": 119.9, "category": "variable", "validated": False, "icon": "Briefcase"},
        ],
        "budget_allocation": {"courses": 570.67, "restaurants": 465.67, "services": 275.67, "revolut": 662.05, "amex": 2445.9, "cera": 398.5},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 561.0, "cumulative_actual": 561.0,
                    "epargne_revolut": 49679.0, "pea": 0.0, "traderepublic": 7930.0, "bitstack": 157.0,
                    "swissborg": 7050.0, "assurance_vie_conservateur": 11669.0, "per": 4120.0, "livret_a": 23502.0},
        "balance_end_of_month": -3058.26, "notes": ""
    },
    {
        "month_key": "2026-05", "month_name": "Mai", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 128.2, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Vacances", "amount": 3224.0, "category": "variable", "validated": False, "icon": "Plane"},
            {"label": "Paypal", "amount": 129.4, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Alma", "amount": 119.23, "category": "variable", "validated": False, "icon": "ShoppingCart"},
            {"label": "Peage autoroute", "amount": 15.0, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
        ],
        "budget_allocation": {"courses": 545.67, "restaurants": 453.17, "services": 263.17, "revolut": 662.05, "amex": 400.0, "cera": 50.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 701.0, "cumulative_actual": 701.0,
                    "epargne_revolut": 0.0, "pea": 0.0, "traderepublic": 0.0, "bitstack": 0.0,
                    "swissborg": 0.0, "assurance_vie_conservateur": 0.0, "per": 0.0, "livret_a": 0.0},
        "balance_end_of_month": -295.37, "notes": ""
    },
    {
        "month_key": "2026-06", "month_name": "Juin", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 88.28, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Cadeaux", "amount": 100.0, "category": "variable", "validated": False, "icon": "Gift"},
            {"label": "Paypal", "amount": 104.65, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Tennis", "amount": 250.0, "category": "variable", "validated": False, "icon": "Activity"},
            {"label": "Peage autoroute", "amount": 15.0, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
        ],
        "budget_allocation": {"courses": 525.67, "restaurants": 443.17, "services": 253.17, "revolut": 662.05, "amex": 400.0, "cera": 50.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 841.0, "cumulative_actual": 841.0,
                    "epargne_revolut": 0.0, "pea": 0.0, "traderepublic": 0.0, "bitstack": 0.0,
                    "swissborg": 0.0, "assurance_vie_conservateur": 0.0, "per": 0.0, "livret_a": 0.0},
        "balance_end_of_month": 2722.61, "notes": ""
    },
    {
        "month_key": "2026-07", "month_name": "Juillet", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 88.28, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Paypal", "amount": 91.75, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Tennis", "amount": 250.0, "category": "variable", "validated": False, "icon": "Activity"},
            {"label": "Projet", "amount": 2500.0, "category": "variable", "validated": False, "icon": "Briefcase"},
            {"label": "Cartes Bancaires", "amount": 199.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Peage autoroute", "amount": 15.0, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
        ],
        "budget_allocation": {"courses": 509.0, "restaurants": 434.83, "services": 244.83, "revolut": 662.05, "amex": 400.0, "cera": 50.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 981.0, "cumulative_actual": 981.0,
                    "epargne_revolut": 0.0, "pea": 0.0, "traderepublic": 0.0, "bitstack": 0.0,
                    "swissborg": 0.0, "assurance_vie_conservateur": 0.0, "per": 0.0, "livret_a": 0.0},
        "balance_end_of_month": 123.43, "notes": ""
    },
    {
        "month_key": "2026-08", "month_name": "Aout", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 88.28, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Tennis", "amount": 250.0, "category": "variable", "validated": False, "icon": "Activity"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Peage autoroute", "amount": 15.0, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
        ],
        "budget_allocation": {"courses": 494.71, "restaurants": 427.69, "services": 237.69, "revolut": 662.05, "amex": 400.0, "cera": 50.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 1121.0, "cumulative_actual": 1121.0,
                    "epargne_revolut": 47858.0, "pea": 0.0, "traderepublic": 0.0, "bitstack": 0.0,
                    "swissborg": 0.0, "assurance_vie_conservateur": 0.0, "per": 0.0, "livret_a": 0.0},
        "balance_end_of_month": 2967.18, "notes": ""
    },
    {
        "month_key": "2026-09", "month_name": "Septembre", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 88.28, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Cadeaux", "amount": 200.0, "category": "variable", "validated": False, "icon": "Gift"},
            {"label": "Projet", "amount": 100.0, "category": "variable", "validated": False, "icon": "Briefcase"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Peage autoroute", "amount": 15.0, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
        ],
        "budget_allocation": {"courses": 482.21, "restaurants": 421.44, "services": 231.44, "revolut": 662.05, "amex": 400.0, "cera": 50.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 1261.0, "cumulative_actual": 1261.0,
                    "epargne_revolut": 0.0, "pea": 0.0, "traderepublic": 0.0, "bitstack": 0.0,
                    "swissborg": 0.0, "assurance_vie_conservateur": 0.0, "per": 0.0, "livret_a": 0.0},
        "balance_end_of_month": 2917.18, "notes": ""
    },
    {
        "month_key": "2026-10", "month_name": "Octobre", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 88.28, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Cadeaux", "amount": 100.0, "category": "variable", "validated": False, "icon": "Gift"},
            {"label": "Projet", "amount": 100.0, "category": "variable", "validated": False, "icon": "Briefcase"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Peage autoroute", "amount": 15.0, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
        ],
        "budget_allocation": {"courses": 471.1, "restaurants": 415.88, "services": 225.88, "revolut": 662.05, "amex": 400.0, "cera": 50.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 1401.0, "cumulative_actual": 1401.0,
                    "epargne_revolut": 0.0, "pea": 0.0, "traderepublic": 0.0, "bitstack": 0.0,
                    "swissborg": 0.0, "assurance_vie_conservateur": 0.0, "per": 0.0, "livret_a": 0.0},
        "balance_end_of_month": 3017.18, "notes": ""
    },
    {
        "month_key": "2026-11", "month_name": "Novembre", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 88.28, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Cadeaux", "amount": 400.0, "category": "variable", "validated": False, "icon": "Gift"},
            {"label": "Projet", "amount": 100.0, "category": "variable", "validated": False, "icon": "Briefcase"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Peage autoroute", "amount": 15.0, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
        ],
        "budget_allocation": {"courses": 461.1, "restaurants": 410.88, "services": 220.88, "revolut": 662.05, "amex": 400.0, "cera": 50.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 1541.0, "cumulative_actual": 1541.0,
                    "epargne_revolut": 0.0, "pea": 0.0, "traderepublic": 0.0, "bitstack": 0.0,
                    "swissborg": 0.0, "assurance_vie_conservateur": 0.0, "per": 0.0, "livret_a": 0.0},
        "balance_end_of_month": 2717.18, "notes": ""
    },
    {
        "month_key": "2026-12", "month_name": "Decembre", "year": 2026,
        "income_salary": 6000.0, "income_other": 0.0,
        "expenses": [
            {"label": "Loyer", "amount": 1433.0, "category": "fixed", "validated": False, "icon": "Home"},
            {"label": "Assurance Vie (Le Conservateur)", "amount": 100.0, "category": "investment", "validated": False, "icon": "Shield"},
            {"label": "PER", "amount": 150.0, "category": "investment", "validated": False, "icon": "PiggyBank"},
            {"label": "BDL Investment", "amount": 50.0, "category": "investment", "validated": False, "icon": "BarChart2"},
            {"label": "TradeRepublic / Swissborg", "amount": 350.0, "category": "investment", "validated": False, "icon": "TrendingUp"},
            {"label": "Bitstack", "amount": 85.0, "category": "investment", "validated": False, "icon": "Bitcoin"},
            {"label": "BPCE Assurance", "amount": 42.0, "category": "fixed", "validated": False, "icon": "Shield"},
            {"label": "Octopus Energy", "amount": 68.09, "category": "fixed", "validated": False, "icon": "Zap"},
            {"label": "Bouygues Telecom", "amount": 52.0, "category": "fixed", "validated": False, "icon": "Wifi"},
            {"label": "Canal+ / Amazon / Netflix", "amount": 88.96, "category": "fixed", "validated": False, "icon": "Tv"},
            {"label": "Apple", "amount": 88.28, "category": "fixed", "validated": False, "icon": "Smartphone"},
            {"label": "Google AI", "amount": 7.99, "category": "fixed", "validated": False, "icon": "Bot"},
            {"label": "Cadeaux", "amount": 500.0, "category": "variable", "validated": False, "icon": "Gift"},
            {"label": "Projet", "amount": 100.0, "category": "variable", "validated": False, "icon": "Briefcase"},
            {"label": "Cartes Bancaires", "amount": 7.5, "category": "variable", "validated": False, "icon": "CreditCard"},
            {"label": "Peage autoroute", "amount": 15.0, "category": "variable", "validated": False, "icon": "Car"},
            {"label": "RATP", "amount": 45.0, "category": "variable", "validated": False, "icon": "Train"},
        ],
        "budget_allocation": {"courses": 452.01, "restaurants": 406.34, "services": 216.34, "revolut": 662.05, "amex": 400.0, "cera": 50.0},
        "savings": {"target_monthly": 140.0, "actual_monthly": 140.0, "cumulative_target": 1681.0, "cumulative_actual": 1681.0,
                    "epargne_revolut": 0.0, "pea": 0.0, "traderepublic": 0.0, "bitstack": 0.0,
                    "swissborg": 0.0, "assurance_vie_conservateur": 0.0, "per": 0.0, "livret_a": 0.0},
        "balance_end_of_month": 2617.18, "notes": ""
    },
]

# Populate seed lookup
for _m in DEFAULT_BUDGET_2026:
    _SEED_BY_KEY[_m["month_key"]] = _m

# -------------------------
# API Endpoints
# -------------------------

@app.post("/", response_model=BudgetQueryResponse)
async def main_endpoint(request: BudgetQuery):
    """Point d'entree principal. Actions: get_months, get_forecast, get_stats."""
    year = request.year
    if request.action == "get_forecast":
        result = await get_forecast(year=year)
        return BudgetQueryResponse(success=True, action=request.action, data=result.get("months", []), meta={"alerts": result.get("alerts", []), "total_income": result.get("total_income", 0), "total_expenses": result.get("total_expenses", 0), "total_savings": result.get("total_savings", 0)})
    elif request.action == "get_stats":
        result = await get_stats(year=year)
        return BudgetQueryResponse(success=True, action=request.action, data=[], meta=result)
    else:
        result = await get_all_months(year=year)
        return BudgetQueryResponse(success=True, action=request.action, data=result.get("months", []), meta={"count": result.get("count", 0), "year": year, "years": result.get("years", [])})


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "budget_app_api"}


@app.post("/seed", response_model=ApiResponse)
async def seed_excel_data():
    """Seed budget data from Excel file (first-time setup)."""
    logger.info("Seeding budget data from Excel...")
    async with redis_client() as (redis, ns):
        for month_data in DEFAULT_BUDGET_2026:
            key = f"{ns}:u:{uid()}:budget:{month_data['month_key']}"
            await redis.set(key, json.dumps(month_data))
            logger.info(f"Seeded {month_data['month_key']}")
    return ApiResponse(success=True, message="Donnees Excel importees avec succes (12 mois 2026)")


@app.get("/months")
async def get_all_months(year: int = START_YEAR):
    """Get all budget months for a given year (default: 2026)."""
    if year < START_YEAR or year > END_YEAR:
        raise HTTPException(status_code=400, detail=f"Annee hors plage ({START_YEAR}-{END_YEAR})")
    logger.info("Loading months", year=year)
    keys = [mk for mk in ALL_MONTH_KEYS if mk.startswith(f"{year}-")]
    months = []
    async with redis_client() as (redis, ns):
        for mk in keys:
            months.append(await _get_month(redis, ns, mk))
    return {"months": months, "count": len(months), "year": year, "years": list(range(START_YEAR, END_YEAR + 1))}


@app.get("/month/{month_key}")
async def get_month(month_key: str):
    """Get a specific month's data."""
    if month_key not in ALL_MONTH_KEYS:
        raise HTTPException(status_code=404, detail=f"Mois {month_key} hors plage ({START_YEAR}-{END_YEAR})")
    async with redis_client() as (redis, ns):
        return await _get_month(redis, ns, month_key)


@app.put("/month/{month_key}")
async def update_month(month_key: str, month_data: BudgetMonth):
    """Update a specific month's data."""
    logger.info(f"Updating month {month_key}")
    data_dict = month_data.model_dump()
    data_dict["month_key"] = month_key
    async with redis_client() as (redis, ns):
        key = f"{ns}:u:{uid()}:budget:{month_key}"
        await redis.set(key, json.dumps(data_dict))
    return {"success": True, "message": f"Mois {month_key} mis a jour", "data": data_dict}


@app.patch("/month/{month_key}/expense")
async def update_expense(month_key: str, request: dict):
    """Update a single expense (validate or change amount)."""
    logger.info(f"Updating expense in {month_key}: {request}")
    async with redis_client() as (redis, ns):
        month_data = await _get_or_init_month(redis, ns, month_key)
        if not month_data:
            raise HTTPException(status_code=404, detail=f"Mois {month_key} hors plage")
        key = f"{ns}:u:{uid()}:budget:{month_key}"
        label = request.get("label")
        for expense in month_data["expenses"]:
            if expense["label"] == label:
                if "amount" in request:
                    expense["amount"] = request["amount"]
                if "validated" in request:
                    expense["validated"] = request["validated"]
                break
        await redis.set(key, json.dumps(month_data))
    return {"success": True, "data": month_data}


@app.patch("/month/{month_key}/income")
async def update_income(month_key: str, request: dict):
    """Update income for a month."""
    logger.info(f"Updating income in {month_key}: {request}")
    async with redis_client() as (redis, ns):
        month_data = await _get_or_init_month(redis, ns, month_key)
        if not month_data:
            raise HTTPException(status_code=404, detail=f"Mois {month_key} hors plage")
        key = f"{ns}:u:{uid()}:budget:{month_key}"
        for k, v in request.items():
            if k.startswith("income_"):
                month_data[k] = float(v)
        await redis.set(key, json.dumps(month_data))
    return {"success": True, "data": month_data}


@app.patch("/month/{month_key}/savings")
async def update_savings(month_key: str, request: dict):
    """Update savings data for a month."""
    logger.info(f"Updating savings in {month_key}")
    async with redis_client() as (redis, ns):
        month_data = await _get_or_init_month(redis, ns, month_key)
        if not month_data:
            raise HTTPException(status_code=404, detail=f"Mois {month_key} hors plage")
        key = f"{ns}:u:{uid()}:budget:{month_key}"
        for field, value in request.items():
            month_data["savings"][field] = value
        await redis.set(key, json.dumps(month_data))
    return {"success": True, "data": month_data}


@app.post("/month/{month_key}/expense")
async def add_expense(month_key: str, request: dict):
    """Add a new expense to a month, optionally propagating to all subsequent months."""
    logger.info("Adding expense", month_key=month_key)
    propagate = request.get("propagate", False)
    propagate_months = request.get("propagate_months", [])  # specific months
    default_icons = {"fixed": "CreditCard", "investment": "TrendingUp", "variable": "ShoppingCart"}
    category = request.get("category", "variable")
    new_expense = {
        "label": request.get("label", "Nouvelle depense"),
        "amount": float(request.get("amount", 0.0)),
        "category": category,
        "validated": False,
        "icon": default_icons.get(category, "CreditCard"),
    }
    if propagate_months:
        target_months = propagate_months
    elif propagate:
        target_months = [mk for mk in ALL_MONTH_KEYS if mk >= month_key]
    else:
        target_months = [month_key]
    updated_months = []
    async with redis_client() as (redis, ns):
        for mk in target_months:
            rkey = f"{ns}:u:{uid()}:budget:{mk}"
            month_data = await _get_or_init_month(redis, ns, mk)
            if not month_data:
                continue
            if not any(e["label"] == new_expense["label"] for e in month_data["expenses"]):
                month_data["expenses"].append(new_expense.copy())
                await redis.set(rkey, json.dumps(month_data))
                updated_months.append(mk)
    return {"success": True, "propagated_to": len(updated_months), "months": updated_months}


@app.delete("/month/{month_key}/expense/{label}")
async def delete_expense(month_key: str, label: str):
    """Delete an expense from a month by label."""
    logger.info("Deleting expense", month_key=month_key, label=label)
    async with redis_client() as (redis, ns):
        rkey = f"{ns}:u:{uid()}:budget:{month_key}"
        month_data = await _get_or_init_month(redis, ns, month_key)
        if not month_data:
            raise HTTPException(status_code=404, detail=f"Mois {month_key} hors plage")
        before = len(month_data["expenses"])
        month_data["expenses"] = [e for e in month_data["expenses"] if e["label"] != label]
        if len(month_data["expenses"]) == before:
            raise HTTPException(status_code=404, detail=f"Depense '{label}' non trouvee")
        await redis.set(rkey, json.dumps(month_data))
    return {"success": True, "data": month_data}


@app.patch("/month/{month_key}/portfolio-values")
async def update_portfolio_values(month_key: str, request: dict):
    """Update current portfolio market values."""
    logger.info("Updating portfolio values", month_key=month_key)
    async with redis_client() as (redis, ns):
        rkey = f"{ns}:u:{uid()}:budget:{month_key}"
        month_data = await _get_or_init_month(redis, ns, month_key)
        if not month_data:
            raise HTTPException(status_code=404, detail=f"Mois {month_key} hors plage")
        if "portfolio_values" not in month_data:
            month_data["portfolio_values"] = {}
        for k, v in request.items():
            month_data["portfolio_values"][k] = float(v)
        await redis.set(rkey, json.dumps(month_data))
    return {"success": True, "data": month_data}


@app.patch("/month/{month_key}/budget-allocation")
async def update_budget_allocation(month_key: str, request: dict):
    """Update budget allocation amounts and/or validated status."""
    logger.info("Updating budget allocation", month_key=month_key)
    async with redis_client() as (redis, ns):
        rkey = f"{ns}:u:{uid()}:budget:{month_key}"
        month_data = await _get_or_init_month(redis, ns, month_key)
        if not month_data:
            raise HTTPException(status_code=404, detail=f"Mois {month_key} hors plage")
        if "budget_validated" not in month_data:
            month_data["budget_validated"] = {}
        if "amounts" in request:
            for k, v in request["amounts"].items():
                month_data["budget_allocation"][k] = v
        if "delete_key" in request:
            month_data["budget_allocation"].pop(request["delete_key"], None)
            month_data.get("budget_validated", {}).pop(request["delete_key"], None)
        if "add_key" in request:
            month_data["budget_allocation"][request["add_key"]] = float(request.get("add_amount", 0))
        if "rename" in request:
            old_k, new_k = request["rename"]["old"], request["rename"]["new"]
            if old_k in month_data["budget_allocation"]:
                month_data["budget_allocation"][new_k] = month_data["budget_allocation"].pop(old_k)
                bv = month_data.get("budget_validated", {})
                if old_k in bv:
                    bv[new_k] = bv.pop(old_k)
        if "validated" in request:
            for k, v in request["validated"].items():
                month_data["budget_validated"][k] = v
        await redis.set(rkey, json.dumps(month_data))
    return {"success": True, "data": month_data}


DEFAULT_SALARY_HISTORY = {
    "years": [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015],
    "months": [
        {"name": "Janvier", "values": [8097, 10108, 10242, 6946, 6888, 15411, 100000, 4640, 0, 0, 0, 0]},
        {"name": "Fevrier", "values": [8097, 29105, 21882, 6887, 9416, 7417, 0, 29406, 0, 0, 0, 0]},
        {"name": "Mars", "values": [6639, 13810, 10997, 23723, 6888, 6888, 0, 54000, 0, 0, 0, 0]},
        {"name": "Avril", "values": [9500, 10112, 10000, 38335, 6888, 6943, 0, 0, 0, 0, 0, 0]},
        {"name": "Mai", "values": [9000, 16417, 14045, 4575, 9589, 9045, 0, 0, 0, 0, 0, 0]},
        {"name": "Juin", "values": [0, 11651, 13419, 20149, 7785, 7172, 0, 0, 0, 0, 0, 0]},
        {"name": "Juillet", "values": [0, 30157, 10211, 15475, 6888, 6888, 0, 0, 0, 0, 0, 0]},
        {"name": "Aout", "values": [0, 0, 13928, 18726, 6888, 7854, 0, 0, 0, 0, 0, 0]},
        {"name": "Septembre", "values": [0, 44437, 11327, 14132, 12623, 6888, 0, 0, 0, 0, 0, 0]},
        {"name": "Octobre", "values": [0, 8097, 11231, 10000, 7956, 6888, 0, 0, 0, 0, 0, 0]},
        {"name": "Novembre", "values": [0, 34973, 17001, 10000, 6888, 15277, 0, 0, 0, 0, 0, 0]},
        {"name": "Decembre", "values": [0, 46597, 10000, 10012, 6888, 6888, 0, 0, 0, 0, 0, 0]},
    ],
    "totals": [41333, 255464, 154283, 178960, 95585, 103559, 100000, 88046, 75046, 67715, 48436, 26418],
}


@app.get("/salary-history")
async def get_salary_history():
    """Get salary history data."""
    async with redis_client() as (redis, ns):
        data = await redis.get(f"{ns}:u:{uid()}:salary_history")
        if data:
            return json.loads(data)
    return DEFAULT_SALARY_HISTORY


@app.put("/salary-history")
async def save_salary_history(request: dict):
    """Save salary history data."""
    async with redis_client() as (redis, ns):
        await redis.set(f"{ns}:u:{uid()}:salary_history", json.dumps(request))
    return {"success": True}


@app.patch("/salary-history")
async def patch_salary_cell(request: dict):
    """Update a single salary cell."""
    month_idx = request.get("month_idx", 0)
    year_idx = request.get("year_idx", 0)
    value = float(request.get("value", 0))
    async with redis_client() as (redis, ns):
        raw = await redis.get(f"{ns}:u:{uid()}:salary_history")
        data = json.loads(raw) if raw else dict(DEFAULT_SALARY_HISTORY)
        data["months"][month_idx]["values"][year_idx] = value
        data["totals"][year_idx] = sum(m["values"][year_idx] for m in data["months"])
        await redis.set(f"{ns}:u:{uid()}:salary_history", json.dumps(data))
    return {"success": True, "data": data}


@app.post("/migrate")
async def migrate_data(request: dict):
    """Migrate data from default user to a registered user by email."""
    email = request.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")
    async with redis_client() as (redis, ns):
        raw = await redis.get(f"{ns}:user:{email}")
        if not raw:
            raise HTTPException(status_code=404, detail="Utilisateur non trouve")
        user = json.loads(raw)
        target_uid = user["uid"]
        migrated = 0
        for i in range(1, 13):
            mk = f"2026-{str(i).zfill(2)}"
            src = f"{ns}:u:default:budget:{mk}"
            dst = f"{ns}:u:{target_uid}:budget:{mk}"
            data = await redis.get(src)
            if data:
                await redis.set(dst, data)
                migrated += 1
        src_sal = f"{ns}:u:default:salary_history"
        dst_sal = f"{ns}:u:{target_uid}:salary_history"
        sal = await redis.get(src_sal)
        if sal:
            await redis.set(dst_sal, sal)
    return {"success": True, "migrated_months": migrated, "target_uid": target_uid}


@app.post("/onboarding")
async def setup_onboarding(request: dict):
    """Setup initial budget from onboarding wizard."""
    salary = float(request.get("salary", 0))
    fixed_expenses = request.get("fixed_expenses", [])  # [{label, amount, icon?}]
    savings_target = float(request.get("savings_target", 0))
    start_year = int(request.get("start_year", START_YEAR))
    logger.info("Onboarding setup", salary=salary, start_year=start_year)
    default_icons = {"fixed": "CreditCard", "investment": "TrendingUp", "variable": "ShoppingCart"}
    expenses = []
    for fe in fixed_expenses:
        cat = fe.get("category", "fixed")
        expenses.append({
            "label": fe.get("label", "Depense"),
            "amount": float(fe.get("amount", 0)),
            "category": cat,
            "validated": False,
            "icon": fe.get("icon", default_icons.get(cat, "CreditCard")),
        })
    created = 0
    async with redis_client() as (redis, ns):
        for i in range(12):
            mk = f"{start_year}-{str(i+1).zfill(2)}"
            month = _blank_month(mk)
            month["income_salary"] = salary
            month["expenses"] = [dict(e) for e in expenses]
            month["savings"]["target_monthly"] = savings_target
            await redis.set(f"{ns}:u:{uid()}:budget:{mk}", json.dumps(month))
            created += 1
        # Mark onboarding done
        u = uid()
        raw = None
        # Find user by uid to update
        keys_iter = redis.scan_iter(f"{ns}:user:*")
        async for ukey in keys_iter:
            udata = await redis.get(ukey)
            if udata:
                ud = json.loads(udata)
                if ud.get("uid") == u:
                    ud["onboarded"] = True
                    await redis.set(ukey, json.dumps(ud))
                    break
    return {"success": True, "months_created": created, "year": start_year}


@app.get("/forecast")
async def get_forecast(year: Optional[int] = None):
    """Calculate 12-month budget forecast with alerts. Default: rolling 12 months from today."""
    import datetime
    logger.info("Calculating forecast...", year=year)
    if year:
        keys = [mk for mk in ALL_MONTH_KEYS if mk.startswith(f"{year}-")]
    else:
        now = datetime.date.today()
        start_mk = f"{now.year}-{str(now.month).zfill(2)}"
        start_idx = ALL_MONTH_KEYS.index(start_mk) if start_mk in ALL_MONTH_KEYS else 0
        keys = ALL_MONTH_KEYS[start_idx:start_idx + 12]
    forecast_months = []
    alerts = []
    total_income = 0.0
    total_expenses = 0.0
    total_savings = 0.0
    cumulative = 0.0
    async with redis_client() as (redis, ns):
        for mk in keys:
            month_data = await _get_month(redis, ns, mk)
            income = sum(float(v) for k, v in month_data.items() if k.startswith("income_") and isinstance(v, (int, float)))
            expenses_non_invest = sum(e["amount"] for e in month_data.get("expenses", []) if e.get("category") != "investment")
            invest_sum = sum(e["amount"] for e in month_data.get("expenses", []) if e.get("category") == "investment")
            budget_alloc = month_data.get("budget_allocation", {})
            budget_env_total = sum(v for v in budget_alloc.values() if isinstance(v, (int, float)))
            savings_t = month_data.get("savings", {}).get("target_monthly", 140)
            savings_total = savings_t + invest_sum
            expenses_display = expenses_non_invest + budget_env_total
            balance = round(income - expenses_display - savings_total, 2)
            cumulative = round(cumulative + balance, 2)
            total_income += income
            total_expenses += expenses_display
            total_savings += savings_total
            if balance < 0:
                alert_type = "danger"
                msg = f"Solde negatif prevu : {balance:+.0f}EUR - Reviser les depenses"
            elif balance < 300:
                alert_type = "warning"
                msg = f"Solde tres serre : {balance:.0f}EUR restants"
            else:
                alert_type = "ok"
                msg = f"Solde positif : {balance:.0f}EUR"
            yr, mi = _parse_mk(mk)
            forecast_months.append({
                "month_key": mk,
                "month_name": f"{MONTH_NAMES[mi]} {yr}",
                "income": income,
                "expenses": expenses_display,
                "expenses_detail": expenses_non_invest,
                "budget_envelopes": budget_env_total,
                "savings_target": savings_total,
                "balance": balance,
                "cumulative": cumulative,
                "alert_type": alert_type,
            })
            if alert_type in ("danger", "warning"):
                alerts.append({
                    "month_key": mk,
                    "month_name": f"{MONTH_NAMES[mi]} {yr}",
                    "projected_balance": balance,
                    "alert_type": alert_type,
                    "message": msg
                })
    return {
        "months": forecast_months,
        "alerts": alerts,
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "total_savings": round(total_savings, 2),
    }


@app.get("/stats")
async def get_stats(year: int = START_YEAR):
    """Get summary statistics for a given year."""
    logger.info("Getting stats...", year=year)
    keys = [mk for mk in ALL_MONTH_KEYS if mk.startswith(f"{year}-")]
    months_data = []
    async with redis_client() as (redis, ns):
        for mk in keys:
            months_data.append(await _get_month(redis, ns, mk))
    total_income = sum(sum(float(v) for k, v in m.items() if k.startswith("income_") and isinstance(v, (int, float))) for m in months_data)
    total_expenses = sum(sum(e["amount"] for e in m.get("expenses", [])) for m in months_data)
    total_savings = sum(m.get("savings", {}).get("target_monthly", 0) for m in months_data)
    validated_count = sum(
        sum(1 for e in m.get("expenses", []) if e.get("validated", False))
        for m in months_data
    )
    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "total_savings": round(total_savings, 2),
        "net_balance": round(total_income - total_expenses - total_savings, 2),
        "validated_expenses": validated_count,
        "months_count": len(months_data),
        "year": year,
    }


# -------------------------
# Savings Goals
# -------------------------

@app.get("/savings-goals")
async def get_savings_goals():
    """Get all savings goals for the user."""
    async with redis_client() as (redis, ns):
        data = await redis.get(f"{ns}:u:{uid()}:savings_goals")
        if data:
            return json.loads(data)
    return {"goals": []}

@app.post("/savings-goals")
async def add_savings_goal(request: dict):
    """Add a new savings goal."""
    goal = {
        "id": str(_uuid.uuid4())[:8],
        "name": request.get("name", "Nouvel objectif"),
        "target": float(request.get("target", 0)),
        "current": float(request.get("current", 0)),
        "target_date": request.get("target_date", ""),
        "color": request.get("color", "#16a34a"),
        "validated_months": [],
        "created": _time.time(),
    }
    async with redis_client() as (redis, ns):
        key = f"{ns}:u:{uid()}:savings_goals"
        raw = await redis.get(key)
        data = json.loads(raw) if raw else {"goals": []}
        data["goals"].append(goal)
        await redis.set(key, json.dumps(data))
    return {"success": True, "goal": goal}

@app.patch("/savings-goals/{goal_id}")
async def update_savings_goal(goal_id: str, request: dict):
    """Update a savings goal (amount, validate month, etc)."""
    async with redis_client() as (redis, ns):
        key = f"{ns}:u:{uid()}:savings_goals"
        raw = await redis.get(key)
        if not raw:
            raise HTTPException(status_code=404, detail="Aucun objectif")
        data = json.loads(raw)
        for g in data["goals"]:
            if g["id"] == goal_id:
                if "current" in request:
                    g["current"] = float(request["current"])
                if "name" in request:
                    g["name"] = request["name"]
                if "target" in request:
                    g["target"] = float(request["target"])
                if "target_date" in request:
                    g["target_date"] = request["target_date"]
                if "color" in request:
                    g["color"] = request["color"]
                if "validate_month" in request:
                    mk = request["validate_month"]
                    amt = request.get("validate_amount", 0)
                    # Store as {mk, amount} for exact reversal
                    g.setdefault("validated_months", [])
                    if not any((vm.get("mk") if isinstance(vm, dict) else vm) == mk for vm in g["validated_months"]):
                        g["validated_months"].append({"mk": mk, "amount": amt})
                if "unvalidate_month" in request:
                    mk = request["unvalidate_month"]
                    g["validated_months"] = [vm for vm in g.get("validated_months", []) if (vm.get("mk") if isinstance(vm, dict) else vm) != mk]
                break
        await redis.set(key, json.dumps(data))
    return {"success": True, "data": data}

@app.delete("/savings-goals/{goal_id}")
async def delete_savings_goal(goal_id: str):
    """Delete a savings goal."""
    async with redis_client() as (redis, ns):
        key = f"{ns}:u:{uid()}:savings_goals"
        raw = await redis.get(key)
        if not raw:
            raise HTTPException(status_code=404, detail="Aucun objectif")
        data = json.loads(raw)
        data["goals"] = [g for g in data["goals"] if g["id"] != goal_id]
        await redis.set(key, json.dumps(data))
    return {"success": True}


if __name__ == "__main__":
    run_service(app)
