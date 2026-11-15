import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface StepActionsProps {
  onBack?: () => void
  onContinue?: () => void
  submit?: boolean
  continueLabel?: string
  continueDisabled?: boolean
  continueIcon?: ReactNode
  loading?: boolean
}

export function StepActions({
  onBack,
  onContinue,
  submit,
  continueLabel = 'Continuar',
  continueDisabled,
  continueIcon,
  loading,
}: StepActionsProps) {
  return (
    <div className="mt-6 flex flex-col-reverse items-stretch gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <Button
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="sm:w-auto"
          iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
        >
          Atrás
        </Button>
      ) : (
        <span className="hidden sm:block" />
      )}
      <Button
        variant="accent"
        type={submit ? 'submit' : 'button'}
        onClick={submit ? undefined : onContinue}
        disabled={continueDisabled}
        loading={loading}
        className="min-w-0 shrink whitespace-normal text-center sm:w-auto"
        iconRight={continueIcon ?? <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
      >
        {continueLabel}
      </Button>
    </div>
  )
}
