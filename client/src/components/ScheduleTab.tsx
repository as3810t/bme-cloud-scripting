import React, {useContext, useEffect, useState} from 'react';
import "bootstrap/scss/bootstrap.scss";
import "air-datepicker/air-datepicker.css";
import './Application.scss';
import {Alert, Button, Col, Container, Row} from "react-bootstrap";
import Cluster from "@src/components/schedule/Cluster";
import ClusterType from "@src/utils/ClusterType";
import ScheduleEditor from "@src/components/schedule/ScheduleEditor";
import clusterColors from "@src/utils/ClusterColors";
import SettingsContext from "@src/context/SettingsContext";
import {Socket} from "socket.io-client"
import {excludeRange, includeRange, isRangeIncluded, isRangeNotIncluded} from "@src/utils/Range";

type ScheduleTabProps = {
  socket: Socket
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ socket }) => {
  const [clusters, setClusters] = useState([] as ClusterType[]);
  const [selectedClusters, setSelectedClusters] = useState([] as string[]);

  const [mode, setMode] = useState('VIEW' as ('VIEW' | 'EDIT' | 'SAVING'))
  const [originalSchedules, setOriginalSchedules] = useState(null as ClusterType[] | null)

  const settingsContext = useContext(SettingsContext)

  function currentClusters() {
    if(selectedClusters.length === 0) return clusters;
    else return selectedClusters.map(name => clusters.find(c => c.name === name)!).sort((c1, c2) => clusters.indexOf(c1) - clusters.indexOf(c2))
  }

  useEffect(() => {
    socket.emit('get_clusters')
  }, [socket])

  useEffect(() => {
    function onClusters(clusters: ClusterType[]) {
      setMode('VIEW')
      setClusters(clusters.map(cluster => ({
        ...cluster,
        schedule: cluster.schedule.map(s => ({
          from: new Date(s.from),
          to: new Date(s.to)
        }))
      })))
    }

    function onVmStatusUpdate({ cluster: clusterName, statuses }: { cluster: string, statuses: { [_: string]: string }}) {
      const cluster = clusters.find(c => c.name === clusterName)!
      for(const id in statuses) {
        const machine = cluster.machines.find(m => m.id === id)!
        machine.state = statuses[id]
      }

      setClusters(structuredClone(clusters))
    }

    socket.on('clusters', onClusters)
    socket.on('vm_status_update', onVmStatusUpdate)

    return () => {
      socket.off('vm_status_update', onVmStatusUpdate)
      socket.off('clusters', onClusters)
    }
  }, [socket, clusters])

  return (
    <Container>
      <Row>
        <Col sm={12} lg={6}>
          {mode === 'EDIT' && <Alert variant="primary">
            <div className={'d-flex justify-content-center'}>
              <Button
                  variant="primary"
                  onClick={() => {
                    setMode('SAVING')
                    setOriginalSchedules(null)
                    socket.emit('override_schedules', clusters.map(cluster => ({
                      name: cluster.name,
                      schedule: cluster.schedule.map(s => ({
                        from: s.from.toISOString(),
                        to: s.to.toISOString()
                      }))
                    })))
                  }}
              >
                  Save changes
              </Button>&nbsp;
              <Button
                  variant="secondary"
                  onClick={() => {
                    setMode('VIEW')
                    if(originalSchedules !== null) {
                      setClusters(originalSchedules)
                      setOriginalSchedules(null)
                    }
                  }}
              >
                  Discard changes
              </Button>
            </div>
          </Alert>}
          {mode === 'SAVING' && <Alert variant="primary">
              Saving...
          </Alert>}
          {clusters.map((cluster, index) =>
            <Cluster
                key={cluster.name}
                cluster={cluster}
                color={clusterColors(index)}
                selectionEnabled={mode === 'VIEW'}
                onStartCluster={(cluster) => {
                  socket.emit('start_cluster', cluster.name)
                }}
                onStopCluster={(cluster) => {
                  socket.emit('stop_cluster', cluster.name)
                }}
                onClusterSelected={(cluster) => {
                  setSelectedClusters(selectedClusters.concat(cluster.name))
                }}
                onClusterDeselected={(cluster) => {
                  setSelectedClusters(selectedClusters.filter(c => c !== cluster.name))
                }}
            />
          )}
        </Col>
        <Col sm={12} lg={6}>
          <ScheduleEditor
              schedules={currentClusters().map(c => c.schedule)}
              names={currentClusters().map(c => c.name)}
              colors={currentClusters().map(c => clusterColors(clusters.indexOf(c)))}
              onRowDelete={({ clusters: modifiedClusters, from, to }) => {
                if(mode === 'SAVING') return
                setMode('EDIT')

                if(originalSchedules === null) setOriginalSchedules(structuredClone(clusters))
                modifiedClusters.forEach(clusterName => {
                  const cluster = clusters.find(c => c.name === clusterName)!
                  cluster.schedule = excludeRange(cluster.schedule, from, to)
                })
                setClusters(structuredClone(clusters))
              }}
              onRowAdd={(from, to) => {
                if(mode === 'SAVING') return
                setMode('EDIT')

                if(originalSchedules === null) setOriginalSchedules(structuredClone(clusters))
                currentClusters().forEach(cluster => {
                  cluster.schedule = includeRange(cluster.schedule, from, to)
                })
                setClusters(structuredClone(clusters))
              }}
              onDayClicked={(year, month, day) => {
                if(mode === 'SAVING') return
                setMode('EDIT')

                if(originalSchedules === null) setOriginalSchedules(structuredClone(clusters))
                currentClusters().forEach(cluster => {
                  const dayStart = new Date(year, month - 1, day, settingsContext.nightEndHour, settingsContext.nightEndMinute)
                  const nightStart = new Date(year, month - 1, day, settingsContext.nightStartHour, settingsContext.nightStartMinute)
                  const nightEnd = new Date(year, month - 1, day + 1, settingsContext.nightEndHour, settingsContext.nightEndMinute)

                  const dayEnabled = isRangeIncluded(cluster.schedule, dayStart, nightStart)
                  const dayDisabled = isRangeNotIncluded(cluster.schedule, dayStart, nightStart)
                  const nightEnabled = isRangeIncluded(cluster.schedule, nightStart, nightEnd)
                  const nightDisabled = isRangeNotIncluded(cluster.schedule, nightStart, nightEnd)

                  // If both excluded, include evening
                  if(!dayEnabled && dayDisabled && !nightEnabled && nightDisabled) {
                    cluster.schedule = includeRange(cluster.schedule, nightStart, nightEnd)
                  }
                  // If evening included, include day
                  else if(!dayEnabled && dayDisabled && nightEnabled && !nightDisabled) {
                    cluster.schedule = includeRange(cluster.schedule, dayStart, nightStart)
                  }
                  // If evening and day included, exclude both
                  else if(dayEnabled && !dayDisabled && nightEnabled && !nightDisabled) {
                    cluster.schedule = excludeRange(cluster.schedule, dayStart, nightEnd)
                  }
                  else {
                    alert('Use table')
                  }
                })
                setClusters(structuredClone(clusters))
              }}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default ScheduleTab;
