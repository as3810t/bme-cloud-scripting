import {Socket} from "socket.io-client";
import React, {useEffect, useState} from "react";
import {Alert, Button, Col, Container, Form, Row} from "react-bootstrap";
import LogType from "@src/utils/LogType";

type LogTabProps = {
  socket: Socket
}

const SettingsTab: React.FC<LogTabProps> = ({ socket }) => {
  const [clustersJson, setClustersJson] = useState("")
  const [schedulesJson, setSchedulesJson] = useState("")
  const [settingsJson, setSettingsJson] = useState("")
  const [mode, setMode] = useState('SAVING' as ('VIEW' | 'EDIT' | 'SAVING'))

  useEffect(() => {
    socket.emit('get_jsons')
  }, [socket])

  useEffect(() => {
    function onJsons({ clusters, schedules, settings }: { clusters: string, schedules: string, settings: string }) {
      setMode('VIEW')
      setClustersJson(JSON.stringify(JSON.parse(clusters), null, 4))
      setSchedulesJson(JSON.stringify(JSON.parse(schedules), null, 4))
      setSettingsJson(JSON.stringify(JSON.parse(settings), null, 4))
    }

    socket.on('jsons', onJsons)

    return () => {
      socket.off('jsons', onJsons)
    }
  }, [socket])

  return (
    <Container>
      <Form>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="clustersJson">
            <Form.Label><code>clusters.json</code></Form.Label>
            <Form.Control
                as="textarea"
                rows={15}
                value={clustersJson}
                disabled={mode === 'SAVING'}
                onChange={(event) => {
                  setMode('EDIT')
                  setClustersJson(event.target.value)
                }}
            />
          </Form.Group>
          <Form.Group as={Col} controlId="schedulesJson">
            <Form.Label><code>schedules.json</code></Form.Label>
            <Form.Control
                as="textarea"
                rows={15}
                value={schedulesJson}
                disabled={mode === 'SAVING'}
                onChange={(event) => {
                  setMode('EDIT')
                  setSchedulesJson(event.target.value)
                }}
            />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="settingsJson">
            <Form.Label><code>settings.json</code></Form.Label>
            <Form.Control
                as="textarea"
                rows={15}
                value={settingsJson}
                disabled={mode === 'SAVING'}
                onChange={(event) => {
                  setMode('EDIT')
                  setSettingsJson(event.target.value)
                }}
            />
          </Form.Group>
          <Col className="d-flex flex-column justify-content-center align-items-center">
            {mode === 'EDIT' && <Alert variant="primary" style={{ width: '100%' }}>
              <div className="d-flex justify-content-center">
                <Button
                    variant="primary"
                    className="me-1"
                    onClick={() => {
                      setMode('SAVING')
                      socket.emit('set_jsons', { clusters: clustersJson, schedules: schedulesJson, settings: settingsJson })
                    }}
                >
                  Save changes
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => {
                      setMode('SAVING')
                      socket.emit('get_jsons')
                    }}
                >
                  Discard changes
                </Button>
              </div>
            </Alert>}
            <Button
                variant="danger"
                onClick={() => {
                  socket.emit('reload_jobs')
                }}
            >
              Reload jobs
            </Button>
          </Col>
        </Row>
      </Form>
    </Container>
  )
}

export default SettingsTab