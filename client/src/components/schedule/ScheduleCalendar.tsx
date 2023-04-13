import React, {useContext, useEffect, useRef} from "react";
import AirDatepicker, { AirDatepickerOptions } from "air-datepicker";
import localeEn from 'air-datepicker/locale/en';
import ScheduleType from "@src/utils/ScheduleType";
import SettingsContext from "@src/context/SettingsContext";

function sameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
}

type ScheduleCalendarProps = {
  schedules: ScheduleType[]
  colors: string[]
  onDayClicked: (year: number, month: number, day: number) => void
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ schedules, colors, onDayClicked }) => {
  const [$input0, $input1, $input2] = [useRef(), useRef(), useRef()] as React.MutableRefObject<HTMLInputElement>[]
  const $airDatePickers = [useRef(), useRef(), useRef()] as React.MutableRefObject<AirDatepicker>[]
  const $canvas = useRef() as React.MutableRefObject<HTMLCanvasElement>

  const settingsContext = useContext(SettingsContext)

  const now = new Date();

  const onRenderCell = ({ date }: { date: Date }) => {
    const canvas = $canvas.current
    canvas.width = 100
    canvas.height = 100

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 100, 100)

    // Fill night
    ctx.fillStyle = '#e5efff'
    ctx.fillRect(0, 0, 100 * (settingsContext.nightEndHour * 60 + settingsContext.nightEndMinute) / (24 * 60), 100)
    ctx.fillRect(
        100 * (settingsContext.nightStartHour * 60 + settingsContext.nightStartMinute) / (24 * 60), 0,
        100 * (24 * 60 - settingsContext.nightStartHour * 60 - settingsContext.nightStartMinute) / (24 * 60), 100
    )

    // Fill day
    ctx.fillStyle = '#fdffe5'
    ctx.fillRect(
        100 * (settingsContext.nightEndHour * 60 + settingsContext.nightEndMinute) / (24 * 60), 0,
        100 * (settingsContext.nightStartHour * 60 + settingsContext.nightStartMinute - settingsContext.nightEndHour * 60 - settingsContext.nightEndMinute) / (24 * 60), 100
    )

    schedules.forEach((schedule, index) => {
      const ystart = index * 100 / schedules.length
      const yend = (index + 1) * 100 / schedules.length

      ctx.fillStyle = colors[index]

      schedule.forEach(event => {
        if(sameDay(event.from, date) || sameDay(event.to, date)) {
          const xstart = sameDay(event.from, date) ? 100 * (event.from.getHours() * 60 + event.from.getMinutes()) / (24 * 60) : 0
          const xend = sameDay(event.to, date) ? 100 * (event.to.getHours() * 60 + event.to.getMinutes()) / (24 * 60) : 100
          ctx.fillRect(xstart, ystart, xend - xstart, yend - ystart)
        }
        else if(
            event.from.getTime() <= new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0).getTime() &&
            new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0).getTime() <= event.to.getTime()
        ) {
          ctx.fillRect(0, ystart, 100, yend - ystart)
        }
      })
    })

    return {
      html: `
        <div style="background: url(${canvas.toDataURL()}); background-size: 100% 100%; width: 100%; height: 100%; opacity: 0.8;">
        </div>
        <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">${date.getDate()}</div>
      `,
      attrs: {
        style: ``
      }
    }
  }

  const airDatePickerOptions: Partial<AirDatepickerOptions> = {
    inline: true,
    locale: localeEn,
    firstDay: 1,
    showOtherMonths: true,
    selectOtherMonths: false
  }

  useEffect(() => {
    // Save instance for the further update
    if($airDatePickers[0].current) $airDatePickers.forEach($airDatePicker => $airDatePicker.current.destroy())

    $airDatePickers[0].current = new AirDatepicker($input0.current, {
      ...airDatePickerOptions,
      minDate: new Date(now.getFullYear(), now.getMonth(), 1),
      maxDate: new Date(now.getFullYear(), now.getMonth() + 1, 0)
    });

    $airDatePickers[1].current = new AirDatepicker($input1.current, {
      ...airDatePickerOptions,
      minDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      maxDate: new Date(now.getFullYear(), now.getMonth() + 2, 0)
    })

    $airDatePickers[2].current = new AirDatepicker($input2.current, {
      ...airDatePickerOptions,
      minDate: new Date(now.getFullYear(), now.getMonth() + 2, 1),
      maxDate: new Date(now.getFullYear(), now.getMonth() + 3, 0)
    });
  }, []);

  useEffect(() => {
    // Update if props are changed
    $airDatePickers.forEach($airDatePicker => $airDatePicker.current.update({
      onRenderCell: onRenderCell,
      onSelect: ({ date, datepicker }) => {
        const selectedDate = date as Date
        onDayClicked(selectedDate.getFullYear(), selectedDate.getMonth() + 1, selectedDate.getDate())
        // @ts-ignore
        datepicker.clear({ silent: true })
      }
    }))
  }, [schedules, onDayClicked]);

  return (
      <>
        <div className="d-flex mb-2">
          <input disabled ref={$input0} className={'d-none'} />
          <input disabled ref={$input1} className={'d-none'} />
          <input disabled ref={$input2} className={'d-none'} />
        </div>
        <canvas width={100} height={100} ref={$canvas} className={'d-none'}/>
      </>
  )
}

export default ScheduleCalendar