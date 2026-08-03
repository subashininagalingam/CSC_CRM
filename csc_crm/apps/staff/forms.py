from django import forms
from django.core.exceptions import ValidationError
from .models import *
from datetime import date

class StaffForm(forms.ModelForm):
    """Form Adding/Editing Staff members"""

    class Meta:
        model = Staff
        fields = [
            'employee_id', 'first_name', 'last_name', 'email', 'phone',
            'role', 'department', 'monthly_target', 'performance_rating',
            'status', 'date_of_joining', 'date_of_birth', 'profile_photo',
        ]
        widgets = {
            'employee_id' : forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Auto-generated'
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
        }

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
    
    def clean(self):
        cleaned_data = super().clean()

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

        return cleaned_data
        
    def clean_profile_photo(self):
        photo = self.cleaned_data.get('profile_photo')

        if photo:

            if photo.size > 2 * 1024 * 1024:
                raise ValidationError('Photo must be less than 2 MB.')
                
        return photo
        

        # def clean_monthly_target(self):
        #     target = self.cleaned_data['monthly_target']

        #     if target <= 0:
        #         raise forms.ValidationError(
        #             "Monthly target cannot be negative."
        #         )
        #     return target
    
class EditStaffForm(forms.ModelForm):

    class Meta:
        model = Staff

        exclude = ['documents']
    
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


