import React, { createContext } from "react";

export type SettingsContextProps = {
  nightStartHour: number
  nightStartMinute: number
  nightEndHour: number
  nightEndMinute: number
}

export const DefaultSettingsContextProps = {
  nightStartHour: 20,
  nightStartMinute: 0,
  nightEndHour: 7,
  nightEndMinute: 0
}

const SettingsContext: React.Context<SettingsContextProps> = createContext(DefaultSettingsContextProps)

export default SettingsContext