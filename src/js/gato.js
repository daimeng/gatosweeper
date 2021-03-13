import { Component } from 'inferno'

export class Gato extends Component {
  constructor(props) {
    super(props)
    this.state = { frame: 0 }
  }

  componentDidMount() {
    this.go(this.props.mood)
  }

  componentDidUnmount() {
    this.stop()
  }

  componentWillReceiveProps(nextProps) {
    this.go(nextProps.mood)
  }

  shock() {
    if (this.props.mood === 'idle')
      this.setState({ frame: 1 })
  }

  unshock() {
    if (this.props.mood === 'idle')
      this.setState({ frame: 0 })
  }

  go(mood) {
    switch (mood) {
      case 'idle':
        this.stop()
        break
      case 'happy':
        this.start()
        break
      case 'sad':
        this.start()
        break
    }
  }

  start() {
    if (this.timer == null) {
      this.timer = setInterval(() => {
        this.setState({
          frame: this.state.frame ^ 1
        })
      }, 600)
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  render() {
    return (
      <div id="gato" className={`gato-${this.props.mood}-${this.state.frame}`} />
    )
  }
}
