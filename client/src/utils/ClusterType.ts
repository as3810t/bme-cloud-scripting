import ScheduleType from "@src/utils/ScheduleType";

type ClusterType = {
  name: string
  url: string
  machines: [ { id: string, state: string } ]
  schedule: ScheduleType
}

export default ClusterType