import Proptypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import MatchList from '../components/MatchList'
import Footer from '../components/Footer'
import { getMatches } from '../actions/index'

class Home extends React.Component {
  constructor (props) {
    super(props)
    this.state = {

    }
  }

  componentDidMount () {
    this.props.getMatches()
  }
  render () {
    return (
      <div className='text-center'>
        <div className='header'>
          <div className='content-wrapper'>
            <span className='title'> {this.props.name} </span>
            <div className='image-container'>
              <img width ={200} src= '/images/world-cup.svg' />
            </div>
            <span className='world-cup-title'> 2018 </span>
          </div>
          <p>The first decentralized betting platform for the Russian World Cup built on Codius </p>
        </div>
        <MatchList matchesNotPlayed={this.props.matchesNotPlayed} matchesPlayed={this.props.matchesPlayed} />
        <Footer />
      </div>
    )
  }
}
const mapStateToProps = (state) => {
  return {
    name: state.rootReducer.name,
    matchesNotPlayed: state.matchReducer.matchesNotPlayed,
    matchesPlayed: state.matchReducer.matchesPlayed
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    getMatches: () => dispatch(getMatches())
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Home)
