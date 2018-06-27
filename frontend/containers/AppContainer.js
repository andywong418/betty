import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import Home from './Home'
import Matches from './Matches'
import Bets from './Bets'
import { Route } from 'react-router-dom'
import {ConnectedRouter} from 'react-router-redux'
import {withRouter} from 'react-router'
const HomeWrapper = ({name}) => {
  return (
    <Home name={name} />
  )
}
const App = ({ name }) => {
  return (
    <div>
      <Route exact path='/' component={HomeWrapper} />
      <Route path='/bets' component={Bets} />
      <Route path='/matches' component={Matches} />
    </div>
  )
}
const NonBlockApp = withRouter(App)
const AppContainer = ({history, store, name}) => {
  return (
    <div>
      <ConnectedRouter history={history}>
        <NonBlockApp />
      </ConnectedRouter>
    </div>
  )
}
AppContainer.propTypes = {
  name: PropTypes.string
}

const mapStateToProps = (state) => {
  return {
    name: state.name
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AppContainer)
