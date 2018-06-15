// Action Creators

import * as types from './types'
import * as axios from 'axios'

export const getMatches = () => async (dispatch) => {
  const resp = await axios.get('/api/matches')
  dispatch({
    type: types.FETCH_MATCHES,
    payload: resp.data.matches
  })
}
