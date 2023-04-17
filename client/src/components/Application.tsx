import React, { useEffect, useState } from 'react';
import "bootstrap/scss/bootstrap.scss";
import "air-datepicker/air-datepicker.css";
import './Application.scss';
import {Container, Nav, Navbar, Row} from "react-bootstrap";
import SettingsContext from "@src/context/SettingsContext";
import {MdSchedule} from "react-icons/md";
import {RxActivityLog} from "react-icons/rx";
import {CiSettings} from "react-icons/ci";
import ScheduleTab from "@src/components/ScheduleTab";
import {io, Socket} from "socket.io-client";
import {BiLoader} from "react-icons/bi";
import LogTab from "@src/components/LogTab";

const DEFAULT_TAB = "schedules"
type TabType = 'schedules' | 'logs' | 'settings'

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

  useEffect(() => {
    const sock = io(serverUrl())
    setSocket(sock)

    function onConnect() {
      console.log('connected')
      setConnected(true)
    }

    function onDisconnect(reason: string) {
      console.log('disconnected', reason)
      setConnected(false)
      // sock.connect()
    }

    sock.on('connect', onConnect)
    sock.on('disconnect', onDisconnect)

    return () => {
      sock.off('disconnect', onDisconnect)
      sock.off('connect', onConnect)
      sock.disconnect()
    }
  }, [])

  return (
    <SettingsContext.Provider value={{ nightStartHour: 20, nightStartMinute: 0, nightEndHour: 7, nightEndMinute: 0 }}>
      <Navbar bg="light" variant="light" sticky="top" className="mb-4">
        <Container>
          <Navbar.Brand>BME Cloud Scheduler</Navbar.Brand>
          <Nav variant="tabs" className="me-auto" defaultActiveKey={DEFAULT_TAB} onSelect={(tab: TabType) => setTab(tab)}>
            <Nav.Link eventKey={'schedules' as TabType} disabled={!connected}><MdSchedule/>&nbsp;Schedules</Nav.Link>
            <Nav.Link eventKey={'logs' as TabType} disabled={!connected}><RxActivityLog/>&nbsp;Logs</Nav.Link>
            <Nav.Link eventKey={'settings' as TabType} disabled={!connected}><CiSettings/>&nbsp;Settings</Nav.Link>
          </Nav>
        </Container>
      </Navbar>
      {!connected && <div><BiLoader/>Connecting</div>}
      {connected && <>
        {tab === 'schedules' && <ScheduleTab socket={socket!}/>}
        {tab === 'logs' && <LogTab socket={socket!}/>}
      </>}
    </SettingsContext.Provider>
  );
};

export default Application;
