from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from ServerPilot_API.Users.models import CustomUser
from ServerPilot_API.Customers.models import Customer
import psutil
import datetime


class DashboardStatsView(APIView):
    """
    Provides detailed statistics for the admin dashboard.
    Requires admin user permissions.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        print("--- DashboardStatsView GET method called ---")
        # User statistics
        total_users = CustomUser.objects.count()
        active_users = CustomUser.objects.filter(is_active=True).count()
        inactive_users = total_users - active_users

        # Customer statistics
        total_customers = Customer.objects.count()
        # Placeholder for active/inactive customers if logic is defined
        # active_customers = Customer.objects.filter(status='active').count()
        # inactive_customers = total_customers - active_customers

        # System metrics
        cpu_usage = psutil.cpu_percent(interval=1)
        
        ram = psutil.virtual_memory()
        ram_total_gb = round(ram.total / (1024**3), 2)
        ram_used_gb = round(ram.used / (1024**3), 2)
        ram_usage_percent = ram.percent

        disk = psutil.disk_usage('/')
        disk_total_gb = round(disk.total / (1024**3), 2)
        disk_used_gb = round(disk.used / (1024**3), 2)
        disk_usage_percent = disk.percent

        # Calculate server uptime
        boot_time_timestamp = psutil.boot_time()
        boot_time_datetime = datetime.datetime.fromtimestamp(boot_time_timestamp)
        now_datetime = datetime.datetime.now()
        uptime_delta = now_datetime - boot_time_datetime

        total_seconds = int(uptime_delta.total_seconds())

        SECONDS_IN_MINUTE = 60
        SECONDS_IN_HOUR = SECONDS_IN_MINUTE * 60
        SECONDS_IN_DAY = SECONDS_IN_HOUR * 24
        # Approximate month and year for display purposes
        SECONDS_IN_MONTH = SECONDS_IN_DAY * 30 
        SECONDS_IN_YEAR = SECONDS_IN_DAY * 365

        uptime_years = total_seconds // SECONDS_IN_YEAR
        remainder_seconds = total_seconds % SECONDS_IN_YEAR

        uptime_months = remainder_seconds // SECONDS_IN_MONTH
        remainder_seconds %= SECONDS_IN_MONTH

        uptime_days = remainder_seconds // SECONDS_IN_DAY
        remainder_seconds %= SECONDS_IN_DAY

        uptime_hours = remainder_seconds // SECONDS_IN_HOUR
        remainder_seconds %= SECONDS_IN_HOUR

        uptime_minutes = remainder_seconds // SECONDS_IN_MINUTE
        
        uptime_components = {
            'years': uptime_years,
            'months': uptime_months,
            'days': uptime_days,
            'hours': uptime_hours,
            'minutes': uptime_minutes,
        }

        # Network I/O statistics (total since boot)
        net_io = psutil.net_io_counters()
        total_bytes_transferred = net_io.bytes_sent + net_io.bytes_recv
        total_bandwidth_gb_since_boot = round(total_bytes_transferred / (1024**3), 2)

        stats_data = {
            'users': {
                'total': total_users,
                'active': active_users,
                'inactive': inactive_users,
            },
            'customers': {
                'total': total_customers,
                # 'active': active_customers,
                # 'inactive': inactive_customers,
            },
            'system': {
                'cpu_usage_percent': cpu_usage,
                'ram': {
                    'total_gb': ram_total_gb,
                    'used_gb': ram_used_gb,
                    'percent': ram_usage_percent,
                },
                'storage': {
                    'total_gb': disk_total_gb,
                    'used_gb': disk_used_gb,
                    'percent': disk_usage_percent,
                },
                'uptime_components': uptime_components, # Detailed uptime
                'total_bandwidth_gb_since_boot': total_bandwidth_gb_since_boot, # Total bandwidth since boot
            },
        }

        print(f"--- Dashboard Stats Data: {stats_data} ---")
        return Response(stats_data)
