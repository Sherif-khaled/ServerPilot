from django.db import models
from ServerPilot_API.Users.models import CustomUser  # Assuming CustomUser remains in API.Users.models


class CustomerType(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Customer(models.Model):
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='customers_owned')  # Changed related_name
    customer_type = models.ForeignKey(CustomerType, on_delete=models.SET_NULL, null=True, blank=True, related_name='customers')
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(max_length=254, unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=150, blank=True, null=True)
    delegated_person_name = models.CharField(max_length=150, blank=True, null=True) # New field
    address_line1 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.first_name} {self.last_name} (Owner: {self.owner.username})'
