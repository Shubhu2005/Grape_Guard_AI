import logging

from fastapi import APIRouter, Depends, Header, HTTPException

from models.user import (
    SignupRequest,
    LoginRequest,
    TeamBuyConfirmationRequest,
    ForgotPasswordRequest,
    ChangePasswordRequest,
)
from config.supabase_config import admin_supabase
from dependencies.auth import CurrentUser, get_current_user
from services.mail_templates import build_team_buy_confirmation_email

router = APIRouter()
logger = logging.getLogger("grapeguard.auth")


@router.post("/signup")
def signup(data: SignupRequest):
    if data.role not in ["farmer", "expert"]:
        raise HTTPException(status_code=400, detail="Role must be 'farmer' or 'expert'")

    try:
        response = admin_supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
        })

        user = response.user
        if not user:
            raise HTTPException(status_code=400, detail="Signup failed; try a different email")

        admin_supabase.table("profiles").insert({
            "id": user.id,
            "full_name": data.full_name,
            "role": data.role,
            "phone": data.phone,
            "location": data.location,
        }).execute()

        logger.info("New %s account created: %s", data.role, user.id)
        return {
            "message": "Account created successfully",
            "user_id": user.id,
            "role": data.role,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Signup failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
def login(data: LoginRequest):
    try:
        response = admin_supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })

        session = response.session
        user = response.user

        if not session or not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        profile = (
            admin_supabase.table("profiles")
            .select("role, full_name")
            .eq("id", user.id)
            .single()
            .execute()
        )
        if not profile.data:
            raise HTTPException(
                status_code=400,
                detail="Profile not found for this account. Please contact admin or sign up again.",
            )

        return {
            "access_token": session.access_token,
            "token_type": "bearer",
            "role": profile.data["role"],
            "full_name": profile.data["full_name"],
            "user_id": user.id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/me")
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }


@router.post("/team-buy/confirmation-email")
def team_buy_confirmation_email(data: TeamBuyConfirmationRequest):
    payload = {
        "buyer_name": data.buyer_name,
        "email": data.email,
        "team_name": data.team_name,
        "plan_name": data.plan_name,
        "seats": data.seats,
        "amount": data.amount,
        "order_id": data.order_id,
    }
    return build_team_buy_confirmation_email(payload)


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):
    try:
        options = {"redirect_to": data.redirect_url} if data.redirect_url else None
        admin_supabase.auth.reset_password_for_email(data.email, options)
        return {"message": "Password reset email sent if the account exists."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/change-password")
def change_password(data: ChangePasswordRequest, authorization: str = Header(...)):
    if not data.new_password or len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    try:
        # Use raw token extraction here because password-reset tokens
        # come from the email link, not from a logged-in session.
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        token = authorization[7:].strip()

        user_resp = admin_supabase.auth.get_user(token)
        if not user_resp.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        admin_supabase.auth.admin.update_user_by_id(user_resp.user.id, {"password": data.new_password})
        logger.info("Password changed for user %s", user_resp.user.id)
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Password change failed: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
