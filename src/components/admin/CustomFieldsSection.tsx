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
  entityId: string;
  organizationId: string;
  className?: string;
}

export function CustomFieldsSection({ 
  entityType, 
  entityId, 
  organizationId,
  className 
}: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
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
      console.log("Fetched custom fields:", data);
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
    } catch (err) {
      console.error('Error fetching field values:', err);
      setError('Failed to load field values');
    }
  };

  const renderFieldValue = (field: CustomField) => {
    const value = values[field.id];
    if (!value) return '-';

    switch (field.field_type) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
        return value;

      case 'number':
        return value.toString();

      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);

      case 'date':
        return new Date(value).toLocaleDateString();

      case 'boolean':
        return value ? 'Yes' : 'No';

      case 'select':
        return value;

      case 'multi_select':
        return Array.isArray(value) ? value.join(', ') : value;

      default:
        return '-';
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

      <div className="grid grid-cols-1 gap-4">
        {fields.map((field) => (
          <div key={field.id} className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">
              {field.field_label}
            </span>
            {field.description && (
              <span className="text-xs text-gray-500 mb-1">
                {field.description}
              </span>
            )}
            <span className="text-sm text-gray-900">
              {renderFieldValue(field)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}