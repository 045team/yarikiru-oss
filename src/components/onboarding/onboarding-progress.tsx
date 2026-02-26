'use client'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-1 w-8 rounded-full transition-all duration-300 ${
            index < currentStep
              ? 'bg-[#d97756]'
              : index === currentStep
              ? 'bg-[#d97756]/50'
              : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}
