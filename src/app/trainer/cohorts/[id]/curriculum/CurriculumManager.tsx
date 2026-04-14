'use client'

import { useState } from 'react'
import CurriculumTable from '@/components/trainer/CurriculumTable'
import AddCurriculumWeekForm from '@/components/trainer/AddCurriculumWeekForm'

interface CurriculumManagerProps {
  cohortId: number
}

export default function CurriculumManager({ cohortId }: CurriculumManagerProps) {
  const [refreshSignal, setRefreshSignal] = useState(0)

  function handleWeekAdded() {
    setRefreshSignal((n) => n + 1)
  }

  return (
    <>
      <CurriculumTable cohortId={cohortId} refreshSignal={refreshSignal} />
      <AddCurriculumWeekForm cohortId={cohortId} onWeekAdded={handleWeekAdded} />
    </>
  )
}
