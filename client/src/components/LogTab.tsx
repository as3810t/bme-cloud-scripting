import {Socket} from "socket.io-client";
import ClusterType from "@src/utils/ClusterType";
import React, {useEffect, useState} from "react";
import LogType from "@src/utils/LogType";
import {Col, Container, Row, Table} from "react-bootstrap";
import {AiTwotoneCalendar} from "react-icons/ai";
import {MdCalendarToday, MdEventRepeat} from "react-icons/md";
import {FiLoader} from "react-icons/fi";

type LogTabProps = {
  socket: Socket
}

const LogTab: React.FC<LogTabProps> = ({ socket }) => {
  const [logs, setLogs] = useState([] as LogType[]);
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const handler = setInterval(() => setNow(new Date()))

    return () => {
      clearInterval(handler)
    }
  }, [])

  useEffect(() => {
    socket.emit('get_logs')
  }, [socket])

  useEffect(() => {
    function onLogs(logs: any[]) {
      const l = logs.map(log => ({
        ...log,
        date: log.date ? new Date(log.date) : undefined,
        uptime: log.uptime ? new Date(log.uptime) : undefined,
        interval: typeof log.interval === 'number' ? log.interval : parseInt(log.interval)
      }))

      l.sort((a: LogType, b: LogType) => {
        if(a.date === undefined) return -1
        if(b.date === undefined) return 1
        return a.date.getTime() - b.date.getTime()
      })

      setLogs(l)
    }

    socket.on('logs', onLogs)

    return () => {
      socket.off('logs', onLogs)
    }
  }, [socket])

  function uptimeString(since: Date): string {
    const elapsed = new Date(now.getTime() - since.getTime())
    return elapsed.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <Container>
      <Row>
        <Col>
          <Table striped bordered width="100%">
            <thead>
            <tr>
              <th>Name</th>
              <th>Scheduled</th>
              <th>Active</th>
            </tr>
            </thead>
            <tbody>
            {logs.map(log => <tr key={log.name} style={{ backgroundColor: log.uptime !== undefined ? 'grey' : 'transparent' }}>
              <td>{log.name}</td>
              <td>
                {log.date && <><MdCalendarToday/> {log.date.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</>}
                {!log.date && <><MdEventRepeat/> every {log.interval / (60 * 1000)} minutes</>}
              </td>
              <td>{log.uptime && uptimeString(log.uptime)}</td>
            </tr>)}
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>
  )
}

export default LogTab