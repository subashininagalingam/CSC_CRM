from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from csc_crm.apps.staff.models import Staff, StaffRole, Department
from datetime import date


class Command(BaseCommand):
    help = "Create admin staff"

    def handle(self, *args, **kwargs):

        username = "EMP001"
        password = "Admin@12345"
        email = "admin@cscCrm.com"

        # Create User
        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email
            }
        )

        if user_created:
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            user.save()

            self.stdout.write(
                self.style.SUCCESS(
                    f"User {username} created successfully!"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f"User {username} already exists."
                )
            )

        # Create Admin Role
        admin_role, role_created = StaffRole.objects.get_or_create(
            role_name="Admin",
            defaults={
                "description": "System Administrator",
                "can_manage_leads": True,
                "can_manage_staff": True,
                "can_view_reports": True,
                "can_mark_attendance": True,
            }
        )

        # Create Management Department
        mgmt_dept, dept_created = Department.objects.get_or_create(
            dept_name="Management",
            defaults={
                "description": "Management Department"
            }
        )

        # Create Staff
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

        if staff_created:
            self.stdout.write(
                self.style.SUCCESS(
                    "Admin Staff created successfully!"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Admin Staff already exists!"
                )
            )