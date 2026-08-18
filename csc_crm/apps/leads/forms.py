from django import forms
from .models import *

class LeadCaptureForm(forms.ModelForm):

    class Meta:
        model = LeadCapture
        fields = '__all__'
        exclude = ['lead_id', 'created_at', 'updated_at']
        widgets = {
            'enquiry_date': forms.DateInput(attrs={
                'type':'date',
                'id':'enquiryDate',
                }),
            'next_followup_date':forms.DateInput(attrs={
                'type': 'date',
                'id': 'nextFollowUpDate',
                }),
            'phone_no':forms.TextInput(attrs={
                'id':'phone_no',
                'placeholder': 'Enter phone number',
            }),
            'lead_name':forms.TextInput(attrs={
                'placeholder': 'Enter lead name',
                'id':'id_lead_name'
            }),
            'email':forms.TextInput(attrs={
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
            if not phone.startswith('+91') or not phone[3:].isdigit() or len(phone[3:]) != 10:
                raise forms.ValidationError('Phone number should start with +91 and contain a valid 10-digit Indian mobile number.')
        return phone


# Call-log form
class CallLogForm(forms.ModelForm):
    class Meta:
        model = CallLog
        fields = '__all__'