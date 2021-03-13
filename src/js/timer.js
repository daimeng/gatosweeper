import { Component } from 'inferno'

export class Timer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      time: 0,
      lastTimed: null
    }
  }

  componentDidUnmount() {
    this.stop()
  }

  start() {
    if (this.timer == null) {
      this.setState({ ...this.state, lastTimed: performance.now() })
      this.timer = setInterval(() => {
        const now = performance.now()
        this.setState({
          time: this.state.time + now - this.state.lastTimed,
          lastTimed: now
        })
      }, 500)
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }

  render() {
    return (
      <div id="timer">{`${Math.min(999, Math.floor(this.state.time / 1000))}`.padStart(3, '0')}</div>
    )
  }
}
