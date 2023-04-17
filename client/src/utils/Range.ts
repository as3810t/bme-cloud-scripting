import ScheduleType from "@src/utils/ScheduleType";


export function excludeRange(schedules: ScheduleType, from: Date, to: Date): ScheduleType {
  const result: ScheduleType = []

  for(let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i]
    // Schedule is before excluded range
    if(schedule.to.getTime() < from.getTime()) {
      result.push(schedule)
    }
    // Schedule is after excluded range
    else if(to.getTime() < schedule.from.getTime()) {
      result.push(schedule)
    }
    // Only the end of the schedule is inside the excluded range
    else if(schedule.from.getTime() < from.getTime() && from.getTime() <= schedule.to.getTime() && schedule.to.getTime() <= to.getTime()) {
      result.push({ from: schedule.from, to: from })
    }
    // Only the start of the schedule is inside the excluded range
    else if(from.getTime() <= schedule.from.getTime() && schedule.from.getTime() <= to.getTime() && to.getTime() < schedule.to.getTime()) {
      result.push({ from: to, to: schedule.to })
    }
    // The excluded range is completely inside the schedule
    else if(from.getTime() <= schedule.from.getTime() && schedule.to.getTime() <= to.getTime()) {
      // Do nothing
    }
    // The excluded range is completely inside the schedule
    else if(schedule.from.getTime() <= from.getTime() && to.getTime() <= schedule.to.getTime()) {
      result.push({ from: schedule.from, to: from })
      result.push({ from: to, to: schedule.to })
    }
    else {
      alert('Should not have happened')
      console.error('Should not have happened')
    }
  }

  return result
}

export function includeRange(schedules: ScheduleType, from: Date, to: Date): ScheduleType {
  const result: ScheduleType = []
  let processed = false

  for(let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i]
    // Schedule is before included range
    if(schedule.to.getTime() < from.getTime()) {
      result.push(schedule)
    }
    // Schedule is after included range
    else if(to.getTime() < schedule.from.getTime()) {
      result.push(schedule)
    }
    // The included range is completely inside the schedule
    else if(schedule.from.getTime() <= from.getTime() && to.getTime() <= schedule.to.getTime()) {
      result.push(schedule)
      processed = true
    }
    // The included range extends the start of an existing schedule
    else if(from.getTime() < schedule.from.getTime() && schedule.from.getTime() <= to.getTime() && to.getTime() <= schedule.to.getTime()) {
      result.push({ from: from, to: schedule.to })
      processed = true
    }
    // The included range extends the end of an existing schedule
    else if(schedule.from.getTime() <= from.getTime() && from.getTime() <= schedule.to.getTime() && schedule.to.getTime() < to.getTime()) {
      const start = schedule.from
      let end = to
      while (i+1 < schedules.length) {
        const nextSchedule = schedules[i + 1]
        // Included range is before next schedule
        if(end.getTime() < nextSchedule.from.getTime()) {
          break
        }
        // Included range ends inside next schedule
        else if(nextSchedule.from.getTime() <= end.getTime() && end.getTime() <= nextSchedule.to.getTime()) {
          end = nextSchedule.to
          i++
          break
        }
        // Next schedule is also inside included range
        else if(nextSchedule.to.getTime() < end.getTime()) {
          i++
        }
        else {
          alert('Should not have happened')
          console.error('Should not have happened')
        }
      }
      result.push({ from: start, to: end })
      processed = true
    }
    // The schedule is in the included range
    else if(from.getTime() < schedule.from.getTime() && schedule.to.getTime() < to.getTime()) {
      const start = from
      let end = to
      while (i+1 < schedules.length) {
        const nextSchedule = schedules[i + 1]

        // Included range is before next schedule
        if(end.getTime() < nextSchedule.from.getTime()) {
          break
        }
        // Included range ends inside next schedule
        else if(nextSchedule.from.getTime() <= end.getTime() && end.getTime() <= nextSchedule.to.getTime()) {
          end = nextSchedule.to
          i++
          break
        }
        // Next schedule is also inside included range
        else if(nextSchedule.to.getTime() < end.getTime()) {
          i++
        }
        else {
          alert('Should not have happened')
          console.error('Should not have happened')
        }
      }
      result.push({ from: start, to: end })
      processed = true
    }
    else {
      alert('Should not have happened')
      console.error('Should not have happened')
    }
  }
  if(!processed) {
    result.push({ from: from, to: to })
  }

  return result
}

export function isRangeIncluded(schedules: ScheduleType, from: Date, to: Date): boolean {
  for(let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i]
    if(schedule.from.getTime() <= from.getTime() && to.getTime() <= schedule.to.getTime()) {
      return true
    }
  }
  return false
}

export function isRangeNotIncluded(schedules: ScheduleType, from: Date, to: Date): boolean {
  for(let i = 0; i < schedules.length; i++) {
    const schedule = schedules[i]
    if(from.getTime() <= schedule.from.getTime() && schedule.to.getTime() <= to.getTime()) {
      return false
    }
    else if(schedule.from.getTime() < from.getTime() && from.getTime() < schedule.to.getTime()) {
      return false
    }
    else if(schedule.from.getTime() < to.getTime() && to.getTime() < schedule.to.getTime()) {
      return false
    }
  }
  return true
}