import React from 'react'
import {
  Switch,
  Route,
  Link,
} from "react-router-dom"
import styles from './App.module.css'
import Problems from './pages/Problems.jsx'
import Scores from './pages/Scores.jsx'
import About from './pages/About.jsx'
import { useRouteMatch } from "react-router-dom"


function App() {
  const routeMatch = useRouteMatch()
  console.log(routeMatch)
  return (
    <Switch>
      <Route path="/scores">
        <Scores />
      </Route>
      <Route path="/about">
        <About />
      </Route>
      <Route path="/">
        <Problems />
      </Route>
    </Switch>
  )
}

export default App
