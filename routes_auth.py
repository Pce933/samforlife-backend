from fastapi import APIRouter, HTTPException, Depends
from models import LoginRequest
from db import admin_users
from auth import verify_password, create_token, require_admin

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/login')
async def login(payload: LoginRequest):
    user = await admin_users.find_one({'email': payload.email.lower()})
    if not user or not verify_password(payload.password, user.get('password_hash', '')):
        raise HTTPException(401, 'Invalid email or password')
    token = create_token(user['email'])
    return {
        'token': token,
        'user': {'email': user['email'], 'name': user.get('name', 'Admin')},
    }


@router.get('/me')
async def me(admin=Depends(require_admin)):
    return admin
