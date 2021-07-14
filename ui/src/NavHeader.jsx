import React from 'react'
import cs from 'classnames'
import { Link, useRouteMatch } from 'react-router-dom'
import styles from './NavHeader.module.css'

export default function NavHeader() {
  const routeMatch = useRouteMatch()
  const isActiveLink = (url) => url == routeMatch.url
  const linkClassName = (url) => {
    return cs(
      styles.navItemLink,
      isActiveLink(url) && styles.navItemLinkActive,
    )
  }
  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <Link to='/scores' className={linkClassName('/scores')}>
            All Problems
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link to='/' className={linkClassName('/')}>
            Puzzle Solver
          </Link>
        </li>
      </ul>
    </nav>
  )
}
