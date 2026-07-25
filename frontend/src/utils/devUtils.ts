/** Returns the deduped union list of co-owner names for a task or bug. */
export function getAssignedDevNameList(item?: any): string[] {
  if (!item) return []

  // If item is a bug, check linked bugTask
  const task = item.bugTask || item

  const names: string[] = []
  if (task.developers && Array.isArray(task.developers) && task.developers.length > 0) {
    task.developers.forEach((d: any) => {
      const devObj = d.developer || d
      const name = devObj?.fullName || devObj?.username || d.fullName || d.username
      if (name && !names.includes(name)) {
        names.push(name)
      }
    })
  }

  if (names.length === 0) {
    const dev = task.assignedDeveloper || item.assignedDeveloper
    const name = dev?.fullName || dev?.username
    if (name) names.push(name)
  }

  return names
}

/** Full comma-joined list of all co-owner names (used for tooltips / wide columns). */
export function getAssignedDevNames(item?: any): string {
  const names = getAssignedDevNameList(item)
  return names.length > 0 ? names.join(", ") : "Unassigned"
}

/**
 * Compact display for narrow columns: shows the first `maxVisible` names and a
 * "+N" overflow badge, e.g. "Asha, Ben +2".
 * Pair it with title={getAssignedDevNames(item)} so the tooltip reveals all names.
 * Single-dev (N=1) returns just the one name — byte-identical to before.
 */
export function getAssignedDevNamesCompact(item?: any, maxVisible: number = 2): string {
  const names = getAssignedDevNameList(item)
  if (names.length === 0) return "Unassigned"
  if (names.length <= maxVisible) return names.join(", ")
  const shown = names.slice(0, maxVisible).join(", ")
  const remaining = names.length - maxVisible
  return `${shown} +${remaining}`
}

export function isTaskAssignedToUser(task: any, userId?: number): boolean {
  if (!task || !userId) return false
  if (task.assignedDeveloper?.id === userId) return true
  if (task.developers && Array.isArray(task.developers)) {
    return task.developers.some((d: any) => (d.developer?.id || d.id) === userId)
  }
  return false
}