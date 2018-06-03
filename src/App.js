import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props)
    const roomHash = window.location.hash ||
      (window.location.hash = Math.floor(Math.random() * 0xFFFFFF).toString(16)).substring(1)
    this.drone = new window.ScaleDrone('BKHTWxQ1FSFjX2oh');
    this.roomName = `observable-${roomHash}`
    this.localVideoRef = React.createRef()
    this.remoteVideoRef = React.createRef()
  }

  componentDidMount() {
    this.drone.on('open', err => {
      if (err) return console.log(err)
      this.room = this.drone.subscribe(this.roomName)
      this.room.on('open', console.log)
      this.room.on('members', this.startWebRTC.bind(this))
    })    
  }

  sendMessage(message) {
    this.drone.publish({
      room: this.roomName,
      message,
    })
  }

  localDescCreated(desc) {
    this.pc.setLocalDescription(desc, () => {
      this.sendMessage({ sdp: this.pc.localDescription })
    }, console.log)
  }

  startWebRTC(members) {
    const pc = new RTCPeerConnection({
      iceServers: [{
        urls: 'stun:stun.l.goolge.com:19302',
      }]
    })
    this.pc = pc
    pc.onicecandidate = e => (e.candidate && this.sendMessage({
      candidate: e.candidate,
    }))
    if (members.length === 2) pc.onnegotiationneeded = () => pc.createOffer().then(this.localDescCreated)

    pc.onaddstream = e => {
      this.remoteVideoRef.current.srcObject = e.stream
    }
    window.navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    }).then(stream => {
      this.localVideoRef.current.srcObject = stream
      pc.addStream(stream)
    }).catch(console.log)
    
    console.log(this)
    this.drone.on('data', (message, client) => {
      if (this.drone.clientId === client.id) return
      if (message.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
          pc.remoteDescription.type === 'offer' && pc.createAnswer().then(this.localDescCreated)
        })
      } else if (message.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(message.candidate), console.log, console.log)
      }
    })
  }

  render() {
    return (
      <div className="App">
        <video id="localVideo" ref={this.localVideoRef} autoPlay muted></video>
        <video id="remoteVideo" ref={this.remoteVideoRef} autoPlay></video>
      </div>
    );
  }
}

export default App;
