from django.db import models

class Application(models.Model):
    """
    Represents an application installed on a server.
    """
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    check_command = models.CharField(
        max_length=512, 
        help_text="The command to run to check if the application is installed (e.g., 'command -v node' or 'systemctl is-active nginx').",
        blank=True,
        null=True
    )
    version = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )
    detect_version = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    icon = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f'{self.name}'

    class Meta:
        ordering = ['name']
        verbose_name = 'Application'
        verbose_name_plural = 'Applications'

# Create your models here.
