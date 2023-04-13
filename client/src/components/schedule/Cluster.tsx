import React, { useEffect, useState } from 'react';

import {Button, Card, Col, Container, Form, ProgressBar, Row} from "react-bootstrap";
import {FaCloud, FaPlay, FaStop} from "react-icons/fa";
import {HiDesktopComputer} from "react-icons/hi";
import ClusterType from "@src/utils/ClusterType";



function machineStateToColor(state: string) {
  switch (state) {
    case "loading": return "grey";
    case "running": return "green";
    case "stopped": return "black";
    default: return "red";
  }
}

type ClusterProps = {
  cluster: ClusterType
  color: string
  selectionEnabled: boolean,
  onStartCluster: (cluster: ClusterType) => void
  onStopCluster: (cluster: ClusterType) => void
  onClusterSelected: (cluster: ClusterType) => void
  onClusterDeselected: (cluster: ClusterType) => void
}

const Cluster: React.FC<ClusterProps> = ({ cluster, color, selectionEnabled, onStartCluster, onStopCluster, onClusterSelected, onClusterDeselected }) => {
  const [operationUnderway, setOperationUnderway] = useState(0)

  useEffect(() => {
    setTimeout(() => {
      if(operationUnderway > 0) setOperationUnderway(operationUnderway - 1)
    }, 1000)
  }, [operationUnderway])

  return (
    <Card bg={color} key={cluster.name} className="mb-2">
      <Form.Check.Label style={{ width: '100%' }}>
        <Card.Header>
          <Container>
            <Row>
              <Col className={'d-flex align-items-center'}>
                <Form.Check
                    type={"checkbox"}
                    disabled={!selectionEnabled}
                    onChange={(e) => e.target.checked ? onClusterSelected(cluster) : onClusterDeselected(cluster) }
                />
              </Col>
              <Col className={'d-flex align-items-center'}>
                <a href={cluster.url} target="_blank" style={{ color: 'black', textDecoration: 'none' }}>
                  <FaCloud/>&nbsp;{cluster.name}
                </a>
              </Col>
              <Col className={'d-flex flex-row justify-content-end'}>
                <Form.Control type="number" value={cluster.machines.length} min={0} max={cluster.machines.length} step={1} readOnly />&nbsp;
                <Button
                    variant={"success"}
                    disabled={!selectionEnabled || operationUnderway > 0}
                    onClick={ () => {
                      setOperationUnderway(60)
                      onStartCluster(cluster)
                    }}
                >
                  <FaPlay/>
                </Button>&nbsp;
                <Button
                    variant={"danger"}
                    disabled={!selectionEnabled || operationUnderway > 0}
                    onClick={ () => {
                      setOperationUnderway(60)
                      onStopCluster(cluster)
                    }}
                >
                  <FaStop/>
                </Button>
              </Col>
            </Row>
          </Container>
        </Card.Header>
      </Form.Check.Label>
      <Card.Body className={'d-flex flex-wrap'} style={{ fontSize: '4em' }}>
        {cluster.machines.map(machine =>
            <a key={machine.id} href={`${cluster.url}/dashboard/vm/${machine.id}`} target="_blank" className={'d-flex'} >
              <HiDesktopComputer title={machine.id} style={{ color: machineStateToColor(machine.state) }}/>
            </a>
        )}
      </Card.Body>
      {operationUnderway > 0 && <Card.Footer className="p-0">
        <ProgressBar now={operationUnderway/60*100}/>
      </Card.Footer>}
    </Card>
  )
}

export default Cluster