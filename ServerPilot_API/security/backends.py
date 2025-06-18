import logging
import ssl
from django.core.mail.backends.smtp import EmailBackend as SmtpEmailBackend

logger = logging.getLogger(__name__)

class DatabaseEmailBackend(SmtpEmailBackend):
    """
    Custom SMTP backend to handle SSL certificate verification issues.

    This backend inherits from Django's standard SMTP backend but customizes
    the SSL context to disable certificate verification. This is a workaround
    for environments where the mail server uses a self-signed or untrusted
    certificate, which would otherwise cause an SSLCertVerificationError.

    WARNING: This is insecure and makes the connection vulnerable to
    man-in-the-middle attacks. Use this only if you understand the risks
    and trust the network between this application and the mail server.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # If using SSL/TLS, create a custom SSL context that bypasses certificate verification.
        if self.use_ssl or self.use_tls:
            try:
                context = ssl.create_default_context()
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                self.ssl_context = context
                logger.warning(
                    "DatabaseEmailBackend is active: SSL certificate verification is DISABLED. "
                    "This is insecure and should only be used in a trusted environment."
                )
            except Exception as e:
                logger.error(f"Failed to create insecure SSL context: {e}")

