import React from 'react'
import cs from 'classnames'
import { Link, useRouteMatch } from 'react-router-dom'
import styles from './NavHeader.module.css'

export default function NavHeader() {
  const routeMatch = useRouteMatch()
  const isActiveLink = (url) => url == routeMatch.url
  const linkClassName = (url) => {
    console.log(url, isActiveLink(url))
    return cs(
      styles.navItemLink,
      isActiveLink(url) && styles.navItemLinkActive,
    )
  }
  return (
    <nav className={styles.nav}>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <Link to='/' className={linkClassName('/')}>
            Problems
          </Link>
        </li>
        <li className={styles.navItem}>
          <Link to='/scores' className={linkClassName('/scores')}>
            Scores
          </Link>
        </li>
      </ul>
    </nav>
  )
}
