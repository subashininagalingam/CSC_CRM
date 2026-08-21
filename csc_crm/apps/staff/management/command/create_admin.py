from django.contrib.auth.models import User
from csc_crm.apps.staff.models import Staff, StaffRole, Department
from datetime import date

admin_role, created = StaffRole.objects.get_or_create(
    role_name='Admin',
    defaults={
        'description': 'System Administrator',
        'can_manage_leads': True,
        'can_manage_staff': True,
        'can_view_reports': True,
        'can_mark_attendance': True,
    }
)
print("Role:", admin_role, "| Created:", created)

mgmt_dept, created = Department.objects.get_or_create(
    dept_name='Management',
    defaults={'description': 'Management Department'}
)
print("Department:", mgmt_dept, "| Created:", created)

username = 'EMP001'
password = 'Admin@12345'

user = User.objects.create_user(
    username=username,
    email='admin@cscCrm.com',
    password=password
)
print("User created:", user)

staff = Staff.objects.create(
    employee_id=username,
    first_name='Senthil',
    last_name='V',
    email='admin@cscCrm.com',
    phone='+916380885757',
    role=admin_role,
    department=mgmt_dept,
    status='active',
    date_of_joining=date.today(),
    user=user,
)
print("Staff created:", staff)
print("DONE. Login with:", username, password)

