import django_filters
from django.contrib.auth import get_user_model
from .models import Log
from datetime import timedelta

User = get_user_model()

class LogFilter(django_filters.FilterSet):
    user = django_filters.ModelChoiceFilter(
        field_name='user__username',
        to_field_name='username',
        queryset=User.objects.all(),
        label='Filter by username'
    )
    start_date = django_filters.DateFilter(field_name='timestamp', lookup_expr='gte', label='Start Date (YYYY-MM-DD)')
    end_date = django_filters.DateFilter(method='filter_by_end_date', label='End Date (YYYY-MM-DD)')

    class Meta:
        model = Log
        fields = ['user', 'action', 'start_date', 'end_date']

    def filter_by_end_date(self, queryset, name, value):
        """
        Filters the queryset to include logs up to the end of the given date.
        """
        end_date = value + timedelta(days=1)
        return queryset.filter(timestamp__lt=end_date)
