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

# Call-log form
class CallLogForm(forms.ModelForm):
    class Meta:
        model = CallLog
        fields = '__all__'