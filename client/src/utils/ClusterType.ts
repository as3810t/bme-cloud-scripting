import ScheduleType from "@src/utils/ScheduleType";

type ClusterType = {
  name: string
  url: string
  graphiteAPI: boolean
  machines: [ { id: string, state: string } ]
  schedule: ScheduleType
  statistics: {
    last10m: {
      vmCount: [[number, number]],
      ramUsage: [[number, number]],
      cpuUsage: [[number, number]],
      ramAllocated: [[number, number]]
    }
  }
}

export default ClusterType