#!/usr/bin/env python
"""
Test script for OpenRouter API integration
"""
import os
import sys
import django
import json
import requests

# Setup Django
sys.path.insert(0, '/Users/dennisjanvogt/Desktop/cc_workflow')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'overhead.settings')
django.setup()

from django.contrib.auth.models import User
from openrouter_chat.models import UserProfile, ChatSession, Message

def test_message_sending():
    """Test the message sending functionality"""
    print("=== Testing OpenRouter Message Sending ===\n")
    
    # Get test user
    try:
        user = User.objects.get(username='test')
        print(f"✓ Found user: {user.username}")
    except User.DoesNotExist:
        print("✗ User 'test' not found. Please create a test user first.")
        return
    
    # Get user profile
    try:
        profile = UserProfile.objects.get(user=user)
        print(f"✓ Found user profile")
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=user)
        print("✓ Created user profile")
    
    # Check API key
    if not profile.api_key_encrypted:
        print("✗ No API key found. Please set an API key first.")
        return
    else:
        print(f"✓ API key found: {profile.api_key_encrypted[:10]}...")
    
    # Create or get session
    session = ChatSession.objects.filter(user=user).first()
    if not session:
        session = ChatSession.objects.create(
            user=user,
            title="Test Session",
            model="openai/gpt-3.5-turbo"
        )
        print(f"✓ Created new session: {session.id}")
    else:
        print(f"✓ Using existing session: {session.id}")
    
    # Test message
    test_message = "Hello, this is a test message. Please respond with 'Test successful!'"
    print(f"\n📤 Sending message: {test_message}")
    
    # Save user message
    user_message = Message.objects.create(
        session=session,
        role='user',
        content=test_message
    )
    
    # Prepare API call
    messages = [
        {
            'role': 'system',
            'content': 'You are a helpful assistant. Respond briefly.'
        },
        {
            'role': 'user',
            'content': test_message
        }
    ]
    
    headers = {
        'Authorization': f'Bearer {profile.api_key_encrypted}',
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:8000',
        'X-Title': 'Django Test'
    }
    
    api_data = {
        'model': 'openai/gpt-3.5-turbo',
        'messages': messages
    }
    
    print("\n🔄 Calling OpenRouter API...")
    print(f"   URL: https://openrouter.ai/api/v1/chat/completions")
    print(f"   Model: {api_data['model']}")
    
    try:
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=api_data,
            timeout=30
        )
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                ai_content = result['choices'][0]['message']['content']
                print(f"✓ AI Response: {ai_content}")
                
                # Save AI message
                ai_message = Message.objects.create(
                    session=session,
                    role='assistant',
                    content=ai_content,
                    model='openai/gpt-3.5-turbo'
                )
                print(f"✓ Message saved to database")
            else:
                print(f"✗ Unexpected response format: {result}")
        else:
            print(f"✗ API Error: {response.status_code}")
            print(f"   Response: {response.text}")
            
            # Common error codes
            if response.status_code == 401:
                print("\n⚠️  Unauthorized - Check your API key")
            elif response.status_code == 402:
                print("\n⚠️  Payment Required - Check your OpenRouter credits")
            elif response.status_code == 429:
                print("\n⚠️  Rate Limited - Too many requests")
            
    except requests.exceptions.Timeout:
        print("✗ Request timed out")
    except requests.exceptions.ConnectionError:
        print("✗ Connection error - Check internet connection")
    except Exception as e:
        print(f"✗ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_message_sending()