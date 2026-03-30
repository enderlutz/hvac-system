import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import init_db
from routers import proposals, pricebook
from routers import pipeline

load_dotenv()

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="HVAC Proposal Automation", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proposals.router, prefix="/proposals", tags=["proposals"])
app.include_router(pricebook.router, prefix="/pricebook", tags=["pricebook"])
app.include_router(pipeline.router, prefix="/pipeline/proposals", tags=["pipeline"])


@app.get("/")
def root():
    return {"status": "HVAC Proposal API running"}
