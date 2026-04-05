import { UnitNode, type UnitStatus } from "@/components/UnitNode"

interface UnitData {
  unitNumber: number
  name: string
  topic: string
  prerequisites: number[]
}

const UNITS: UnitData[] = [
  { unitNumber: 1, name: "toki!", topic: "Greetings", prerequisites: [] },
  { unitNumber: 2, name: "ijo", topic: "Core nouns", prerequisites: [1] },
  { unitNumber: 3, name: "pali", topic: "Actions", prerequisites: [1] },
  {
    unitNumber: 4,
    name: "li · e",
    topic: "Sentence structure",
    prerequisites: [2, 3],
  },
  { unitNumber: 5, name: "nasin nimi", topic: "Modifiers", prerequisites: [4] },
  { unitNumber: 6, name: "pi", topic: "Modifier grouping", prerequisites: [5] },
  { unitNumber: 7, name: "la", topic: "Context & time", prerequisites: [5] },
  {
    unitNumber: 8,
    name: "o!",
    topic: "Commands & wishes",
    prerequisites: [6, 7],
  },
  {
    unitNumber: 9,
    name: "toki musi",
    topic: "Creative expression",
    prerequisites: [8],
  },
  {
    unitNumber: 10,
    name: "jan sona",
    topic: "Fluency practice",
    prerequisites: [9],
  },
]

interface SkillTreeProps {
  completedUnits?: number[]
  currentUnit?: number
}

function getUnitStatus(
  unit: UnitData,
  completedUnits: number[],
  currentUnit: number,
): UnitStatus {
  if (completedUnits.includes(unit.unitNumber)) return "completed"
  if (unit.unitNumber === currentUnit) return "current"
  const prereqsMet = unit.prerequisites.every((p) => completedUnits.includes(p))
  if (prereqsMet) return "available"
  return "locked"
}

export function SkillTree({
  completedUnits = [],
  currentUnit = 1,
}: SkillTreeProps) {
  const rows: UnitData[][] = [
    [UNITS[0]], // Unit 1
    [UNITS[1], UNITS[2]], // Units 2 & 3 (parallel)
    [UNITS[3]], // Unit 4
    [UNITS[4]], // Unit 5
    [UNITS[5], UNITS[6]], // Units 6 & 7 (parallel)
    [UNITS[7]], // Unit 8
    [UNITS[8]], // Unit 9
    [UNITS[9]], // Unit 10
  ]

  return (
    <div className="flex flex-col items-center gap-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex}>
          {/* Connector line from previous row */}
          {rowIndex > 0 && (
            <div className="flex justify-center py-1">
              <div className="h-6 w-px bg-zen-border2" />
            </div>
          )}

          {/* Branch split indicator (before parallel rows) */}
          {row.length > 1 && (
            <div className="flex items-center justify-center gap-24 pb-1">
              <div className="h-px w-12 bg-zen-border2" />
              <div className="h-px w-12 bg-zen-border2" />
            </div>
          )}

          {/* Unit nodes */}
          <div
            className={
              row.length > 1
                ? "flex items-start justify-center gap-8"
                : "flex justify-center"
            }
          >
            {row.map((unit) => (
              <UnitNode
                key={unit.unitNumber}
                unitNumber={unit.unitNumber}
                name={unit.name}
                topic={unit.topic}
                status={getUnitStatus(unit, completedUnits, currentUnit)}
                prerequisites={unit.prerequisites}
              />
            ))}
          </div>

          {/* Branch merge indicator (after parallel rows) */}
          {row.length > 1 && (
            <div className="flex items-center justify-center gap-24 pt-1">
              <div className="h-px w-12 bg-zen-border2" />
              <div className="h-px w-12 bg-zen-border2" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
