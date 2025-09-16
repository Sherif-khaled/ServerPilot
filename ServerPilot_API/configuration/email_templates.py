import logging
from django.conf import settings
from .models import Favicon


def get_logo_url():
    """Get the application logo URL for email templates"""
    try:
        favicon = Favicon.load()
        if favicon.icon:
            # Return relative URL since this will be used in email context
            return favicon.icon.url
    except Exception as e:
        logging.getLogger(__name__).warning("Failed to load favicon for email templates: %s", e)
    return None


def get_base_email_template(content, subject, logo_url=None):
    """Base email template with common styling and logo"""
    logo_html = ""
    if logo_url:
        logo_html = f'<img src="{logo_url}" alt="ServerPilot Logo" style="max-width: 200px; height: auto; margin-bottom: 20px;">'
    
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }}
        .email-container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: linear-gradient(45deg, #0f2027, #203a43, #2c5364);
            padding: 30px 20px;
            text-align: center;
            color: white;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }}
        .content {{
            padding: 40px 30px;
            background-color: #ffffff;
        }}
        .footer {{
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }}
        .button {{
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.2s ease;
        }}
        .button:hover {{
            transform: translateY(-2px);
        }}
        .info-box {{
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .warning-box {{
            background-color: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            {logo_html}
            <h1>ServerPilot</h1>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <p>&copy; {{ now|date:"Y" }} Growsbyte LLC. All rights reserved.</p>
            <p>This is an automated message, please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
"""


def get_forgot_password_template(reset_link, user_email):
    """Template for forgot password email"""
    logo_url = get_logo_url()
    
    content = f"""
    <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
    
    <p>Hello,</p>
    
    <p>We received a request to reset the password for your ServerPilot account associated with <strong>{user_email}</strong>.</p>
    
    <div class="info-box">
        <strong>To reset your password, click the button below:</strong>
    </div>
    
    <div style="text-align: center;">
        <a href="{reset_link}" class="button">Reset Password</a>
    </div>
    
    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #667eea; font-size: 14px;">{reset_link}</p>
    
    <div class="warning-box">
        <strong>Important:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>This link will expire in 24 hours for security reasons</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>Your password will remain unchanged until you click the link above</li>
        </ul>
    </div>
    
    <p>If you have any questions or need assistance, please contact our support team.</p>
    
    <p>Best regards,<br>The ServerPilot Team</p>
    """
    
    return get_base_email_template(content, "Password Reset Request", logo_url)


def get_signup_template(activation_link, username, user_email):
    """Template for user signup/activation email"""
    logo_url = get_logo_url()
    
    content = f"""
    <h2 style="color: #333; margin-bottom: 20px;">Welcome to ServerPilot!</h2>
    
    <p>Hello <strong>{username}</strong>,</p>
    
    <p>Thank you for creating your ServerPilot account! We're excited to have you on board.</p>
    
    <p>To complete your registration and start using ServerPilot, please verify your email address by clicking the button below:</p>
    
    <div style="text-align: center;">
        <a href="{activation_link}" class="button">Verify Email Address</a>
    </div>
    
    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #667eea; font-size: 14px;">{activation_link}</p>
    
    <div class="info-box">
        <strong>What happens next?</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Click the verification link above</li>
            <li>Your account will be activated immediately</li>
            <li>You can then log in and start using ServerPilot</li>
        </ul>
    </div>
    
    <div class="warning-box">
        <strong>Note:</strong> This verification link will expire in 24 hours. If you need a new link, please contact support.
    </div>
    
    <p>Welcome aboard!<br>The ServerPilot Team</p>
    """
    
    return get_base_email_template(content, "Welcome to ServerPilot - Verify Your Email", logo_url)


def get_verification_template(username, user_email):
    """Template for email verification confirmation"""
    logo_url = get_logo_url()
    
    content = f"""
    <h2 style="color: #333; margin-bottom: 20px;">Email Verification Successful!</h2>
    
    <p>Hello <strong>{username}</strong>,</p>
    
    <p>Great news! Your email address <strong>{user_email}</strong> has been successfully verified.</p>
    
    <div class="info-box">
        <strong>Your account is now fully activated and ready to use!</strong>
    </div>
    
    <p>You can now:</p>
    <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Log in to your ServerPilot account</li>
        <li>Access all features and services</li>
        <li>Manage your servers and applications</li>
        <li>Configure your security settings</li>
    </ul>
    
    <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
    
    <p>Happy server management!<br>The ServerPilot Team</p>
    """
    
    return get_base_email_template(content, "Email Verification Successful - Welcome to ServerPilot", logo_url)


def get_deactivation_template(username, reason_text):
    """Template for account deactivation email with reason"""
    logo_url = get_logo_url()

    # Fallback reason text
    reason_text = reason_text or 'Your account has been deactivated by an administrator.'

    content = f"""
    <h2 style="color: #333; margin-bottom: 20px;">Account Deactivated</h2>

    <p>Hello <strong>{username}</strong>,</p>

    <p>Your ServerPilot account has been <strong>deactivated</strong>.</p>

    <div class="warning-box">
        <strong>Reason:</strong> {reason_text}
    </div>

    <p>If you believe this is a mistake or need further assistance, please contact our support team.</p>

    <p>Best regards,<br>The ServerPilot Team</p>
    """

    return get_base_email_template(content, "Your Account Has Been Deactivated", logo_url)
