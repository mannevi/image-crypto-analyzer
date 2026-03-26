from fastapi import APIRouter, HTTPException, Request, Depends
from datetime import datetime, timedelta
from passlib.context import CryptContext
from db.database import get_admin_db
from models.schemas import (
    UserRegister, OTPVerify, OTPResend,
    WebAuthnRegisterStart, WebAuthnRegisterFinish,
    WebAuthnLoginStart, WebAuthnLoginFinish
)
from utils.auth_helpers import (
    generate_jwt, generate_otp,
    get_current_user, log_action
)
from utils.email_helper import send_otp_email, send_new_device_email, send_username_email, send_forgot_password_email, send_password_reset_link_email
import os
import json

router = APIRouter(tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

RP_ID   = os.getenv("RP_ID",   "localhost")
RP_NAME = os.getenv("RP_NAME", "PINIT")


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register")
async def register(data: UserRegister, request: Request):
    db = get_admin_db()

    # Check email exists
    existing = db.table("users").select("id").eq("email", data.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check username exists
    existing_user = db.table("users").select("id").eq("username", data.username).execute()
    if existing_user.data:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create user
    new_user = db.table("users").insert({
        "username"      : data.username,
        "email"         : data.email,
        "role"          : "user",
        "is_active"     : True,
        "email_verified": False,
        "password_hash" : pwd_context.hash(data.password) if data.password else None
    }).execute()

    user = new_user.data[0]

    # Generate OTP
    otp_code   = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    db.table("otp_codes").insert({
        "email"     : data.email,
        "code"      : otp_code,
        "expires_at": expires_at.isoformat(),
        "used"      : False
    }).execute()

    # ✅ FIX: Check if email was actually sent — raise error if not
    email_sent = send_otp_email(data.email, otp_code, data.username)
    if not email_sent:
        # Roll back: delete the user and OTP so they can try again cleanly
        db.table("otp_codes").delete().eq("email", data.email).eq("code", otp_code).execute()
        db.table("users").delete().eq("id", user["id"]).execute()
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP email. Please check your email address and try registering again."
        )

    log_action(user["id"], "register", {"email": data.email}, str(request.client.host))

    return {
        "message": "Registration successful. Check your email for OTP.",
        "email"  : data.email
    }


# ── Password Login ────────────────────────────────────────────────────────────

@router.post("/login")
async def login(data: dict, request: Request):
    db    = get_admin_db()
    email = data.get("email", "").lower().strip()
    pwd   = data.get("password", "")

    user_result = db.table("users").select("*").eq("email", email).execute()
    if not user_result.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = user_result.data[0]

    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account suspended")

    stored_pwd = user.get("password_hash", "")
    if not stored_pwd or not pwd_context.verify(pwd, stored_pwd):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = generate_jwt(user["id"], user["role"])
    log_action(user["id"], "login_password", {}, str(request.client.host))

    return {
        "access_token": token,
        "token_type"  : "bearer",
        "user"        : {
            "id"      : user["id"],
            "uuid"    : user["id"],  # UUID for image embedding
            "username": user["username"],
            "email"   : user["email"],
            "role"    : user["role"]
        }
    }


# ── Admin Login ───────────────────────────────────────────────────────────────

@router.post("/admin-login")
async def admin_login(data: dict, request: Request):
    db       = get_admin_db()
    username = data.get("username", "")
    pwd      = data.get("password", "")

    user_result = db.table("users").select("*") \
        .eq("username", username).eq("role", "admin").execute()

    if not user_result.data:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    user       = user_result.data[0]
    stored_pwd = user.get("password_hash", "")

    if not stored_pwd or not pwd_context.verify(pwd, stored_pwd):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

    token = generate_jwt(user["id"], user["role"])
    log_action(user["id"], "admin_login", {}, str(request.client.host))

    return {
        "access_token": token,
        "token_type"  : "bearer",
        "user"        : {
            "id"      : user["id"],
            "uuid"    : user["id"],  # UUID for image embedding
            "username": user["username"],
            "email"   : user["email"],
            "role"    : user["role"]
        }
    }


# ── Verify OTP ────────────────────────────────────────────────────────────────

@router.post("/verify-otp")
async def verify_otp(data: OTPVerify, request: Request):
    db = get_admin_db()

    result = db.table("otp_codes") \
        .select("*") \
        .eq("email", data.email) \
        .eq("code", data.code) \
        .eq("used", False) \
        .execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Invalid OTP code")

    otp        = result.data[0]
    expires_at = datetime.fromisoformat(otp["expires_at"].replace("Z", "+00:00"))

    if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    db.table("otp_codes").update({"used": True}).eq("id", otp["id"]).execute()
    db.table("users").update({"email_verified": True}).eq("email", data.email).execute()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    user        = user_result.data[0]

    log_action(user["id"], "verify_otp", {"email": data.email}, str(request.client.host))

    return {
        "message" : "Email verified successfully",
        "verified": True,
        "user_id" : user["id"]
    }


# ── Resend OTP ────────────────────────────────────────────────────────────────

@router.post("/resend-otp")
async def resend_otp(data: OTPResend):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Email not found")

    user       = user_result.data[0]
    otp_code   = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    db.table("otp_codes").insert({
        "email"     : data.email,
        "code"      : otp_code,
        "expires_at": expires_at.isoformat(),
        "used"      : False
    }).execute()

    email_sent = send_otp_email(data.email, otp_code, user["username"])
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send OTP email. Please try again.")
    return {"message": "New OTP sent to your email"}


# ── Get Current User ──────────────────────────────────────────────────────────

@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return current_user




# ── Forgot Password — Send reset link to email ────────────────────────

@router.post("/forgot-password/request")
async def forgot_password_request(data: dict):
    import secrets
    db    = get_admin_db()
    email = data.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    user_result = db.table("users").select("*").eq("email", email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Email is not registered")
    user = user_result.data[0]
    # Generate secure reset token
    token      = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(minutes=30)
    # Store token in otp_codes table
    db.table("otp_codes").insert({
        "email"     : email,
        "code"      : f"RESET_{token}",
        "expires_at": expires_at.isoformat(),
        "used"      : False
    }).execute()
    # Build reset link
    reset_link = f"https://image-crypto-analyzer.vercel.app/reset-password?token={token}&email={email}"
    # Send email
    email_sent = send_password_reset_link_email(email, user["username"], reset_link)
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send reset email. Please try again.")
    return {"message": "Password reset link sent to your email"}


# ── Forgot Password — Reset via token link ────────────────────

@router.post("/forgot-password/reset")
async def forgot_password_reset(data: dict):
    db           = get_admin_db()
    email        = data.get("email", "").lower().strip()
    token        = data.get("token", "").strip()
    new_password = data.get("new_password", "")
    if not email or not token or not new_password:
        raise HTTPException(status_code=400, detail="Email, token and new password are required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    # Verify token
    token_result = db.table("otp_codes") \r
        .select("*") \r
        .eq("email", email) \r
        .eq("code", f"RESET_{token}") \r
        .eq("used", False) \r
        .execute()
    if not token_result.data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new one.")
    token_row  = token_result.data[0]
    expires_at = datetime.fromisoformat(token_row["expires_at"].replace("Z", "+00:00"))
    if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
        raise HTTPException(status_code=400, detail="Reset link expired. Please request a new one.")
    # Get user
    user_result = db.table("users").select("*").eq("email", email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")
    user = user_result.data[0]
    stored_pwd = user.get("password_hash", "")
    if stored_pwd and pwd_context.verify(new_password, stored_pwd):
        raise HTTPException(status_code=400, detail="New password must be different from your current password")
    # Mark token used + update password
    db.table("otp_codes").update({"used": True}).eq("id", token_row["id"]).execute()
    db.table("users").update({"password_hash": pwd_context.hash(new_password)}).eq("email", email).execute()
    return {"message": "Password reset successfully"}


# ── Forgot Username — send username to registered email ─────────────────

@router.post("/forgot-username")
async def forgot_username(data: dict):
    db    = get_admin_db()
    email = data.get("email", "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    user_result = db.table("users").select("username").eq("email", email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Email is not registered")
    username = user_result.data[0]["username"]
    email_sent = send_username_email(email, username)
    if not email_sent:
        raise HTTPException(status_code=500, detail="Failed to send email. Please try again.")
    return {"message": "Username sent to your email"}


# ── WebAuthn Register Start ───────────────────────────────────────────────────

@router.post("/webauthn/register-start")
async def webauthn_register_start(data: WebAuthnRegisterStart):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data[0]

    if not user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Please verify your email first")

    try:
        from webauthn import generate_registration_options
        from webauthn.helpers.structs import (
            AuthenticatorSelectionCriteria,
            UserVerificationRequirement,
            ResidentKeyRequirement
        )
        from webauthn.helpers.cose import COSEAlgorithmIdentifier
        import base64

        options = generate_registration_options(
            rp_id                   = RP_ID,
            rp_name                 = RP_NAME,
            user_id                 = user["id"].encode(),
            user_name               = user["email"],
            user_display_name       = user["username"],
            authenticator_selection = AuthenticatorSelectionCriteria(
                user_verification = UserVerificationRequirement.REQUIRED,
                resident_key      = ResidentKeyRequirement.PREFERRED
            ),
            supported_pub_key_algs  = [
                COSEAlgorithmIdentifier.ECDSA_SHA_256,
                COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256
            ]
        )

        challenge_b64 = base64.b64encode(options.challenge).decode()
        db.table("otp_codes").insert({
            "email"     : data.email,
            "code"      : f"WA_CHALLENGE_{challenge_b64}",
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            "used"      : False
        }).execute()

        from webauthn import options_to_json
        return json.loads(options_to_json(options))

    except ImportError:
        raise HTTPException(status_code=500, detail="WebAuthn not installed. Run: pip install pywebauthn")


# ── WebAuthn Register Finish ──────────────────────────────────────────────────

@router.post("/webauthn/register-finish")
async def webauthn_register_finish(data: WebAuthnRegisterFinish, request: Request):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data[0]

    try:
        from webauthn import verify_registration_response
        from webauthn.helpers.structs import RegistrationCredential
        import base64

        challenge_result = db.table("otp_codes") \
            .select("*") \
            .eq("email", data.email) \
            .eq("used", False) \
            .like("code", "WA_CHALLENGE_%") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not challenge_result.data:
            raise HTTPException(status_code=400, detail="Challenge not found or expired")

        challenge_row = challenge_result.data[0]
        challenge_b64 = challenge_row["code"].replace("WA_CHALLENGE_", "")
        challenge     = base64.b64decode(challenge_b64)

        db.table("otp_codes").update({"used": True}).eq("id", challenge_row["id"]).execute()

        verification = verify_registration_response(
            credential         = RegistrationCredential.parse_raw(json.dumps(data.credential)),
            expected_challenge = challenge,
            expected_rp_id     = RP_ID,
            expected_origin    = os.getenv("APP_URL", "http://localhost:3000")
        )

        db.table("biometric_credentials").insert({
            "user_id"      : user["id"],
            "credential_id": base64.urlsafe_b64encode(verification.credential_id).decode(),
            "public_key"   : base64.b64encode(verification.credential_public_key).decode(),
            "device_name"  : data.device_name,
            "sign_count"   : verification.sign_count
        }).execute()

        send_new_device_email(user["email"], user["username"], data.device_name)
        log_action(user["id"], "biometric_register", {"device": data.device_name}, str(request.client.host))

        return {"message": "Biometric registered successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")


# ── WebAuthn Login Start ──────────────────────────────────────────────────────

@router.post("/webauthn/login-start")
async def webauthn_login_start(data: WebAuthnLoginStart):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data[0]

    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account suspended")

    creds_result = db.table("biometric_credentials") \
        .select("*").eq("user_id", user["id"]).execute()

    if not creds_result.data:
        raise HTTPException(status_code=400, detail="No biometric registered. Please register first.")

    try:
        from webauthn import generate_authentication_options
        from webauthn.helpers.structs import UserVerificationRequirement, PublicKeyCredentialDescriptor
        import base64

        allow_credentials = [
            PublicKeyCredentialDescriptor(
                id = base64.urlsafe_b64decode(cred["credential_id"] + "==")
            )
            for cred in creds_result.data
        ]

        options = generate_authentication_options(
            rp_id             = RP_ID,
            allow_credentials = allow_credentials,
            user_verification = UserVerificationRequirement.REQUIRED
        )

        challenge_b64 = base64.b64encode(options.challenge).decode()
        db.table("otp_codes").insert({
            "email"     : data.email,
            "code"      : f"WA_AUTH_{challenge_b64}",
            "expires_at": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            "used"      : False
        }).execute()

        from webauthn import options_to_json
        return json.loads(options_to_json(options))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── WebAuthn Login Finish ─────────────────────────────────────────────────────

@router.post("/webauthn/login-finish")
async def webauthn_login_finish(data: WebAuthnLoginFinish, request: Request):
    db = get_admin_db()

    user_result = db.table("users").select("*").eq("email", data.email).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = user_result.data[0]

    try:
        from webauthn import verify_authentication_response
        from webauthn.helpers.structs import AuthenticationCredential
        import base64

        challenge_result = db.table("otp_codes") \
            .select("*") \
            .eq("email", data.email) \
            .eq("used", False) \
            .like("code", "WA_AUTH_%") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not challenge_result.data:
            raise HTTPException(status_code=400, detail="Challenge expired")

        challenge_row = challenge_result.data[0]
        challenge     = base64.b64decode(challenge_row["code"].replace("WA_AUTH_", ""))
        db.table("otp_codes").update({"used": True}).eq("id", challenge_row["id"]).execute()

        cred_id_raw = data.credential.get("id", "")
        all_creds   = db.table("biometric_credentials").select("*").eq("user_id", user["id"]).execute()

        matched_cred = None
        for cred in all_creds.data:
            if cred["credential_id"].rstrip("=") == cred_id_raw.rstrip("="):
                matched_cred = cred
                break

        if not matched_cred:
            raise HTTPException(status_code=400, detail="Credential not found")

        verification = verify_authentication_response(
            credential                    = AuthenticationCredential.parse_raw(json.dumps(data.credential)),
            expected_challenge            = challenge,
            expected_rp_id               = RP_ID,
            expected_origin              = os.getenv("APP_URL", "http://localhost:3000"),
            credential_public_key        = base64.b64decode(matched_cred["public_key"]),
            credential_current_sign_count = matched_cred["sign_count"]
        )

        db.table("biometric_credentials").update({
            "sign_count": verification.new_sign_count
        }).eq("id", matched_cred["id"]).execute()

        token = generate_jwt(user["id"], user["role"])
        log_action(user["id"], "login_biometric", {"device": matched_cred.get("device_name")}, str(request.client.host))

        return {
            "access_token": token,
            "token_type"  : "bearer",
            "user"        : {
                "id"      : user["id"],
                "uuid"    : user["id"],  # UUID for image embedding
                "username": user["username"],
                "email"   : user["email"],
                "role"    : user["role"]
            }
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")