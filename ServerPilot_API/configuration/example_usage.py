"""
Example usage of email templates in Django views
This file demonstrates how to integrate the email templates with your views
"""

from django.core.mail import send_mail
from django.conf import settings
from .email_templates import (
    get_forgot_password_template,
    get_signup_template,
    get_verification_template
)


def send_password_reset_email(user, reset_link):
    """
    Send password reset email using the template
    
    Args:
        user: User object with email attribute
        reset_link: The password reset link
    """
    try:
        # Generate HTML email content
        html_message = get_forgot_password_template(reset_link, user.email)
        
        # Plain text fallback
        plain_message = f"""
        Password Reset Request
        
        Hello,
        
        We received a request to reset the password for your ServerPilot account.
        
        To reset your password, click this link: {reset_link}
        
        This link will expire in 24 hours for security reasons.
        If you didn't request this password reset, please ignore this email.
        
        Best regards,
        The ServerPilot Team
        """
        
        # Send email
        send_mail(
            subject='Password Reset Request',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True, "Password reset email sent successfully"
        
    except Exception as e:
        return False, f"Failed to send password reset email: {str(e)}"


def send_activation_email(user, activation_link):
    """
    Send account activation email using the template
    
    Args:
        user: User object with username and email attributes
        activation_link: The account activation link
    """
    try:
        # Generate HTML email content
        html_message = get_signup_template(activation_link, user.username, user.email)
        
        # Plain text fallback
        plain_message = f"""
        Welcome to ServerPilot!
        
        Hello {user.username},
        
        Thank you for creating your ServerPilot account!
        
        To complete your registration, please verify your email address:
        {activation_link}
        
        This verification link will expire in 24 hours.
        
        Welcome aboard!
        The ServerPilot Team
        """
        
        # Send email
        send_mail(
            subject='Welcome to ServerPilot - Verify Your Email',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True, "Activation email sent successfully"
        
    except Exception as e:
        return False, f"Failed to send activation email: {str(e)}"


def send_verification_success_email(user):
    """
    Send email verification success confirmation
    
    Args:
        user: User object with username and email attributes
    """
    try:
        # Generate HTML email content
        html_message = get_verification_template(user.username, user.email)
        
        # Plain text fallback
        plain_message = f"""
        Email Verification Successful!
        
        Hello {user.username},
        
        Great news! Your email address has been successfully verified.
        Your account is now fully activated and ready to use!
        
        You can now:
        - Log in to your ServerPilot account
        - Access all features and services
        - Manage your servers and applications
        - Configure your security settings
        
        Happy server management!
        The ServerPilot Team
        """
        
        # Send email
        send_mail(
            subject='Email Verification Successful - Welcome to ServerPilot',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        return True, "Verification success email sent successfully"
        
    except Exception as e:
        return False, f"Failed to send verification success email: {str(e)}"


# Example view integration
def example_view_integration():
    """
    Example of how to integrate these functions in a Django view
    """
    
    # Example user object (replace with actual user from request)
    class MockUser:
        def __init__(self, username, email):
            self.username = username
            self.email = email
    
    user = MockUser("testuser", "test@example.com")
    
    # Example 1: Password reset
    print("=== Password Reset Example ===")
    reset_link = "https://yourapp.com/reset-password/123/abc/"
    success, message = send_password_reset_email(user, reset_link)
    print(f"Password reset email: {message}")
    
    # Example 2: Account activation
    print("\n=== Account Activation Example ===")
    activation_link = "https://yourapp.com/activate/123/abc/"
    success, message = send_activation_email(user, activation_link)
    print(f"Activation email: {message}")
    
    # Example 3: Verification success
    print("\n=== Verification Success Example ===")
    success, message = send_verification_success_email(user)
    print(f"Verification success email: {message}")


if __name__ == "__main__":
    # Run examples
    example_view_integration()
