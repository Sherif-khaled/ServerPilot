from .settings import *  # noqa

# Use in-memory SQLite for tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

# Disable password hashing for faster tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Disable logging during tests
import logging
logging.disable(logging.CRITICAL)

# Disable Redis caching during tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Use database session backend for tests
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Simplify middleware for tests
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Disable password validation for tests
AUTH_PASSWORD_VALIDATORS = []

# Disable channels for tests
INSTALLED_APPS = [app for app in INSTALLED_APPS if app != 'channels']

# Disable OTP for tests
MIDDLEWARE = [m for m in MIDDLEWARE if m != 'django_otp.middleware.OTPMiddleware']

# Disable security middleware for tests
MIDDLEWARE = [
    m for m in MIDDLEWARE 
    if m not in [
        'ServerPilot_API.security.middleware.SessionExpirationMiddleware',
        'ServerPilot_API.Users.middleware.UserSessionMiddleware',
    ]
]
