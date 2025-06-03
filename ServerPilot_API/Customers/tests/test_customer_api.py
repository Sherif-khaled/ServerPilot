from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from ServerPilot_API.Users.models import CustomUser
from ServerPilot_API.Customers.models import Customer, CustomerType

class CustomerAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        # Create user once for all tests in this class
        cls.user = CustomUser.objects.create_user(username='testuser', email='test@example.com', password='password123')
        cls.staff_user = CustomUser.objects.create_user(username='staffuser', email='staff.api@example.com', password='password123', is_staff=True)

        # Create customer types once
        # Ensure unique names to avoid conflicts if tests run multiple times or with existing data
        cls.customer_type_individual, _ = CustomerType.objects.get_or_create(name='Individual')
        cls.customer_type_company, _ = CustomerType.objects.get_or_create(name='Company')

        # URL for listing and creating customers
        cls.customers_url = reverse('customer-list') # Make sure 'customer-list' is defined in API.Customers.urls

    def setUp(self):
        # Log in the default test user for each test
        self.client.login(username='testuser', password='password123')
        # Clean up customers before each test to ensure isolation
        Customer.objects.all().delete()

    def test_create_customer_minimal_data(self):
        """Ensure we can create a new customer with minimal required data."""
        data = {
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'test.user.api@example.com',
            'customer_type': self.customer_type_individual.id
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Customer.objects.count(), 1)
        created_customer = Customer.objects.get()
        self.assertEqual(created_customer.first_name, 'Test')
        self.assertEqual(created_customer.owner, self.user)
        self.assertEqual(created_customer.customer_type, self.customer_type_individual)

    def test_create_customer_full_data(self):
        """Ensure we can create a new customer with all fields."""
        data = {
            'first_name': 'Jane',
            'last_name': 'Doe',
            'email': 'jane.doe.api@example.com',
            'phone_number': '123-456-7890',
            'company_name': 'Doe Inc.',
            'delegated_person_name': 'John Delegate',
            'address_line1': '123 Main St',
            'city': 'Anytown',
            'country': 'USA',
            'notes': 'This is a test note.',
            'is_active': True,
            'customer_type': self.customer_type_company.id
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(Customer.objects.count(), 1)
        customer = Customer.objects.get(email='jane.doe.api@example.com')
        self.assertEqual(customer.first_name, 'Jane')
        self.assertEqual(customer.company_name, 'Doe Inc.')
        self.assertEqual(customer.delegated_person_name, 'John Delegate')
        self.assertEqual(customer.customer_type, self.customer_type_company)
        self.assertEqual(customer.owner, self.user)

    def test_list_customers_owned_by_user(self):
        """Ensure we can list customers owned by the logged-in user."""
        Customer.objects.create(
            owner=self.user,
            first_name='ListTest1',
            last_name='Customer',
            email='list.test1.api@example.com',
            customer_type=self.customer_type_individual
        )
        Customer.objects.create(
            owner=self.user,
            first_name='ListTest2',
            last_name='Customer',
            email='list.test2.api@example.com',
            customer_type=self.customer_type_company
        )
        another_user = CustomUser.objects.create_user(username='anotheruser_listtest', email='another_listtest.api@example.com', password='password123')
        Customer.objects.create(
            owner=another_user,
            first_name='OtherListTest',
            last_name='Customer',
            email='other.list.test.api@example.com',
            customer_type=self.customer_type_company
        )

        response = self.client.get(self.customers_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        results = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        self.assertEqual(len(results), 2)
        self.assertTrue(any(c['email'] == 'list.test1.api@example.com' for c in results))
        self.assertTrue(any(c['email'] == 'list.test2.api@example.com' for c in results))

    def test_retrieve_customer_owned_by_user(self):
        """Ensure we can retrieve a specific customer owned by the user."""
        customer = Customer.objects.create(
            owner=self.user,
            first_name='RetrieveTest',
            last_name='Customer',
            email='retrieve.test.api@example.com',
            customer_type=self.customer_type_individual
        )
        detail_url = reverse('customer-detail', kwargs={'pk': customer.pk})
        response = self.client.get(detail_url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data['first_name'], 'RetrieveTest')

    def test_update_customer_owned_by_user(self):
        """Ensure we can update a customer owned by the user (PUT)."""
        customer = Customer.objects.create(
            owner=self.user,
            first_name='UpdateTest',
            last_name='Before',
            email='update.test.api@example.com',
            customer_type=self.customer_type_individual,
            phone_number='111',
            company_name='Old Inc',
            address_line1='Old Address',
            city='Old City',
            country='Old Country',
            notes='Old notes',
            is_active=True
        )
        detail_url = reverse('customer-detail', kwargs={'pk': customer.pk})
        updated_data = {
            'first_name': 'UpdateTest',
            'last_name': 'After',
            'email': 'update.test.api.edited@example.com',
            'phone_number': '222-222-2222',
            'company_name': 'Updated Inc.',
            'delegated_person_name': 'Delegate For Update',
            'address_line1': 'New Address',
            'city': 'New City',
            'country': 'New Country',
            'notes': 'New notes',
            'is_active': False,
            'customer_type': self.customer_type_company.id
        }
        response = self.client.put(detail_url, updated_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        customer.refresh_from_db()
        self.assertEqual(customer.last_name, 'After')
        self.assertEqual(customer.company_name, 'Updated Inc.')
        self.assertEqual(customer.is_active, False)
        self.assertEqual(customer.customer_type, self.customer_type_company)

    def test_partial_update_customer_owned_by_user(self):
        """Ensure we can partially update a customer (PATCH)."""
        customer = Customer.objects.create(
            owner=self.user,
            first_name='PatchTest',
            last_name='Original',
            email='patch.test.api@example.com',
            customer_type=self.customer_type_individual,
            is_active=True
        )
        detail_url = reverse('customer-detail', kwargs={'pk': customer.pk})
        patch_data = {'is_active': False, 'notes': 'Deactivated by PATCH'}
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        customer.refresh_from_db()
        self.assertEqual(customer.is_active, False)
        self.assertEqual(customer.notes, 'Deactivated by PATCH')

    def test_delete_customer_owned_by_user(self):
        """Ensure we can delete a customer owned by the user."""
        customer = Customer.objects.create(
            owner=self.user,
            first_name='DeleteTest',
            last_name='Customer',
            email='delete.test.api@example.com',
            customer_type=self.customer_type_individual
        )
        self.assertEqual(Customer.objects.filter(owner=self.user).count(), 1)
        detail_url = reverse('customer-detail', kwargs={'pk': customer.pk})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT, response.data)
        self.assertEqual(Customer.objects.filter(owner=self.user).count(), 0)

    # --- Tests for Company specific field validation ---

    def test_create_company_customer_success(self):
        """Ensure we can create a company customer with company_name and delegated_person_name."""
        data = {
            'first_name': 'Company', 'last_name': 'Test',
            'email': 'company.test.api@example.com',
            'customer_type': self.customer_type_company.id,
            'company_name': 'Test Corp Ltd.',
            'delegated_person_name': 'Ms. Delegate'
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        customer = Customer.objects.get(email='company.test.api@example.com')
        self.assertEqual(customer.company_name, 'Test Corp Ltd.')
        self.assertEqual(customer.delegated_person_name, 'Ms. Delegate')

    def test_create_company_customer_fail_missing_company_name(self):
        """Test company customer creation fails if company_name is missing."""
        data = {
            'first_name': 'Company', 'last_name': 'Fail',
            'email': 'company.fail.cn.api@example.com',
            'customer_type': self.customer_type_company.id,
            'delegated_person_name': 'Mr. Delegate'
            # company_name is missing
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('company_name', response.data)
        self.assertEqual(response.data['company_name'][0], 'Company name must be provided when customer type is "Company".')

    def test_create_company_customer_fail_missing_delegated_person(self):
        """Test company customer creation fails if delegated_person_name is missing."""
        data = {
            'first_name': 'Company', 'last_name': 'Fail',
            'email': 'company.fail.dpn.api@example.com',
            'customer_type': self.customer_type_company.id,
            'company_name': 'No Delegate Inc.'
            # delegated_person_name is missing
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('delegated_person_name', response.data)
        self.assertEqual(response.data['delegated_person_name'][0], 'Delegated person name must be provided when customer type is "Company".')

    def test_create_individual_customer_without_company_fields(self):
        """Test individual customer creation succeeds without company-specific fields."""
        data = {
            'first_name': 'Individual', 'last_name': 'Normal',
            'email': 'individual.normal.api@example.com',
            'customer_type': self.customer_type_individual.id
            # No company_name or delegated_person_name
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertFalse(Customer.objects.get(email='individual.normal.api@example.com').company_name)

    def test_update_to_company_customer_success(self):
        """Test updating an individual to a company customer with required fields succeeds."""
        customer = Customer.objects.create(
            owner=self.user, first_name='ToBecome', last_name='Company',
            email='tobecome.company.api@example.com', customer_type=self.customer_type_individual
        )
        detail_url = reverse('customer-detail', kwargs={'pk': customer.pk})
        patch_data = {
            'customer_type': self.customer_type_company.id,
            'company_name': 'Now A Company LLC',
            'delegated_person_name': 'Switched Delegate'
        }
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        customer.refresh_from_db()
        self.assertEqual(customer.customer_type, self.customer_type_company)
        self.assertEqual(customer.company_name, 'Now A Company LLC')
        self.assertEqual(customer.delegated_person_name, 'Switched Delegate')

    def test_update_to_company_customer_fail_missing_fields(self):
        """Test updating to company customer fails if company_name is missing."""
        customer = Customer.objects.create(
            owner=self.user, first_name='ToFailUpdate', last_name='Company',
            email='tofailupdate.company.api@example.com', customer_type=self.customer_type_individual
        )
        detail_url = reverse('customer-detail', kwargs={'pk': customer.pk})
        patch_data = {
            'customer_type': self.customer_type_company.id,
            # company_name missing, delegated_person_name provided
            'delegated_person_name': 'Delegate Only'
        }
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('company_name', response.data)

    def test_update_company_customer_remove_company_name_fail(self):
        """Test removing company_name from an existing company customer fails."""
        customer = Customer.objects.create(
            owner=self.user, first_name='Existing', last_name='Company',
            email='existing.company.api@example.com', customer_type=self.customer_type_company,
            company_name='Solid Corp', delegated_person_name='Mr. Solid'
        )
        detail_url = reverse('customer-detail', kwargs={'pk': customer.pk})
        patch_data = {'company_name': ''} # Attempt to remove company_name
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('company_name', response.data)

    def test_update_company_customer_remove_delegated_person_fail(self):
        """Test removing delegated_person_name from an existing company customer fails."""
        customer = Customer.objects.create(
            owner=self.user, first_name='Existing', last_name='Company',
            email='existing.company.dpn.api@example.com', customer_type=self.customer_type_company,
            company_name='Solid Corp DPN', delegated_person_name='Ms. Solid DPN'
        )
        detail_url = reverse('customer-detail', kwargs={'pk': customer.pk})
        patch_data = {'delegated_person_name': ''} # Attempt to remove
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('delegated_person_name', response.data)


    # --- Tests for Individual specific field validation ---

    def test_create_individual_customer_fail_missing_first_name(self):
        """Test creating an individual customer fails if first_name is missing."""
        data = {
            'last_name': 'IndividualTest',
            'email': 'individual.nofirst.api@example.com',
            'customer_type': self.customer_type_individual.id
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('first_name', response.data)

    def test_create_individual_customer_fail_missing_last_name(self):
        """Test creating an individual customer fails if last_name is missing."""
        data = {
            'first_name': 'IndividualTest',
            'email': 'individual.nolast.api@example.com',
            'customer_type': self.customer_type_individual.id
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('last_name', response.data)

    def test_update_to_individual_customer_success(self):
        """Test updating a company customer to individual type successfully."""
        company_customer = Customer.objects.create(
            owner=self.user, first_name='CompToIndiv', last_name='Original',
            email='comptoindiv.original.api@example.com', customer_type=self.customer_type_company,
            company_name='Switching Corp', delegated_person_name='Mr. Switch'
        )
        detail_url = reverse('customer-detail', kwargs={'pk': company_customer.pk})
        patch_data = {
            'customer_type': self.customer_type_individual.id,
            'first_name': 'Now',
            'last_name': 'Individual',
            'company_name': '', 
            'delegated_person_name': '' 
        }
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        company_customer.refresh_from_db()
        self.assertEqual(company_customer.customer_type, self.customer_type_individual)
        self.assertEqual(company_customer.first_name, 'Now')
        self.assertEqual(company_customer.last_name, 'Individual')
        self.assertEqual(company_customer.company_name, '') 
        self.assertEqual(company_customer.delegated_person_name, '')

    def test_update_to_individual_customer_fail_missing_first_name(self):
        """Test updating to individual type fails if first_name is missing."""
        company_customer = Customer.objects.create(
            owner=self.user, first_name='CompToIndivFail', last_name='Original',
            email='comptoindiv.failfirst.api@example.com', customer_type=self.customer_type_company,
            company_name='Failing Switch Corp', delegated_person_name='Mr. Fail Switch'
        )
        detail_url = reverse('customer-detail', kwargs={'pk': company_customer.pk})
        patch_data = {
            'customer_type': self.customer_type_individual.id,
            'last_name': 'Individual' 
        }
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('first_name', response.data)

    def test_update_to_individual_customer_fail_missing_last_name(self):
        """Test updating to individual type fails if last_name is missing."""
        company_customer = Customer.objects.create(
            owner=self.user, first_name='CompToIndivFailLN', last_name='Original',
            email='comptoindiv.faillast.api@example.com', customer_type=self.customer_type_company,
            company_name='Failing Switch Corp LN', delegated_person_name='Mr. Fail Switch LN'
        )
        detail_url = reverse('customer-detail', kwargs={'pk': company_customer.pk})
        patch_data = {
            'customer_type': self.customer_type_individual.id,
            'first_name': 'Individual' 
        }
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('last_name', response.data)

    def test_update_individual_customer_remove_first_name_fail(self):
        """Test removing first_name from an existing individual customer fails."""
        individual_customer = Customer.objects.create(
            owner=self.user, first_name='OriginalFirst', last_name='OriginalLast',
            email='indiv.removefirst.api@example.com', customer_type=self.customer_type_individual
        )
        detail_url = reverse('customer-detail', kwargs={'pk': individual_customer.pk})
        patch_data = {'first_name': ''} 
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('first_name', response.data)

    def test_update_individual_customer_remove_last_name_fail(self):
        """Test removing last_name from an existing individual customer fails."""
        individual_customer = Customer.objects.create(
            owner=self.user, first_name='OriginalFirst', last_name='OriginalLast',
            email='indiv.removelast.api@example.com', customer_type=self.customer_type_individual
        )
        detail_url = reverse('customer-detail', kwargs={'pk': individual_customer.pk})
        patch_data = {'last_name': ''} 
        response = self.client.patch(detail_url, patch_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('last_name', response.data)

    # --- Adjustments for Company type tests ---
    def test_create_company_customer_success_without_personal_names(self):
        """Ensure company customer can be created without first_name/last_name."""
        data = {
            'email': 'company.noperson.api@example.com',
            'customer_type': self.customer_type_company.id,
            'company_name': 'Faceless Corp',
            'delegated_person_name': 'The Voice'
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        customer = Customer.objects.get(email='company.noperson.api@example.com')
        self.assertEqual(customer.company_name, 'Faceless Corp')
        self.assertEqual(customer.delegated_person_name, 'The Voice')
        self.assertIsNone(customer.first_name)
        self.assertIsNone(customer.last_name)

    def test_customer_creation_missing_required_fields(self):
        """Test customer creation fails if required fields are missing."""
        data = {'first_name': 'TestMissingAPI'}
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        # last_name is not required if customer_type is not specified as 'Individual'
        self.assertNotIn('last_name', response.data) 
        self.assertIn('email', response.data)
        self.assertIn('customer_type', response.data)

    def test_customer_access_non_owner(self):
        """Test that a non-owner user cannot access/modify another user's customer."""
        another_user = CustomUser.objects.create_user(username='otheruser_access', email='other_access.api@example.com', password='password123')
        other_customer = Customer.objects.create(
            owner=another_user,
            first_name='OtherOwner',
            last_name='Customer',
            email='other.owner.api@example.com',
            customer_type=self.customer_type_individual
        )
        detail_url = reverse('customer-detail', kwargs={'pk': other_customer.pk})
        
        response_get = self.client.get(detail_url, format='json')
        self.assertEqual(response_get.status_code, status.HTTP_404_NOT_FOUND, response_get.data)
        
        put_data = {
            'first_name': 'AttemptedUpdate', 'last_name':'x', 'email':'x@x.com', 
            'customer_type': self.customer_type_individual.id, 'phone_number':'', 
            'company_name':'', 'address_line1':'', 'city':'', 'country':'', 'notes':'', 'is_active':True
        }
        response_put = self.client.put(detail_url, put_data, format='json')
        self.assertEqual(response_put.status_code, status.HTTP_404_NOT_FOUND, response_put.data)
        
        response_delete = self.client.delete(detail_url)
        self.assertEqual(response_delete.status_code, status.HTTP_404_NOT_FOUND, response_delete.data)

    def test_customer_access_by_staff_user(self):
        """Test that a staff user can access/list all customers."""
        self.client.logout()
        self.client.login(username='staffuser', password='password123')

        cust1 = Customer.objects.create(owner=self.user, first_name='UserCust', last_name='A', email='usercust.api@example.com', customer_type=self.customer_type_individual)
        another_user_for_staff = CustomUser.objects.create_user(username='anotheruser_stafftest', email='another_stafftest.api@example.com', password='password123')
        cust2 = Customer.objects.create(owner=another_user_for_staff, first_name='OtherCust', last_name='B', email='othercust_stafftest.api@example.com', customer_type=self.customer_type_company, company_name='Staff Access Co.', delegated_person_name='Delegate Staff')

        response_list = self.client.get(self.customers_url, format='json')
        self.assertEqual(response_list.status_code, status.HTTP_200_OK, response_list.data)
        results_list = response_list.data['results'] if isinstance(response_list.data, dict) and 'results' in response_list.data else response_list.data
        
        # Check that staff can see customers from different owners
        all_customer_emails = [c.email for c in Customer.objects.all()]
        self.assertEqual(len(results_list), len(all_customer_emails))
        self.assertTrue(any(c['email'] == cust1.email for c in results_list))
        self.assertTrue(any(c['email'] == cust2.email for c in results_list))

        detail_url_cust2 = reverse('customer-detail', kwargs={'pk': cust2.pk})
        response_get = self.client.get(detail_url_cust2, format='json')
        self.assertEqual(response_get.status_code, status.HTTP_200_OK, response_get.data)
        self.assertEqual(response_get.data['first_name'], 'OtherCust')

        # Staff can update any customer
        patch_data = {'notes': 'Updated by staff'}
        response_patch = self.client.patch(detail_url_cust2, patch_data, format='json')
        self.assertEqual(response_patch.status_code, status.HTTP_200_OK, response_patch.data)
        cust2.refresh_from_db()
        self.assertEqual(cust2.notes, 'Updated by staff')

        # Staff can delete any customer
        response_delete = self.client.delete(detail_url_cust2)
        self.assertEqual(response_delete.status_code, status.HTTP_204_NO_CONTENT, response_delete.data)
        self.assertFalse(Customer.objects.filter(pk=cust2.pk).exists())

    def test_create_customer_duplicate_email(self):
        """Test creating a customer with an email that already exists."""
        Customer.objects.create(
            owner=self.user, 
            first_name='Existing',
            last_name='User',
            email='duplicate.api@example.com',
            customer_type=self.customer_type_individual
        )
        data = {
            'first_name': 'New',
            'last_name': 'User',
            'email': 'duplicate.api@example.com', # Duplicate email
            'customer_type': self.customer_type_company.id
        }
        response = self.client.post(self.customers_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertIn('email', response.data)
        self.assertTrue('already exists' in str(response.data['email'][0]).lower() or 'unique' in str(response.data['email'][0]).lower())
