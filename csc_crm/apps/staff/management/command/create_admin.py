from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from csc_crm.apps.staff.models import Staff, StaffRole, Department
from datetime import date


class Command(BaseCommand):
    help = "Create default admin staff account"

    def handle(self, *args, **options):

        admin_role, _ = StaffRole.objects.get_or_create(
            role_name="Admin",
            defaults={
                "description": "System Administrator",
                "can_manage_leads": True,
                "can_manage_staff": True,
                "can_view_reports": True,
                "can_mark_attendance": True,
            }
        )

        mgmt_dept, _ = Department.objects.get_or_create(
            dept_name="Management",
            defaults={
                "description": "Management Department"
            }
        )

        username = "EMP001"
        password = "Admin@12345"
        email = "admin@cscCrm.com"

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
            }
        )

        if created:
            user.set_password(password)
            user.save()

        staff, staff_created = Staff.objects.get_or_create(
            employee_id=username,
            defaults={
                "first_name": "Senthil",
                "last_name": "V",
                "email": email,
                "phone": "+916380885757",
                "role": admin_role,
                "department": mgmt_dept,
                "status": "active",
                "date_of_joining": date.today(),
                "user": user,
            }
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Admin ready: {username}"
            )
        )