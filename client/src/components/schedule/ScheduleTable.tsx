import ScheduleType from "@src/utils/ScheduleType";
import React, {useEffect, useRef, useState} from "react";
import {Button, Table} from "react-bootstrap";
import {VscAdd, VscClose} from "react-icons/vsc";
import AirDatepicker from "air-datepicker";
import localeEn from "air-datepicker/locale/en";

function displayedSchedules(schedules: ScheduleType[], names: string[]): { clusters: string[], from: Date, to: Date }[] {
  const displayedSchedules: { clusters: string[], from: Date, to: Date }[] = []

  // Move schedules into displayedSchedules
  schedules.forEach((schedule, i) => {
    schedule.forEach(s => {
      displayedSchedules.push({ clusters: [names[i]], from: s.from, to: s.to })
    })
  })

  // Sort schedules
  displayedSchedules.sort((s1, s2) => s1.from.getTime() - s2.from.getTime())

  // Merge same dates
  for(let i = 0; i < displayedSchedules.length - 1; i++) {
    const schedule1 = displayedSchedules[i]
    const schedule2 = displayedSchedules[i + 1]

    const schedule1From = schedule1.from ? schedule1.from.getTime() : 0
    const schedule1To = schedule1.to ? schedule1.to.getTime() : 0
    const schedule2From = schedule2.from ? schedule2.from.getTime() : 0
    const schedule2To = schedule2.to ? schedule2.to.getTime() : 0

    if(schedule1From === schedule2From && schedule1To === schedule2To) {
      schedule1.clusters = schedule1.clusters.concat(schedule2.clusters)
      displayedSchedules.splice(i + 1, 1)
      i--
    }
  }

  return displayedSchedules
}

type ScheduleTableProps = {
  schedules: ScheduleType[]
  names: string[]
  onRowDelete: (row: { clusters: string[], from: Date, to: Date }) => void
  onRowAdd: (from: Date, to: Date) => void
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({ schedules, names, onRowDelete, onRowAdd }) => {
  const $fromInput = useRef() as React.MutableRefObject<HTMLInputElement>
  const $toInput = useRef() as React.MutableRefObject<HTMLInputElement>
  const $fromDatePicker = useRef() as React.MutableRefObject<AirDatepicker>
  const $toDatePicker = useRef() as React.MutableRefObject<AirDatepicker>

  useEffect(() => {
    const options = {
      locale: localeEn,
      firstDay: 1,
      isMobile: true,
      autoClose: true,
      timepicker: true,
      dateFormat: 'yyyy. MM. dd.',
      selectOtherMonths: false,
      timeFormat: 'HH:mm',
      minDate: new Date()
    }

    if($fromDatePicker.current) $fromDatePicker.current.destroy()
    $fromDatePicker.current = new AirDatepicker($fromInput.current, {
      ...options,
      onSelect: ({ date }) => {
        $toDatePicker.current.update({ minDate: date as never })
      }
    });

    if($toDatePicker.current) $fromDatePicker.current.destroy()
    $toDatePicker.current = new AirDatepicker($toInput.current, {
      ...options,
      onSelect: ({ date }) => {
        $fromDatePicker.current.update({ maxDate: date as never })
      }
    });
  }, [])

  return (
      <Table striped bordered width="100%">
        <thead>
          <tr>
            <th>Cluster</th>
            <th>From</th>
            <th>To</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayedSchedules(schedules, names).map(s =>
            <tr style={(!s.from || !s.to) ? { backgroundColor: 'red' } : {}} key={`${s.clusters.join('-')}-${s.from ? s.from.toString() : 'null'}-${s.to ? s.to.toUTCString() : null}`}>
              <td>{s.clusters.join(', ')}</td>
              {s.from && <td>{s.from.toISOString().slice(0, 16).replace(/-/g, ". ").replace("T", ". ")}</td>}
              {!s.from && <td></td>}
              {s.to && <td>{s.to.toISOString().slice(0, 16).replace(/-/g, ". ").replace("T", ". ")}</td>}
              {!s.to && <td></td>}
              <td><Button variant="danger" size="sm" onClick={() => onRowDelete(s)}><VscClose/></Button></td>
            </tr>
          )}

          <tr>
            <td>{names.join(', ')}</td>
            <td><input ref={$fromInput} type="text"/></td>
            <td><input ref={$toInput} type="text"/></td>
            <td>
              <Button
                  variant="success"
                  size="sm"
                  onClick={() => onRowAdd($fromDatePicker.current.selectedDates[0], $toDatePicker.current.selectedDates[0])}>
                <VscAdd/>
              </Button>

            </td>
          </tr>
        </tbody>
      </Table>
  )
}

export default ScheduleTable