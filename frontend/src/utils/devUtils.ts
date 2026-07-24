export function getAssignedDevNames(item?: any): string {
  if (!item) return "Unassigned"
  
  // If item is a bug, check linked bugTask
  const task = item.bugTask || item

  if (task.developers && Array.isArray(task.developers) && task.developers.length > 0) {
    const names: string[] = []
    task.developers.forEach((d: any) => {
      const devObj = d.developer || d
      const name = devObj?.fullName || devObj?.username || d.fullName || d.username
      if (name && !names.includes(name)) {
        names.push(name)
      }
    })
    if (names.length > 0) {
      return names.join(", ")
    }
  }

  const dev = task.assignedDeveloper || item.assignedDeveloper
  if (dev) {
    return dev.fullName || dev.username || "Unassigned"
  }

  return "Unassigned"
}

export function isTaskAssignedToUser(task: any, userId?: number): boolean {
  if (!task || !userId) return false
  if (task.assignedDeveloper?.id === userId) return true
  if (task.developers && Array.isArray(task.developers)) {
    return task.developers.some((d: any) => (d.developer?.id || d.id) === userId)
  }
  return false
}
