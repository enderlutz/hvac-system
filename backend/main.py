from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import proposals, pricebook

app = FastAPI(title="HVAC Proposal Automation", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(proposals.router, prefix="/proposals", tags=["proposals"])
app.include_router(pricebook.router, prefix="/pricebook", tags=["pricebook"])


@app.get("/")
def root():
    return {"status": "HVAC Proposal API running"}
