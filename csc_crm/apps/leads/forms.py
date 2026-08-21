from django import forms
from .models import *


class LeadCaptureForm(forms.ModelForm):

    class Meta:
        model = LeadCapture
        fields = '__all__'
        exclude = ['lead_id', 'created_at', 'updated_at']
        widgets = {
            'enquiry_date': forms.DateInput(attrs={
                'type': 'date',
                'id': 'enquiryDate',
            }),
            'next_followup_date': forms.DateInput(attrs={
                'type': 'date',
                'id': 'nextFollowUpDate',
            }),
            'phone_no': forms.TextInput(attrs={
                'id': 'phone_no',
                'placeholder': 'Enter phone number',
            }),
            'lead_name': forms.TextInput(attrs={
                'placeholder': 'Enter lead name',
                'id': 'id_lead_name'
            }),
            'email': forms.TextInput(attrs={
                'id': 'email',
                'placeholder': 'Enter email address'
            }),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['assigned_to'].queryset = Staff.objects.filter(
            role__role_name__in=['BDE', 'Telecall', 'Sales Exec'],
            status='active'
        )

    def clean_phone_no(self):
        phone = self.cleaned_data.get('phone_no')

        if phone:
            if (
                not phone.startswith('+91')
                or not phone[3:].isdigit()
                or len(phone[3:]) != 10
            ):
                raise forms.ValidationError(
                    'Phone number should start with +91 and contain a valid 10-digit Indian mobile number.'
                )

        return phone


# Call-log form
class CallLogForm(forms.ModelForm):
    class Meta:
        model = CallLog
        fields = '__all__'


# Lead Capture Target Form (Marketing)
class LeadCaptureTargetForm(forms.ModelForm):

    class Meta:
        model = LeadCaptureTarget
        fields = ['assigned_to', 'target_count', 'end_date']
        widgets = {
            'assigned_to': forms.Select(attrs={
                'id': 'id_target_assigned_to',
            }),
            'target_count': forms.NumberInput(attrs={
                'id': 'id_target_count',
                'placeholder': 'Enter lead target count',
                'min': 1,
            }),
            'end_date': forms.DateInput(attrs={
                'type': 'date',
                'id': 'id_target_end_date',
            }),
        }
        labels = {
            'assigned_to': 'Team Member',
            'target_count': 'Lead Target Count',
            'end_date': 'End Date',
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields['assigned_to'].queryset = Staff.objects.filter(
            department__dept_name='Marketing',
            status='active'
        )
    def clean_end_date(self):
        end_date = self.cleaned_data.get('end_date')
        today = timezone.localdate()

        if end_date and end_date < today:
            raise forms.ValidationError('End date cannot be in the past.')

        return end_date

    def clean_target_count(self):
        target_count = self.cleaned_data.get('target_count')

        if target_count is not None and target_count <= 0:
            raise forms.ValidationError('Lead target count must be greater than 0.')

        return target_count


# Lead Capture Target UPDATE Form (Marketing)
# Assignee cannot be changed here - only the target count and end date,
# since "achieved" progress is auto-calculated from captured leads.
class LeadCaptureTargetUpdateForm(forms.ModelForm):

    class Meta:
        model = LeadCaptureTarget
        fields = ['target_count', 'end_date']
        widgets = {
            'target_count': forms.NumberInput(attrs={
                'id': 'id_edit_target_count',
                'placeholder': 'Enter lead target count',
                'min': 1,
            }),
            'end_date': forms.DateInput(attrs={
                'type': 'date',
                'id': 'id_edit_target_end_date',
            }),
        }
        labels = {
            'target_count': 'Lead Target Count',
            'end_date': 'End Date',
        }

    def clean_target_count(self):
        target_count = self.cleaned_data.get('target_count')

        if target_count is not None and target_count <= 0:
            raise forms.ValidationError('Lead target count must be greater than 0.')

        return target_count


class LeadCaptureTargetProgressForm(forms.Form):
    """Team member self-reports how many leads they captured — no access
    to the full Lead Management page needed."""

    captured_count = forms.IntegerField(
        min_value=1,
        label='Leads Captured',
        widget=forms.NumberInput(attrs={
            'id': 'id_progress_count',
            'placeholder': 'How many leads did you capture?',
            'min': 1,
        }),
    )