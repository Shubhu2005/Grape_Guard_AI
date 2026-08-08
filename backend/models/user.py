from pydantic import BaseModel, EmailStr
from typing import Optional

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str           # "farmer" or "expert"
    phone: Optional[str] = ""
    location: Optional[str] = ""

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    full_name: str
    role: str
    access_token: str
    token_type: str = "bearer"


class TeamBuyConfirmationRequest(BaseModel):
    buyer_name: str
    email: EmailStr
    team_name: str
    plan_name: str
    seats: int
    amount: str
    order_id: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    redirect_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    new_password: str
