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

interface Props {
  entityType: 'case' | 'vendor' | 'customer' | 'product' | 'order' | 'quote' | 'lead' | 'opportunity';
  entityId?: string;
  organizationId: string;
  initialValues?: Record<string, any>;
  onChange?: (values: Record<string, any>, isValid: boolean) => void;
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
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      validateAllFields(valueMap);
      if (onChange) {
        onChange(valueMap, true); // Initially assume valid
      }
    } catch (err) {
      console.error('Error fetching field values:', err);
      setError('Failed to load field values');
    }
  };

  const validateField = (field: CustomField, value: any): string | null => {
    // Check required fields
    if (field.is_required && (value === undefined || value === null || value === '')) {
      return `${field.field_label} is required`;
    }

    // Skip other validations if value is empty and field is not required
    if (!value && !field.is_required) {
      return null;
    }

    // Type-specific validation
    switch (field.field_type) {
      case 'email':
        if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
          return 'Invalid email address';
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return 'Invalid URL';
        }
        break;

      case 'phone':
        if (!/^\+?[\d\s-()]{10,}$/.test(value)) {
          return 'Invalid phone number';
        }
        break;

      case 'number':
      case 'currency':
        if (isNaN(Number(value))) {
          return 'Must be a valid number';
        }
        if (field.validation_rules?.min !== undefined && value < field.validation_rules.min) {
          return `Must be at least ${field.validation_rules.min}`;
        }
        if (field.validation_rules?.max !== undefined && value > field.validation_rules.max) {
          return `Must be at most ${field.validation_rules.max}`;
        }
        break;

      case 'select':
        if (!field.options?.includes(value)) {
          return 'Invalid selection';
        }
        break;

      case 'multi_select':
        if (!Array.isArray(value) || !value.every(v => field.options?.includes(v))) {
          return 'Invalid selection';
        }
        break;
    }

    return null;
  };

  const validateAllFields = (newValues: Record<string, any>) => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field, newValues[field.id]);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleValueChange = (fieldId: string, value: any) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const newValues = { ...values, [fieldId]: value };
    setValues(newValues);

    // Validate the changed field
    const fieldError = validateField(field, value);
    const newErrors = { ...errors };
    if (fieldError) {
      newErrors[fieldId] = fieldError;
    } else {
      delete newErrors[fieldId];
    }
    setErrors(newErrors);

    if (onChange) {
      onChange(newValues, Object.keys(newErrors).length === 0);
    }
  };

  const renderFieldInput = (field: CustomField) => {
    const value = values[field.id] ?? field.default_value;
    const hasError = errors[field.id] != null;

    const baseInputClass = cn(
      "w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-200 outline-none",
      hasError 
        ? "border-red-300 focus:border-red-500 bg-red-50" 
        : "border-gray-300 focus:border-primary-500"
    );

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
            className={baseInputClass}
            required={field.is_required}
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
            min={field.validation_rules?.min}
            max={field.validation_rules?.max}
            className={baseInputClass}
            required={field.is_required}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className={baseInputClass}
            required={field.is_required}
          />
        );

      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleValueChange(field.id, e.target.checked)}
            className={cn(
              "rounded border-gray-300 text-primary-600 focus:ring-primary-500",
              hasError && "border-red-300"
            )}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
            className={baseInputClass}
            required={field.is_required}
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
            className={baseInputClass}
            size={4}
            required={field.is_required}
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
            {errors[field.id] && (
              <p className="mt-1 text-sm text-red-600">
                {errors[field.id]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}