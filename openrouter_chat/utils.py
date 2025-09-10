"""Utility functions for OpenRouter Chat"""
from cryptography.fernet import Fernet
from django.conf import settings
import base64
import hashlib

def get_encryption_key():
    """Get or create an encryption key from Django's SECRET_KEY"""
    # Use Django's SECRET_KEY as base for encryption key
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)

def encrypt_api_key(api_key):
    """Encrypt an API key"""
    if not api_key:
        return None
    
    f = Fernet(get_encryption_key())
    encrypted = f.encrypt(api_key.encode())
    return encrypted.decode()

def decrypt_api_key(encrypted_key):
    """Decrypt an API key"""
    if not encrypted_key:
        return None
    
    try:
        f = Fernet(get_encryption_key())
        decrypted = f.decrypt(encrypted_key.encode())
        return decrypted.decode()
    except:
        # Return as-is if decryption fails (might be unencrypted)
        return encrypted_key