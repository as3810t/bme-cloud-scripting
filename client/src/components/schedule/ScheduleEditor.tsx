import ClusterType from "@src/utils/ClusterType";
import React from "react";
import ScheduleCalendar from "@src/components/schedule/ScheduleCalendar";
import ScheduleTable from "@src/components/schedule/ScheduleTable";
import ScheduleType from "@src/utils/ScheduleType";

type OverviewScheduleProps = {
  schedules: ScheduleType[]
  names: string[]
  colors: string[]
  onRowDelete: (row: { clusters: string[], from: Date, to: Date }) => void
  onRowAdd: (from: Date, to: Date) => void
  onDayClicked: (year: number, month: number, day: number) => void
}

const ScheduleEditor: React.FC<OverviewScheduleProps> = ({ schedules, names, colors, onRowAdd, onRowDelete, onDayClicked }) => {
  return (
    <>
      <ScheduleCalendar
          schedules={schedules}
          colors={colors}
          onDayClicked={onDayClicked}
      />
      <ScheduleTable
          schedules={schedules}
          names={names}
          onRowDelete={onRowDelete}
          onRowAdd={onRowAdd}
      />
    </>
  )
}

export default ScheduleEditor