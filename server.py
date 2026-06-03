from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from db import client  # noqa: E402
from routes_forms import router as forms_router  # noqa: E402
from routes_payments import router as payments_router, webhook_router  # noqa: E402
from routes_cms import router as cms_router  # noqa: E402
from routes_auth import router as auth_router  # noqa: E402
from seed import run_seed  # noqa: E402

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        seeded = await run_seed()
        logger.info(f'Seeded: {seeded}')
    except Exception as e:
        logger.exception(f'Seed failed: {e}')
    yield
    client.close()


app = FastAPI(title='SAM for Life API', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/api/')
async def root():
    return {'message': 'SAM for Life API'}


@app.get('/api/health')
async def health():
    return {'status': 'ok'}


app.include_router(auth_router)
app.include_router(forms_router)
app.include_router(payments_router)
app.include_router(webhook_router)
app.include_router(cms_router)
