import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

type CustomField = {
  id: string;
  field_name: string;
  field_type: string;
  field_label: string;
  description: string | null;
  is_required: boolean;
  default_value: any;
  options: string[] | null;
  validation_rules: any;
};

type CustomFieldValue = {
  id: string;
  field_id: string;
  value: any;
};

interface Props {
  entityType: 'case' | 'vendor' | 'customer' | 'product' | 'order' | 'quote';
  entityId?: string;
  organizationId: string;
  initialValues?: Record<string, any>;
  onChange?: (values: Record<string, any>) => void;
  className?: string;
}

export function CustomFieldsForm({ 
  entityType, 
  entityId,
  organizationId,
  initialValues = {},
  onChange,
  className 
}: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      fetchCustomFields();
    }
  }, [entityType, organizationId]);

  useEffect(() => {
    if (entityId && organizationId) {
      fetchFieldValues();
    }
  }, [entityId, organizationId, fields]);

  const fetchCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('entity_type', entityType)
        .eq('status', 'active')
        .order('display_order');

      if (error) throw error;
      setFields(data || []);
    } catch (err) {
      console.error('Error fetching custom fields:', err);
      setError('Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  };

  const fetchFieldValues = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_field_values')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('entity_id', entityId);

      if (error) throw error;

      const valueMap = (data || []).reduce((acc, val) => ({
        ...acc,
        [val.field_id]: val.value
      }), {});

      setValues(valueMap);
      if (onChange) {
        onChange(valueMap);
      }
    } catch (err) {
      console.error('Error fetching field values:', err);
      setError('Failed to load field values');
    }
  };

  const handleValueChange = (fieldId: string, value: any) => {
    const newValues = { ...values, [fieldId]: value };
    setValues(newValues);
    if (onChange) {
      onChange(newValues);
    }
  };

  const renderFieldInput = (field: CustomField) => {
    const value = values[field.id] ?? field.default_value;

    switch (field.field_type) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.field_type === 'email' ? 'email' : 'text'}
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        );

      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value ? Number(e.target.value) : null)}
            step={field.field_type === 'currency' ? '0.01' : '1'}
            min={field.validation_rules?.min || undefined}
            max={field.validation_rules?.max || undefined}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleValueChange(field.id, e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          >
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multi_select':
        return (
          <select
            multiple
            value={value || []}
            onChange={(e) => {
              const selectedOptions = Array.from(e.target.selectedOptions).map(opt => opt.value);
              handleValueChange(field.id, selectedOptions);
            }}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            size={4}
          >
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  if (!organizationId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (fields.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-lg font-semibold">Additional Information</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.field_label}
              {field.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-sm text-gray-500 mb-2">{field.description}</p>
            )}
            {renderFieldInput(field)}
          </div>
        ))}
      </div>
    </div>
  );
}