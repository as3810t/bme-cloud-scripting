import {Socket} from "socket.io-client";
import React, {useEffect, useState} from "react";
import {Col, Container, Form, Row} from "react-bootstrap";

type LogTabProps = {
  socket: Socket
}

const LogTab: React.FC<LogTabProps> = ({ socket }) => {
  const [logs, setLogs] = useState([] as string[])

  useEffect(() => {
    socket.emit('get_logs')
  }, [socket])

  useEffect(() => {
    function onLogs(logs: string[]) {
      setLogs(logs)
    }

    socket.on('logs', onLogs)

    return () => {
      socket.off('logs', onLogs)
    }
  }, [socket])

  useEffect(() => {
    function onLog(log: string) {
      logs.push(log)
      setLogs(structuredClone(logs))
    }

    socket.on('log', onLog)

    return () => {
      socket.off('log', onLog)
    }
  }, [socket, logs])

  return (
    <Container>
      <Row>
        <Col>
          <Form.Control
              as="textarea"
              disabled={true}
              rows={25}
              value={logs.join('')}
              style={{ backgroundColor: 'black', color: 'white', fontFamily: 'monospace' }}
          />
        </Col>
      </Row>
    </Container>
  )
}

export default LogTab