"""Management command to encrypt existing API keys"""
from django.core.management.base import BaseCommand
from openrouter_chat.models import UserProfile
from openrouter_chat.utils import encrypt_api_key, decrypt_api_key

class Command(BaseCommand):
    help = 'Encrypts existing unencrypted API keys in the database'

    def handle(self, *args, **options):
        profiles = UserProfile.objects.all()
        encrypted_count = 0
        
        for profile in profiles:
            if profile.api_key_encrypted:
                # Try to decrypt - if it fails, it's likely unencrypted
                try:
                    decrypted = decrypt_api_key(profile.api_key_encrypted)
                    # If decryption returns the same value, it's unencrypted
                    if decrypted == profile.api_key_encrypted and profile.api_key_encrypted.startswith('sk-'):
                        # Encrypt it
                        profile.api_key_encrypted = encrypt_api_key(profile.api_key_encrypted)
                        profile.save()
                        encrypted_count += 1
                        self.stdout.write(f'Encrypted API key for user: {profile.user.username}')
                except:
                    pass
        
        self.stdout.write(self.style.SUCCESS(f'Successfully encrypted {encrypted_count} API keys'))