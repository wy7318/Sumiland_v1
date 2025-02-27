{/* Previous imports */}
import { CustomFieldsForm } from './CustomFieldsForm';

{/* Inside the form component, add this before the submit button */}
<CustomFieldsForm
  entityType="case"
  entityId={id}
  organizationId={formData.organization_id}
  onChange={(customFieldValues) => {
    // Store custom field values to be saved with the form
    setFormData(prev => ({
      ...prev,
      custom_fields: customFieldValues
    }));
  }}
  className="border-t border-gray-200 pt-6"
/>

{/* In the handleSubmit function, after saving the case */}
// Save custom field values
if (formData.custom_fields) {
  for (const [fieldId, value] of Object.entries(formData.custom_fields)) {
    const { error: valueError } = await supabase
      .from('custom_field_values')
      .upsert({
        organization_id: formData.organization_id,
        entity_id: caseId, // Use the ID of the saved case
        field_id: fieldId,
        value,
        created_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,field_id,entity_id'
      });

    if (valueError) {
      console.error('Error saving custom field value:', valueError);
    }
  }
}