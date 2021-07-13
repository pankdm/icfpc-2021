import _ from 'lodash'
import qs from 'qs'
import { useHistory } from 'react-router'
import { getSearchQuery } from './utils'

export default function useSearchQuery() {
  const history = useHistory()
  const searchQuery = getSearchQuery()
  const setSearchQuery = (newQuery, replace=false) => {
    const newSearch = !_.isEmpty(newQuery) ? qs.stringify(newQuery) : ''
    const newHref = history.createHref({
      ...history.location,
      search: newSearch,
    })
    replace
      ? history.replace(newHref)
      : history.push(newHref)
  }
  const replaceSearchQuery = (newQuery) => setSearchQuery(newQuery, true)
  const updateSearchQuery = (updateObj, replace=false) => {
    const newQuery = {...searchQuery, ...updateObj}
    setSearchQuery(newQuery, replace)
  }
  return { searchQuery, setSearchQuery, replaceSearchQuery, updateSearchQuery }
}
