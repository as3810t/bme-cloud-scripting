import React, { createContext } from "react";

type SettingsContextProps = {
  nightStartHour: number
  nightStartMinute: number
  nightEndHour: number
  nightEndMinute: number
}

const SettingsContext: React.Context<SettingsContextProps> = createContext({
  nightStartHour: 20,
  nightStartMinute: 0,
  nightEndHour: 7,
  nightEndMinute: 0
})

export default SettingsContext