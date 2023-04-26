import {Socket} from "socket.io-client";
import React, {useEffect, useState} from "react";
import JobType from "@src/utils/JobType";
import {Col, Container, Row, Table} from "react-bootstrap";
import {MdCalendarToday, MdEventRepeat} from "react-icons/md";

type JobTabProps = {
  socket: Socket
}

const JobTab: React.FC<JobTabProps> = ({ socket }) => {
  const [jobs, setJobs] = useState([] as JobType[])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const handler = setInterval(() => setNow(new Date()))

    return () => {
      clearInterval(handler)
    }
  }, [])

  useEffect(() => {
    socket.emit('get_jobs')
  }, [socket])

  useEffect(() => {
    function onJobs(jobs: any[]) {
      const j = jobs.map(job => ({
        ...job,
        date: job.date ? new Date(job.date) : undefined,
        uptime: job.uptime ? new Date(job.uptime) : undefined,
        interval: typeof job.interval === 'number' ? job.interval : parseInt(job.interval)
      }))

      j.sort((a: JobType, b: JobType) => {
        if(a.date === undefined) return -1
        if(b.date === undefined) return 1
        return a.date.getTime() - b.date.getTime()
      })

      setJobs(j)
    }

    socket.on('jobs', onJobs)

    return () => {
      socket.off('jobs', onJobs)
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
            {jobs.map(job => <tr key={job.name} style={{ backgroundColor: job.uptime !== undefined ? 'grey' : 'transparent' }}>
              <td>{job.name}</td>
              <td>
                {job.date && <><MdCalendarToday/> {job.date.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}</>}
                {!job.date && <><MdEventRepeat/> every {job.interval / (60 * 1000)} minutes</>}
              </td>
              <td>
                {job.uptime && uptimeString(job.uptime)}
              </td>
            </tr>)}
            </tbody>
          </Table>
        </Col>
      </Row>
    </Container>
  )
}

export default JobTab