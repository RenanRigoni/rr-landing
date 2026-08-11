'use client'

interface DeleteButtonProps {
  action: () => Promise<void>
  confirmMessage: string
  label?: string
}

export function DeleteButton({ action, confirmMessage, label = 'Excluir' }: DeleteButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="rounded-pill border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition-colors ease-spring hover:bg-danger/10"
      >
        {label}
      </button>
    </form>
  )
}
