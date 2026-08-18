from django import forms
from django.core.exceptions import ValidationError
from .models import *
from datetime import date

class StaffForm(forms.ModelForm):
    """Form Adding/Editing Staff members"""

    password = forms.CharField(
        required=True,
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter password',
            'autocomplete': 'new-password',
        })
    )
        
    confirm_password = forms.CharField(
        required=True,
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm password',
            'autocomplete': 'new-password',
        })
    )

    class Meta:
        model = Staff
        fields = [
            'employee_id', 'first_name', 'last_name', 'email', 'phone',
            'role', 'department', 'monthly_target', 'performance_rating',
            'status', 'date_of_joining', 'date_of_birth', 'profile_photo',
            'gender', 'blood_group', 'address', 'reporting_manager',
            'emergency_contact_name', 'emergency_contact_phone', 'skills',
        ]
        widgets = {
            'employee_id' : forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter Employee ID'
            }),
            'first_name' : forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Fisrt Name',
                'id': 'firstNameInput',
            }),
            'last_name': forms.TextInput(attrs={
                'class' : 'form-control',
                'placeholder': 'Last Name',
                'id': 'lastNameInput',
            }),
            'email': forms.EmailInput(attrs={
                'class' : 'form-control',
                'placeholder': 'example@gmail.com',
                'id': 'emailInput',
            }),
            'phone': forms.TextInput(attrs={
                'class' : 'form-control',
                'type': 'tel',
                'placeholder': '+91 XXXXX XXXXX',
                'id': 'phoneInput',
            }),
            'role': forms.Select(attrs={
                'class':'form-control',
                'id':'roleInput',
                }),
            'department': forms.Select(attrs={
                'class':'form-control',
                'id':'departmentInput',
                }),
            'monthly_target': forms.TextInput(attrs={
                'class' : 'form-control',
                'placeholder' : '500000',
                'inputmode': 'decimal',
                'autocomplete': 'off',
                'id': 'monthlyTargetInput',
            }),
            'profile_photo': forms.FileInput(attrs={
                'class': 'form-control',
                'accept': 'image/*',
                'id': 'profilePhotoInput'
            }),

            'performance_rating': forms.NumberInput(attrs={
                'class': 'form-control',
                'min': '1',
                'max': '5'
            }),
            'status' : forms.Select(attrs={'class':'form-control', 'id':'statusInput'}),
            'date_of_joining': forms.DateInput(attrs={
                'class':'form-control',
                'type':'date',
                'id': 'dateOfJoiningInput',
            }),
            'date_of_birth': forms.DateInput(attrs={
                'class':'form-control',
                'type':'date',
                'id': 'dateOfBirthInput',
            }),

            # ---- NEW FIELDS ----
            'gender': forms.Select(attrs={
                'class': 'form-control',
                'id': 'genderInput',
            }),
            'blood_group': forms.Select(attrs={
                'class': 'form-control',
                'id': 'bloodGroupInput',
            }),
            'address': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 2,
                'placeholder': 'Full address',
                'id': 'addressInput',
            }),
            'reporting_manager': forms.Select(attrs={
                'class': 'form-control',
                'id': 'reportingManagerInput',
            }),
            'emergency_contact_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Emergency contact name',
                'id': 'emergencyContactNameInput',
                'maxlength': '40',
            }),
            'emergency_contact_phone': forms.TextInput(attrs={
                'class': 'form-control',
                'type': 'tel',
                'placeholder': '+91 XXXXX XXXXX',
                'id': 'emergencyContactPhoneInput',
            }),
            'skills': forms.HiddenInput(attrs={'id': 'skillsInput'}),
        }

    

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        qs = Staff.objects.filter(status='active')
        if self.instance and self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        self.fields['reporting_manager'].queryset = qs
        self.fields['reporting_manager'].required = False

        # Show only full name in dropdown, not employee_id
        self.fields['reporting_manager'].label_from_instance = (
            lambda obj: obj.full_name()
        )

    def clean_employee_id(self):
        employee_id = self.cleaned_data.get('employee_id')

        # Check if employee ID already exists in DB (Excluding current instance)
        if self.instance.pk:
            if Staff.objects.filter(employee_id=employee_id).exclude(pk=self.instance.pk).exists():
                raise ValidationError('This employee ID already exists!')
        else:
            if Staff.objects.filter(employee_id=employee_id).exists():
                raise ValidationError('This employee ID already exists!')
        
        return employee_id
    
    def clean_email(self):
        email = self.cleaned_data.get('email')

        # Check if email already exists in DB
        if self.instance.pk:
            if Staff.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
                raise ValidationError("This email is already exists!")
        else:
            if Staff.objects.filter(email=email).exists():
                raise ValidationError('This email is already exists!')
        return email
    
    def clean_phone(self):
        phone = self.cleaned_data.get('phone')

        # if not phone.isdigit():
        #     raise ValidationError("Phone number must contain only digits.")
        
        if len(phone) !=13:
            raise ValidationError("Phone number must be exactly 10 digits.")
        return phone

    def clean_emergency_contact_name(self):
        import re

        name = self.cleaned_data.get('emergency_contact_name')

        if not name:
            return name

        name = name.strip()

        if len(name) > 40:
            raise ValidationError("Emergency contact name cannot exceed 40 characters.")

        if not re.match(r'^[a-zA-Z\s]+$', name):
            raise ValidationError("Emergency contact name should contain letters only.")

        return name

    def clean_emergency_contact_phone(self):
        phone = self.cleaned_data.get('emergency_contact_phone')
        if phone and len(phone) != 13:
            raise ValidationError("Emergency contact phone must be a valid +91 number.")
        return phone

    def clean_skills(self):
        """skills = comma-separated names (letters only), e.g: Python, Django
        Stored in DB as JSON: ["Python", "Django"]"""
        import json
        import re

        MAX_SKILL_LENGTH = 30

        raw = self.cleaned_data.get('skills')

        if not raw or not raw.strip():
            return '[]'

        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                names = []
                for item in parsed:
                    if isinstance(item, dict):
                        names.append(item.get('name', '').strip())
                    else:
                        names.append(str(item).strip())
                names = [n[:MAX_SKILL_LENGTH] for n in names if n]
                raw_names = names
            else:
                raw_names = []
        except (TypeError, ValueError):
            raw_names = [s.strip()[:MAX_SKILL_LENGTH] for s in raw.split(',') if s.strip()]

        for skill_name in raw_names:
            if re.search(r'\d', skill_name):
                raise ValidationError(f"Skill '{skill_name}' should not contain numbers.")

        return json.dumps(raw_names)
    
    def clean(self):
        cleaned_data = super().clean()

         # ================= PASSWORD VALIDATION =================

        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')
    
        if password and confirm_password:
            if password != confirm_password:
                self.add_error(
                    'confirm_password',
                    'Passwords do not match.'
            )

        date_of_birth = cleaned_data.get('date_of_birth')
        date_of_joining = cleaned_data.get('date_of_joining')
        role = cleaned_data.get('role')
        monthly_target = cleaned_data.get('monthly_target')

        # ================= DATE VALIDATION =================

        if date_of_birth and date_of_joining:
            if date_of_birth >= date_of_joining:
                raise ValidationError(
                    'Date of birth must be before date of joining.'
                )

        today = date.today()

        if date_of_birth:

            if date_of_birth > today:
                raise ValidationError(
                    'Date of birth cannot be in the future.'
                )

            age = today.year - date_of_birth.year

            if (
                (today.month, today.day)
                <
                (date_of_birth.month, date_of_birth.day)
            ):
                age -= 1

            if age < 18:
                raise ValidationError(
                    'Employee must be at least 18 years old.'
                )

        # ================= MONTHLY TARGET VALIDATION =================

        roles_need_monthly_target = [
            'manager',
            'bde',
            'telecall',
            'telecaller',
            'sales exec',
            'sales executive',
            'sales_exec',
            'sales_executive',
        ]

        role_name = ''

        if role:
            if hasattr(role, 'role_name'):
                role_name = role.role_name
            else:
                role_name = str(role)

        role_name = role_name.strip().lower().replace('_', ' ')

        if role_name in roles_need_monthly_target:

            # If Django already found an error in monthly_target,
            # do not add another duplicate error.
            if 'monthly_target' not in self.errors:

                if monthly_target is None:
                    self.add_error(
                        'monthly_target',
                        'Monthly target is required for this role.'
                    )

                elif monthly_target <= 0:
                    self.add_error(
                        'monthly_target',
                        'Monthly target must be greater than 0.'
                    )

        else:
            cleaned_data['monthly_target'] = None

        # ================= REPORTING MANAGER VALIDATION =================

        reporting_manager = cleaned_data.get('reporting_manager')

        REPORTING_MANAGER_RULES = {
            'Admin': None,
            'Manager': ['Admin'],
            'Developer': ['Manager'],
            'Trainer': ['Manager'],
            'HR': ['Manager'],
            'Sales Exec Lead': ['Manager'],
            'Marketing Lead': ['Manager'],
            'Digital Marketing': ['Marketing Lead'],
            'Content Creator': ['Marketing Lead'],
            'Sales Exec': ['Sales Exec Lead'],
        }

        if role:
            allowed_manager_roles = REPORTING_MANAGER_RULES.get(role_name, 'ANY')

            if allowed_manager_roles is None:
                cleaned_data['reporting_manager'] = None

            elif allowed_manager_roles != 'ANY':
                if reporting_manager:
                    manager_role = reporting_manager.role.role_name
                    if manager_role not in allowed_manager_roles:
                        self.add_error(
                            'reporting_manager',
                            f"Reporting manager for {role_name} must be a "
                            f"{' or '.join(allowed_manager_roles)}."
                        )

        return cleaned_data
        
    def clean_profile_photo(self):
        photo = self.cleaned_data.get('profile_photo')

        if photo:

            if photo.size > 2 * 1024 * 1024:
                raise ValidationError('Photo must be less than 2 MB.')
                
        return photo
        

class EditStaffForm(StaffForm):
    """
    Edit existing Staff member.

    Password fields are optional:
    - Leave password blank -> old password remains unchanged.
    - Enter new password + confirm password -> password will be changed.
    """

    password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Enter new password',
            'autocomplete': 'new-password',
        })
    )

    confirm_password = forms.CharField(
        required=False,
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm new password',
            'autocomplete': 'new-password',
        })
    )

    class Meta(StaffForm.Meta):
        model = Staff
        fields = StaffForm.Meta.fields

    def clean(self):
        cleaned_data = super().clean()

        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        # Password is optional while editing
        if password or confirm_password:

            if not password:
                self.add_error(
                    'password',
                    'Please enter the new password.'
                )

            if not confirm_password:
                self.add_error(
                    'confirm_password',
                    'Please confirm the new password.'
                )

            if password and confirm_password:
                if password != confirm_password:
                    self.add_error(
                        'confirm_password',
                        'Passwords do not match.'
                    )

        return cleaned_data
    
class StaffFilterForm(forms.Form):
    """Form for filtering staff"""

    department = forms.ModelChoiceField(
        queryset=Department.objects.all(),
        empty_label='All Departments',
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-control',
            'id': 'departmentFilter'
        })
    )

    role = forms.ModelChoiceField(
        queryset=StaffRole.objects.all(),
        empty_label='All Roles',
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-control',
            'id': 'roleFilter'
        })
    )

    status = forms.ChoiceField(
        choices=[('', 'All Status')] + Staff.STATUS_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'form-control',
            'id': 'statusFilter'
        })
    )

    search = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Search by name, email or ID...',
            'id': 'staffSearch'
        })
    )
class StaffQuickEditForm(forms.ModelForm):
    """Quick edit form for inline updates"""
    class Meta:
        model = Staff
        fields = ['status', 'performance_rating', 'monthly_target']
        widgets = {
            'status': forms.Select(attrs={'class': 'form-select-field'}),
            'performance_rating': forms.NumberInput(attrs={
                'class':'form-input-field',
                'min': '1',
                'max': '5',
                }),
            'monthly_target': forms.NumberInput(attrs={
                'class': 'form-input-field',
                'step': '0.01',
            }),
        }

# =========================== STAFF OVERVIER FORM =============================

# ===== LEAD FORM =====
class LeadForm(forms.ModelForm):

    class Meta:
        model = Lead
        fields = ["staff", "name", "phone", "email", "status"]

        widgets = {
            "staff": forms.Select(attrs={"class": "form-control"}),
            "name": forms.TextInput(attrs={"class": "form-control"}),
            "phone": forms.TextInput(attrs={"class": "form-control"}),
            "email": forms.EmailInput(attrs={"class": "form-control"}),
            "status": forms.Select(attrs={"class": "form-control"}),
        }

    def clean_phone(self):
        phone = self.cleaned_data.get("phone")

        if phone and (not phone.isdigit() or len(phone) != 10):
            raise ValidationError("Phone must be 10 digits")

        return phone


# ===== LEAD ACTIVITY =====
class LeadActivityForm(forms.ModelForm):

    class Meta:
        model = LeadActivity
        fields = ["lead", "staff", "activity_type", "title", "description"]

        widgets = {
            "lead": forms.Select(attrs={"class": "form-control"}),
            "staff": forms.Select(attrs={"class": "form-control"}),
            "activity_type": forms.Select(attrs={"class": "form-control"}),
            "title": forms.TextInput(attrs={"class": "form-control"}),
            "description": forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        }


# ===== ATTENDANCE FORM =====
class AttendanceForm(forms.ModelForm):

    class Meta:
        model = Attendance
        fields = [
            "staff",
            "date",
            "log_in",
            "log_out",
            "status"
        ]

        widgets = {
            "staff": forms.Select(attrs={"class": "form-control"}),
            "date": forms.DateInput(
                attrs={"type": "date", "class": "form-control"}
            ),
            "log_in": forms.DateTimeInput(
                attrs={"type": "datetime-local", "class": "form-control"}
            ),
            "log_out": forms.DateTimeInput(
                attrs={"type": "datetime-local", "class": "form-control"}
            ),
            "status": forms.Select(
                attrs={"class": "form-control"}
            ),
        }

    def clean(self):
        cleaned_data = super().clean()

        login = cleaned_data.get("log_in")
        logout = cleaned_data.get("log_out")

        if login and logout and logout < login:
            raise ValidationError(
                "Logout time cannot be before login time"
            )

        return cleaned_data


# ===== REVENUE FORM =====
class RevenueForm(forms.ModelForm):

    class Meta:
        model = Revenue
        fields = ["staff", "lead", "amount", "source", "notes"]

        widgets = {
            "staff": forms.Select(attrs={"class": "form-control"}),
            "lead": forms.Select(attrs={"class": "form-control"}),
            "amount": forms.NumberInput(attrs={"class": "form-control"}),
            "source": forms.TextInput(attrs={"class": "form-control"}),
            "notes": forms.Textarea(attrs={"class": "form-control", "rows": 3}),
        }

    def clean_amount(self):
        amount = self.cleaned_data.get("amount")

        if amount is not None and amount <= 0:
            raise ValidationError("Amount must be greater than 0")

        return amount

# ================================ MY PROFILE FORM ================================

class staffProfileForm(forms.ModelForm):
    """Form for staff member to edit their own profile"""

    class Meta:
        model = Staff
        fields = [
            'first_name', 'last_name', 'email', 'phone',
            'profile_photo',
        ]
        widgets = {
            'first_name': forms.TextInput(attrs={
                'class': 'prof-input',
                'placeholder': 'First Name',
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'prof-input',
                'placeholder': 'Last Name',
            }),
            'email': forms.EmailInput(attrs={
                'class': 'prof-input',
                'placeholder': 'Email Address',
            }),
            'phone': forms.TextInput(attrs={
                'class': 'prof-input',
                'placeholder': '10-digit phone number',
            }),
            'profile_photo': forms.FileInput(attrs={
                'class': 'prof-file-input',
                'accept': 'image/*',
                'id': 'profilePhotoInput',
            }),
        }

    def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if phone and (not phone.isdigit() or len(phone) != 10):
            raise forms.ValidationError('Phone number must be exactly 10 digits.')
        return phone

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if self.instance.pk:
            if Staff.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
                raise forms.ValidationError('This email is already in use.')
        return email

        
def clean_phone(self):
        phone = self.cleaned_data.get('phone')
        if phone:
            if not phone.startswith('+91') or not phone[3:].isdigit() or len(phone[3:]) != 10:
                raise forms.ValidationError('Phone number should start with +91 and contain a valid 10-digit Indian mobile number.')
        return phone

def clean_email(self):
    email = self.cleaned_data.get('email')
    if self.instance.pk:
        if Staff.objects.filter(email=email).exclude(pk=self.instance.pk).exists():
            raise forms.ValidationError('This email is already in use.')
    return email

