import React from 'react';

interface Field {
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required?: boolean;
  options?: string[];
}

interface Props {
  config: Field[];
  onChange: (data: Record<string, any>) => void;
}

export default function FormRenderer({ config, onChange }: Props) {
  const [values, setValues] = React.useState<Record<string, any>>({});

  function handleChange(field: string, value: any) {
    const newValues = { ...values, [field]: value };
    setValues(newValues);
    onChange(newValues);
  }

  return (
    <div className="space-y-4">
      {config.map((field: Field) => (
        <div key={field.field}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {field.label}
            {field.required && <span className="text-error ml-0.5">*</span>}
          </label>

          {field.type === 'textarea' ? (
            <textarea
              value={values[field.field] || ''}
              onChange={(e) => handleChange(field.field, e.target.value)}
              placeholder={`请输入${field.label}`}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none resize-none text-sm"
            />
          ) : field.type === 'select' ? (
            <select
              value={values[field.field] || ''}
              onChange={(e) => handleChange(field.field, e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm bg-white"
            >
              <option value="">请选择{field.label}</option>
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'date' ? (
            <input
              type="date"
              value={values[field.field] || ''}
              onChange={(e) => handleChange(field.field, e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
            />
          ) : (
            <input
              type={field.type}
              value={values[field.field] || ''}
              onChange={(e) => handleChange(field.field, field.type === 'number' ? Number(e.target.value) : e.target.value)}
              placeholder={`请输入${field.label}`}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
            />
          )}
        </div>
      ))}
    </div>
  );
}
