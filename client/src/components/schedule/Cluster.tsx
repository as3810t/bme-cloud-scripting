import React, { useEffect, useState } from 'react';

import {
  Accordion,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  ListGroup,
  ProgressBar,
  Row,
  useAccordionButton
} from "react-bootstrap";
import {FaCloud, FaPlay, FaStop} from "react-icons/fa";
import {HiDesktopComputer} from "react-icons/hi";
import ClusterType from "@src/utils/ClusterType";
import LineChart from "@src/components/schedule/LineChart";



function machineStateToColor(state: string) {
  switch (state) {
    case "loading": return "grey";
    case "running": return "green";
    case "stopped": return "black";
    default: return "red";
  }
}

function CustomToggle({ children, eventKey }: { children: any, eventKey: any }) {
  const decoratedOnClick = useAccordionButton(eventKey)

  return (
      <div onClick={decoratedOnClick} style={{ color: "black", cursor: 'pointer' }}>
        {children}&nbsp;›
      </div>
  );
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
              <Col sm={5} className={'d-flex flex-row justify-content-end'}>
                <InputGroup size="sm">
                  <Form.Control type="number" value={cluster.machines.length} min={0} max={100} step={1} readOnly/><InputGroup.Text>%</InputGroup.Text>
                </InputGroup>
                &nbsp;
                <Button
                    variant={"success"}
                    disabled={!selectionEnabled || operationUnderway > 0}
                    size="sm"
                    onClick={ () => {
                      setOperationUnderway(10)
                      onStartCluster(cluster)
                    }}
                >
                  <FaPlay/>
                </Button>&nbsp;
                <Button
                    variant={"danger"}
                    disabled={!selectionEnabled || operationUnderway > 0}
                    size="sm"
                    onClick={ () => {
                      setOperationUnderway(10)
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
      <ListGroup variant="flush">
        <ListGroup.Item className={'d-flex flex-wrap'} style={{ fontSize: '4em' }}>
          {cluster.machines.map(machine =>
              <a key={machine.id} href={`${cluster.url}/dashboard/vm/${machine.id}`} target="_blank" className={'d-flex'} >
                <HiDesktopComputer title={machine.id} style={{ color: machineStateToColor(machine.state) }} size="0.5em"/>
              </a>
          )}
        </ListGroup.Item>
        {(cluster.graphiteAPI && cluster.statistics) && <ListGroup.Item>
            <Accordion>
                <CustomToggle eventKey="0">Statistics</CustomToggle>
                <Accordion.Collapse eventKey="0">
                    <Container>
                        <Row>
                            <Col xs={12} sm={6}>
                                <LineChart color={color} title="VM count" max={120} datapoints={cluster.statistics.last10m.vmCount}/>
                            </Col>
                            <Col xs={12} sm={6}>
                                <LineChart color={color} title="CPU usage" max={100} datapoints={cluster.statistics.last10m.cpuUsage}/>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12} sm={6}>
                                <LineChart color={color} title="RAM usage" max={100} datapoints={cluster.statistics.last10m.ramUsage}/>
                            </Col>
                            <Col xs={12} sm={6}>
                                <LineChart color={color} title="RAM allocated" max={3000000000000/1000000000000} datapoints={cluster.statistics.last10m.ramAllocated.map(d => ([d[0] / 1000000000000, d[1]])) as any}/>
                            </Col>
                        </Row>
                    </Container>
                </Accordion.Collapse>
            </Accordion>
        </ListGroup.Item>}
      </ListGroup>
      {operationUnderway > 0 && <Card.Footer className="p-0">
        <ProgressBar now={operationUnderway/10*100}/>
      </Card.Footer>}
    </Card>
  )
}

export default Cluster