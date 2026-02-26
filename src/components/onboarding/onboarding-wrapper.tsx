'use client'

import { useState, useEffect } from 'react'
import { OnboardingProgress } from './onboarding-progress'
import { WelcomeStep } from './steps/welcome-step'
import { CreateGoalStep } from './steps/create-goal-step'
import { AIDemoStep } from './steps/ai-demo-step'
import { PracticeStep } from './steps/practice-step'
import { CompletionStep } from './steps/completion-step'

const ONBOARDING_COMPLETED = 'yarikiru_onboarding_completed'
const ONBOARDING_VERSION = '1.0'

type Step = 'welcome' | 'create-goal' | 'ai-demo' | 'practice' | 'completion'

interface GoalPlan {
  title: string
  projectId: string
  description?: string
  estimatedMinutes: number | null
  confidence: string
  category: string | null
  subTasks: Array<{ label: string; estimatedMinutes: number }>
  parallelGroups: any[]
}

interface OnboardingWrapperProps {
  onComplete: () => void
  onSkip: () => void
  onCreateGoal: (plan: GoalPlan) => Promise<void>
  onCreateAnother: () => void
  existingGoalsCount?: number
}

export function OnboardingWrapper({
  onComplete,
  onSkip,
  onCreateGoal,
  onCreateAnother,
  existingGoalsCount = 0,
}: OnboardingWrapperProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalPlan, setGoalPlan] = useState<GoalPlan | null>(null)
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null)

  // 既に目標がある場合はチュートリアルをスキップ
  useEffect(() => {
    if (existingGoalsCount > 0) {
      onSkip()
    }
  }, [existingGoalsCount, onSkip])

  const handleStart = () => {
    setCurrentStep('create-goal')
  }

  const handleGoalTitleSubmit = (title: string) => {
    setGoalTitle(title)
    setCurrentStep('ai-demo')
  }

  const handlePlanCreated = (plan: GoalPlan) => {
    setGoalPlan(plan)
  }

  const handleGoalCreated = (goalId: string) => {
    setCreatedGoalId(goalId)
    setCurrentStep('practice')
  }

  const handlePracticeComplete = () => {
    setCurrentStep('completion')
  }

  const handleComplete = () => {
    // オンボーディング完了フラグを保存
    localStorage.setItem(ONBOARDING_COMPLETED, 'true')
    localStorage.setItem(ONBOARDING_VERSION, ONBOARDING_VERSION)
    onComplete()
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'create-goal':
        setCurrentStep('welcome')
        break
      case 'ai-demo':
        setCurrentStep('create-goal')
        break
      case 'practice':
        setCurrentStep('ai-demo')
        break
      case 'completion':
        setCurrentStep('practice')
        break
    }
  }

  const steps: Step[] = ['welcome', 'create-goal', 'ai-demo', 'practice', 'completion']
  const currentStepIndex = steps.indexOf(currentStep)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="rounded-3xl bg-[#faf9f5] border border-gray-100 shadow-2xl p-6 md:p-10">
          {/* 進捗表示 */}
          {currentStep !== 'welcome' && currentStep !== 'completion' && (
            <OnboardingProgress currentStep={currentStepIndex} totalSteps={5} />
          )}

          {/* ステップ表示 */}
          {currentStep === 'welcome' && (
            <WelcomeStep
              onStart={handleStart}
              onSkip={onSkip}
            />
          )}

          {currentStep === 'create-goal' && (
            <CreateGoalStep
              onNext={handleGoalTitleSubmit}
              onBack={handleBack}
            />
          )}

          {currentStep === 'ai-demo' && (
            <AIDemoStep
              goalTitle={goalTitle}
              onPlanCreated={handlePlanCreated}
              onGoalCreated={handleGoalCreated}
              onCreateGoal={onCreateGoal}
              onBack={handleBack}
            />
          )}

          {currentStep === 'practice' && (
            <PracticeStep
              goalTitle={goalTitle}
              goalPlan={goalPlan}
              goalId={createdGoalId}
              onComplete={handlePracticeComplete}
              onBack={handleBack}
            />
          )}

          {currentStep === 'completion' && (
            <CompletionStep
              onComplete={handleComplete}
              onCreateAnother={onCreateAnother}
            />
          )}
        </div>
      </div>
    </div>
  )
}
