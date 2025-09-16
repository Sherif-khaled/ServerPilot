#!/usr/bin/env python3
"""
Test script for email templates
Run this script to test the email template generation
"""

import os
import sys
import django

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'serverpilot_project.settings')
django.setup()

from configuration.email_templates import (
    get_forgot_password_template,
    get_signup_template,
    get_verification_template
)

def test_email_templates():
    """Test all email templates"""
    
    # Test data
    test_reset_link = "http://localhost:3000/reset-password/abc123/def456/"
    test_activation_link = "http://localhost:3000/activate/123/abc123/"
    test_username = "testuser"
    test_email = "test@example.com"
    
    print("Testing Email Templates...")
    print("=" * 50)
    
    # Test forgot password template
    print("\n1. Forgot Password Template:")
    print("-" * 30)
    forgot_password_html = get_forgot_password_template(test_reset_link, test_email)
    print(f"Generated HTML length: {len(forgot_password_html)} characters")
    print("Contains logo placeholder:", "ServerPilot Logo" in forgot_password_html)
    print("Contains reset link:", test_reset_link in forgot_password_html)
    
    # Test signup template
    print("\n2. Signup Template:")
    print("-" * 30)
    signup_html = get_signup_template(test_activation_link, test_username, test_email)
    print(f"Generated HTML length: {len(signup_html)} characters")
    print("Contains logo placeholder:", "ServerPilot Logo" in signup_html)
    print("Contains activation link:", test_activation_link in signup_html)
    
    # Test verification template
    print("\n3. Verification Template:")
    print("-" * 30)
    verification_html = get_verification_template(test_username, test_email)
    print(f"Generated HTML length: {len(verification_html)} characters")
    print("Contains logo placeholder:", "ServerPilot Logo" in verification_html)
    print("Contains username:", test_username in verification_html)
    
    # Save templates to files for inspection
    print("\n4. Saving templates to files...")
    templates_dir = "email_templates_test"
    os.makedirs(templates_dir, exist_ok=True)
    
    with open(f"{templates_dir}/forgot_password.html", "w") as f:
        f.write(forgot_password_html)
    
    with open(f"{templates_dir}/signup.html", "w") as f:
        f.write(signup_html)
    
    with open(f"{templates_dir}/verification.html", "w") as f:
        f.write(verification_html)
    
    print(f"Templates saved to {templates_dir}/ directory")
    print("\nTest completed successfully!")

if __name__ == "__main__":
    test_email_templates()
