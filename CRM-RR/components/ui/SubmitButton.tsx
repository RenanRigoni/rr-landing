interface SubmitButtonProps {
  pending: boolean
  label: string
  pendingLabel: string
}

export function SubmitButton({ pending, label, pendingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-pill bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition-all ease-spring hover:bg-brand-500 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
