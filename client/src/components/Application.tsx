import React, { useEffect, useState } from 'react';
import "bootstrap/scss/bootstrap.scss";
import "air-datepicker/air-datepicker.css";
import './Application.scss';
import {Container, Nav, Navbar} from "react-bootstrap";
import SettingsContext, {DefaultSettingsContextProps, SettingsContextProps} from "@src/context/SettingsContext";
import {MdSchedule} from "react-icons/md";
import {RxActivityLog} from "react-icons/rx";
import ScheduleTab from "@src/components/ScheduleTab";
import {io, Socket} from "socket.io-client";
import {BiLoader} from "react-icons/bi";
import JobTab from "@src/components/JobTab";
import SettingsTab from "@src/components/SettingsTab";
import {FaMagic, FaTasks} from "react-icons/fa";
import LogTab from "@src/components/LogTab";

const DEFAULT_TAB = "schedules"
type TabType = 'schedules' | 'jobs' | 'logs' | 'settings'

declare const BUILD_MODE: string

function serverUrl(): string {
  switch (BUILD_MODE) {
    case 'development': return 'http://localhost:5000'
    case 'production': return window.location.href
    default: alert('Should not have happened'); throw new Error()
  }
}

const Application: React.FC = () => {
  const [tab, setTab] = useState(DEFAULT_TAB as TabType)

  const [socket, setSocket] = useState(null as Socket | null)
  const [connected, setConnected] = useState(false)

  const [settings, setSettigns] = useState(DefaultSettingsContextProps)

  useEffect(() => {
    const sock = io(serverUrl())
    setSocket(sock)

    function onConnect() {
      console.log('connected')
      setConnected(true)
      sock.emit('get_settings')
    }

    function onDisconnect(reason: string) {
      console.log('disconnected', reason)
      setConnected(false)
    }

    function onSettings(settings: { schedule: SettingsContextProps }) {
      setSettigns(settings.schedule)
    }

    sock.on('connect', onConnect)
    sock.on('disconnect', onDisconnect)
    sock.on('settings', onSettings)

    return () => {
      sock.off('settings', onSettings)
      sock.off('disconnect', onDisconnect)
      sock.off('connect', onConnect)
      sock.disconnect()
    }
  }, [])

  return (
    <SettingsContext.Provider value={settings}>
      <Navbar bg="light" variant="light" sticky="top" className="mb-4">
        <Container>
          <Navbar.Brand>BME Cloud Scheduler</Navbar.Brand>
          <Nav variant="tabs" className="me-auto" defaultActiveKey={DEFAULT_TAB} onSelect={(tab: TabType) => setTab(tab)}>
            <Nav.Link eventKey={'schedules' as TabType} disabled={!connected}><MdSchedule/>&nbsp;Schedules</Nav.Link>
            <Nav.Link eventKey={'jobs' as TabType} disabled={!connected}><FaTasks/>&nbsp;Jobs</Nav.Link>
            <Nav.Link eventKey={'logs' as TabType} disabled={!connected}><RxActivityLog/>&nbsp;Logs</Nav.Link>
            <Nav.Link eventKey={'settings' as TabType} disabled={!connected}><FaMagic/>&nbsp;Murphy's Corner</Nav.Link>
          </Nav>
        </Container>
      </Navbar>
      {!connected && <div className="d-flex flex-column align-items-center justify-content-center"><BiLoader/>Connecting</div>}
      {connected && <>
        {tab === 'schedules' && <ScheduleTab socket={socket!}/>}
        {tab === 'jobs' && <JobTab socket={socket!}/>}
        {tab === 'logs' && <LogTab socket={socket!}/>}
        {tab === 'settings' && <SettingsTab socket={socket!}/>}
      </>}
    </SettingsContext.Provider>
  );
};

export default Application;
