export class ConnectionHandler {
  isHost: boolean = true;
  signalServer: string;
  constructor(signalServer: string) {
    this.signalServer = signalServer;
  }

  isInitialized: boolean = false;

  isReady = false;
  roomId: string | undefined;
  socket: WebSocket = undefined as unknown as WebSocket;
  peerConnections: {
    [key: string]: RTCPeerConnection & { dataChannel?: any };
  } = {};
  iceCandidateQueues: any = {};

  onDataCallback: ((d: any) => void)[] = [];

  closeWebsocket() {
    console.log("Closing Websocket");
    this.socket?.close();
  }

  onWebRTCReceived(data: any) {
    console.log("Received data:", data);
    this.onDataCallback.forEach((callback) => callback(data));
  }

  onData(callback: (d: any) => void) {
    this.onDataCallback.push(callback);
  }

  offData(callback: (d: any) => void) {
    this.onDataCallback = this.onDataCallback.filter((x) => x !== callback);
  }

  // Function to send WebRTC data
  send(remoteConnectionId: string, data: any) {
    const dataChannel = this.peerConnections[remoteConnectionId]?.dataChannel;
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(JSON.stringify(data));
      console.log("Sent data:", data);
    } else {
      console.log("Data channel is not open");
    }
  }

  createRoom() {
    if (this.isInitialized) {
      throw new Error("Already initialized");
    }
    this.isHost = true;
    this.isInitialized = true;
    this.socket = new WebSocket(this.signalServer);

    this.socket.onopen = () => {
      console.log("WebSocket connection opened for host");
      this.socket.send(JSON.stringify({ action: "createRoom" }));
    };

    this.socket.onmessage = async (event: any) => {
      const message = JSON.parse(event.data);
      console.log("Received WebSocket message:", message);
      switch (message.action) {
        case "roomCreated":
          this.roomId = message.roomId;
          break;
        case "newJoiner":
          const peerConnection = new RTCPeerConnection();
          this.peerConnections[message.sourceId] = peerConnection;
          await this.startWebRTC(peerConnection, message.sourceId);

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          this.socket.send(
            JSON.stringify({
              action: "offer",
              roomId: this.roomId,
              targetId: message.sourceId,
              sdp: offer,
            })
          );
          break;
        case "answer":
          await this.peerConnections[message.sourceId].setRemoteDescription(
            new RTCSessionDescription(message.sdp)
          );
          break;
        case "candidate":
          if (this.peerConnections[message.sourceId]) {
            await this.peerConnections[message.sourceId].addIceCandidate(
              new RTCIceCandidate(message.candidate)
            );
          } else {
            if (!this.iceCandidateQueues[message.sourceId]) {
              this.iceCandidateQueues[message.sourceId] = [];
            }
            this.iceCandidateQueues[message.sourceId].push(message.candidate);
          }
          break;
        case "roomClosed":
          this.closeWebsocket();
          break;
        default:
          console.log(`Unknown message action: ${message.action}`);
      }
    };

    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    this.socket.onerror = (error: any) => {
      console.error("WebSocket error:", error);
    };

    return {
      roomId: this.roomId,
      closeRoom: () => {
        this.socket.send(
          JSON.stringify({
            action: "roomClosed",
          })
        );
        this.closeWebsocket();
      },
    };
  }

  async joinRoom(roomId: string) {
    if (this.isInitialized) {
      throw new Error("Already initialized");
    }
    this.isHost = false;
    this.isInitialized = true;
    return new Promise((res, rej) => {
      this.socket = new WebSocket(this.signalServer);

      this.socket.onopen = () => {
        console.log("WebSocket connection opened for joiner");
        this.socket.send(
          JSON.stringify({ action: "joinRoom", roomId: roomId })
        );
      };

      this.socket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log("Received WebSocket message:", message);
        switch (message.action) {
          case "offer":
            const peerConnection = new RTCPeerConnection();
            this.peerConnections[message.roomId] = peerConnection;
            await this.startWebRTC(peerConnection, message.roomId);

            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(message.sdp)
            );
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            this.socket.send(
              JSON.stringify({
                action: "answer",
                targetId: message.roomId,
                sdp: answer,
              })
            );

            // Keep the WebSocket connection open until all signaling is complete
            break;
          case "candidate":
            if (this.peerConnections[message.roomId]) {
              await this.peerConnections[message.roomId].addIceCandidate(
                new RTCIceCandidate(message.candidate)
              );
            } else {
              if (!this.iceCandidateQueues[message.roomId]) {
                this.iceCandidateQueues[message.roomId] = [];
              }
              this.iceCandidateQueues[message.roomId].push(message.candidate);
            }
            break;
          case "roomNotFound":
            console.log("Room not found");
            this.closeWebsocket();
            rej("room not found");
            break;
          default:
            console.log(`Unknown message action: ${message.action}`);
        }
      };
    });
  }

  async startWebRTC(peerConnection: any, remoteConnectionId: string) {
    return new Promise<void>(async (res, rej) => {
      peerConnection.onicecandidate = (event: any) => {
        if (event.candidate) {
          this.socket.send(
            JSON.stringify({
              action: "candidate",
              roomId: this.roomId,
              targetId: remoteConnectionId,
              candidate: event.candidate,
            })
          );
        }
      };

      peerConnection.oniceconnectionstatechange = () => {
        console.log(
          "ICE connection state change:",
          peerConnection.iceConnectionState
        );

        if (
          peerConnection.iceConnectionState === "connected" &&
          peerConnection.connectionState === "connected"
        ) {
          console.log(
            "ICE connection state is connected, closing WebSocket connection"
          );

          if (!this.isHost) {
            this.closeWebsocket();
          }
          res();
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          if (!this.isHost) {
            this.closeWebsocket();
          }
          res();
        }
      };

      if (this.isHost) {
        const dataChannel = peerConnection.createDataChannel("dataChannel");
        dataChannel.onopen = () => {
          console.log("Data channel is open");
          this.peerConnections[remoteConnectionId].dataChannel = dataChannel;
        };
        dataChannel.onclose = () => {
          console.log("Data channel is closed");
        };
        dataChannel.onmessage = (event: any) =>
          this.onWebRTCReceived(JSON.parse(event.data));
      } else {
        peerConnection.ondatachannel = (event: any) => {
          const dataChannel = event.channel;
          dataChannel.onopen = () => {
            console.log("Data channel is open");
            this.peerConnections[remoteConnectionId].dataChannel = dataChannel;
          };
          dataChannel.onclose = () => {
            console.log("Data channel is closed");
          };
          dataChannel.onmessage = (event: any) =>
            this.onWebRTCReceived(JSON.parse(event.data));
        };
      }

      // Process any queued ICE candidates
      if (this.iceCandidateQueues[remoteConnectionId]) {
        while (this.iceCandidateQueues[remoteConnectionId].length > 0) {
          const candidate = this.iceCandidateQueues[remoteConnectionId].shift();
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    });
  }
}
