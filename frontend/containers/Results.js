import Proptypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { getMatches, getAddress, getBets } from '../actions/index'

class Result extends React.Component {
  
  componenDidMount () {
    this.props.getResults()
  }

  render () {
    return (
      <div className='text-center main-body'>
        <Header name={this.props.name} />
        <ResultList matchesNotPlayed={this.props.matchesNotPlayed} matchesPlayed={this.props.matchesPlayed} sharedAddress={this.props.address} />
        <Footer />
      </div>
    )
  }
}