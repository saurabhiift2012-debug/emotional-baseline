"""Environment-derived configuration, logging, and external service clients."""
import os
import logging
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("therapishots")

# ---- Auth (JWT) ----
SECRET_KEY = os.environ.get('JWT_SECRET')
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET environment variable is required and must be set.")
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_DAYS = 30

# Hidden admin usage dashboard passcode (set in backend/.env). No admin without it.
ADMIN_PASSCODE = os.environ.get('ADMIN_PASSCODE')
ADMIN_TOKEN_EXPIRE_HOURS = 12

# Registration safety agreement version.
AGREEMENT_VERSION = 1

# ---- Twilio Verify (SMS OTP) ----
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_VERIFY_SERVICE_SID = os.environ.get('TWILIO_VERIFY_SERVICE_SID')
TWILIO_ENABLED = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID)
twilio_client = None
if TWILIO_ENABLED:
    try:
        from twilio.rest import Client as _TwilioClient
        twilio_client = _TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception:
        TWILIO_ENABLED = False

# Whitelisted test numbers bypass the SMS provider and use a static code.
# Lets the demo account + automated tests work without a real SMS.
TEST_PHONES = {"+919999900000": "123456"}

# ---- Razorpay (payments) ----
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
RAZORPAY_ENABLED = bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)
razorpay_client = None
if RAZORPAY_ENABLED:
    try:
        import razorpay as _razorpay
        razorpay_client = _razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except Exception:
        RAZORPAY_ENABLED = False
