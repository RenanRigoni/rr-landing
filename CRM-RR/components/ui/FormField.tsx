interface FormFieldProps {
  label: string
  name: string
  defaultValue?: string | null
  type?: string
  required?: boolean
}

export function FormField({ label, name, defaultValue, type = 'text', required }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs font-medium text-content-secondary">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ''}
        className="rounded-inner border border-white/[0.08] bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors ease-spring focus:border-brand-500"
      />
    </div>
  )
}
