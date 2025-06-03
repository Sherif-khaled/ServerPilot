from rest_framework import serializers
from .models import Customer, CustomerType

class CustomerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerType
        fields = ('id', 'name')


class CustomerSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    customer_type = serializers.PrimaryKeyRelatedField(queryset=CustomerType.objects.all())
    customer_type_name = serializers.StringRelatedField(source='customer_type', read_only=True)

    class Meta:
        model = Customer
        fields = (
            'id', 'owner', 'first_name', 'last_name', 'email',
            'phone_number', 'company_name', 'delegated_person_name', 'address_line1', 'city',
            'country', 'notes', 'is_active', 'customer_type', 'customer_type_name', 'created_at', 'updated_at'
        )
        read_only_fields = ('created_at', 'updated_at')

    def validate(self, data):
        errors = {}
        
        # Determine the effective customer_type for validation
        # If 'customer_type' is in data, it's the primary source (new type or re-affirming current type)
        # Otherwise, if it's a PATCH (self.instance exists), use the instance's current type
        effective_customer_type = data.get('customer_type') # Check data first
        is_type_change_or_explicit_set = 'customer_type' in data

        if not effective_customer_type and self.instance: # Fallback for PATCH if not in data
            effective_customer_type = self.instance.customer_type

        if effective_customer_type:
            type_name_lower = effective_customer_type.name.lower()

            if type_name_lower == 'company':
                company_name_val = data.get('company_name', getattr(self.instance, 'company_name', None) if self.instance else None)
                delegated_person_name_val = data.get('delegated_person_name', getattr(self.instance, 'delegated_person_name', None) if self.instance else None)

                if is_type_change_or_explicit_set and effective_customer_type.name.lower() == 'company':
                    # If type is being set/changed to Company, these fields must be in the payload
                    if 'company_name' not in data or not data.get('company_name'):
                        errors['company_name'] = 'Company name must be provided when customer type is "Company".'
                    if 'delegated_person_name' not in data or not data.get('delegated_person_name'):
                        errors['delegated_person_name'] = 'Delegated person name must be provided when customer type is "Company".'
                else: # Not a type change, just an update to an existing Company customer
                    if 'company_name' in data and not data.get('company_name'): # Explicitly clearing
                        errors['company_name'] = 'Company name is required for customer type "Company".'
                    elif not company_name_val: # Field is generally empty
                         errors['company_name'] = 'Company name is required for customer type "Company".'
                    
                    if 'delegated_person_name' in data and not data.get('delegated_person_name'): # Explicitly clearing
                        errors['delegated_person_name'] = 'Delegated person name is required for customer type "Company".'
                    elif not delegated_person_name_val: # Field is generally empty
                        errors['delegated_person_name'] = 'Delegated person name is required for customer type "Company".'

            elif type_name_lower == 'individual':
                first_name_val = data.get('first_name', getattr(self.instance, 'first_name', None) if self.instance else None)
                last_name_val = data.get('last_name', getattr(self.instance, 'last_name', None) if self.instance else None)

                if is_type_change_or_explicit_set and effective_customer_type.name.lower() == 'individual':
                    # If type is being set/changed to Individual, these fields must be in the payload
                    if 'first_name' not in data or not data.get('first_name'):
                        errors['first_name'] = 'First name must be provided when customer type is "Individual".'
                    if 'last_name' not in data or not data.get('last_name'):
                        errors['last_name'] = 'Last name must be provided when customer type is "Individual".'
                else: # Not a type change, just an update to an existing Individual customer
                    if 'first_name' in data and not data.get('first_name'): # Explicitly clearing
                        errors['first_name'] = 'First name is required for customer type "Individual".'
                    elif not first_name_val:
                        errors['first_name'] = 'First name is required for customer type "Individual".'

                    if 'last_name' in data and not data.get('last_name'): # Explicitly clearing
                        errors['last_name'] = 'Last name is required for customer type "Individual".'
                    elif not last_name_val:
                        errors['last_name'] = 'Last name is required for customer type "Individual".'
        else:
            # This case handles POST requests where customer_type itself is missing
            if 'customer_type' not in data:
                 errors['customer_type'] = 'Customer type is required.'

        if errors:
            raise serializers.ValidationError(errors)
        
        return data

    def validate_email(self, value):
        query = Customer.objects.filter(email=value)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        if query.exists():
            raise serializers.ValidationError("A customer with this email already exists.")
        return value
