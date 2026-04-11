import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.security import verify_password, create_access_token, create_refresh_token, decode_token, get_password_hash
from core.config import get_settings
from models.user import User
from schemas.user import LoginRequest, TokenResponse, RefreshRequest, UserResponse

router = APIRouter(tags=["auth"])
settings = get_settings()

def set_auth_cookies(
    *,
    request: Request,
    response: Response,
    access_token: str,
    access_expires_in_seconds: int,
) -> None:
    """
    为 BlueNet 客户端设置认证 Cookie。

    - 使用 HttpOnly Cookie，便于服务端中间件（例如 Next.js middleware）校验 JWT。
    - 默认 SameSite=Lax，适配常见的浏览器导航/跳转流程。
    """
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    secure = forwarded_proto == "https"
    response.set_cookie(
        key="bluenet_token",
        value=access_token,
        max_age=access_expires_in_seconds,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    校验用户凭据并返回 JWT 令牌。

    同时设置 HttpOnly Cookie（bluenet_token / bluenet_refresh_token），
    便于网关/前端应用进行服务端鉴权（例如 Next.js middleware）。
    """
    result = await db.execute(select(User).where(User.username == body.username, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    token_data = {"sub": str(user.id), "username": user.username, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    set_auth_cookies(
        request=request,
        response=response,
        access_token=access_token,
        access_expires_in_seconds=settings.jwt_expire_minutes * 60,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.jwt_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    使用刷新令牌换取新的 access/refresh 令牌对。
    """
    exc = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise exc
    user_id = payload.get("sub")
    try:
        user_uuid = uuid.UUID(str(user_id))
    except ValueError:
        raise exc
    result = await db.execute(select(User).where(User.id == user_uuid, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise exc

    token_data = {"sub": str(user.id), "username": user.username, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    set_auth_cookies(
        request=request,
        response=response,
        access_token=access_token,
        access_expires_in_seconds=settings.jwt_expire_minutes * 60,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.jwt_expire_minutes * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    客户端登出接口。

    清理认证 Cookie，使服务端中间件可以立即将用户视为未登录状态。
    """
    forwarded_proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    secure = forwarded_proto == "https"
    response.delete_cookie(key="bluenet_token", path="/", secure=secure, samesite="lax")
    response.delete_cookie(key="bluenet_refresh_token", path="/", secure=secure, samesite="lax")
    return {"message": "Logged out successfully"}
