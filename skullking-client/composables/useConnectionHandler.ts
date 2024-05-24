import { ref, onUnmounted } from "vue";
import { useProfile } from "./useProfile";

const signalServer =
  // "wss://urmdrodnf9.execute-api.us-east-1.amazonaws.com/dev/";
  "wss://wrtc.api.jaeb.ae/";

const appId = "skk";

type sendChannel = {
  send: (target: string, data: any) => void;
};

type CallbackType<T = any> = (data: T) => void;

const { open: openSnackbar } = useSnackbar();

const withSocket = (socket: WebSocket): sendChannel => {
  return {
    send: (target: string, data: any) => {
      console.log("Sending data with socket:", data);
      socket.send(JSON.stringify({ ...data, targetId: target }));
    },
  };
};

const withRtcRelay = (): sendChannel => {
  return {
    send: (target: string, data: any) => {
      send(roomId.value!, {
        data: { ...data, ns: "connection", sourceId: myId.value },
        targetId: target,
        action: "relay",
        ns: "connection",
      });
    },
  };
};

type ExtendedPeerConnection = RTCPeerConnection & {
  dataChannel: any;
  id: string;
};

const isHost = ref(true);
const isInitialized = ref(false);
const isReady = ref(false);
const roomId = ref<string | undefined>();
const myId = ref<string | undefined>();
const socket = ref<WebSocket | undefined>();
const peerConnections = ref<Record<string, ExtendedPeerConnection>>({});
const iceCandidateQueues = ref<Record<string, any[]>>({});

const onDataCallback = ref<CallbackType[]>([]);
const onConnectedCallback = ref<CallbackType<ExtendedPeerConnection>[]>([]);
const onDisconnectedCallback = ref<CallbackType<ExtendedPeerConnection>[]>([]);
const onCloseRoomCallback = ref<CallbackType<void>[]>([]);

const closeRoom = () => {
  onCloseRoomCallback.value.forEach((x) => x());
};

const onWebRTCReceived = async (data: any) => {
  console.log("Received data:", data);
  onDataCallback.value.forEach((c) => {
    c(data);
  });

  if (data.ns === "connection" && data.action) {
    switch (data.action) {
      case "relay":
        send(data.targetId, data.data);
        break;
      case "newPeer":
        await handleNewJoiner(data.sourceId, withRtcRelay());
        break;
      case "offer":
        await handleOffer(data.sourceId, data.sdp, withRtcRelay());
        break;
      case "candidate":
        handleCandidate(data.sourceId, data.candidate);
        break;
      case "answer":
        await handleAnswer(data.sourceId, data.sdp);
        break;
    }
  }
};

const useDataListener = (action: string, callback: CallbackType) => {
  const handler = (data: any) => {
    if (data.action === action) {
      callback(data);
    }
  };
  onMounted(() => {
    onData(handler);
  });
  onUnmounted(() => {
    offData(handler);
  });
};

const onData = (callback: CallbackType) => {
  onDataCallback.value.push(callback);
};

const offData = (callback: CallbackType) => {
  onDataCallback.value = onDataCallback.value.filter((x) => x !== callback);
};

const onConnected = (callback: CallbackType<ExtendedPeerConnection>) => {
  onConnectedCallback.value.push(callback);
};

const onDisconnected = (callback: CallbackType<ExtendedPeerConnection>) => {
  onDisconnectedCallback.value.push(callback);
};

const send = (remoteConnectionId: string, data: any) => {
  console.log("attempt to send to ", remoteConnectionId, data);
  const dataChannel = peerConnections.value[remoteConnectionId]?.dataChannel;
  if (dataChannel && dataChannel.readyState === "open") {
    dataChannel.send(JSON.stringify({ sourceId: myId.value, ...data }));
    console.log("Sent data:", data);
  } else {
    console.log(
      "Data channel is not open, add to queue",
      dataChannel,
      peerConnections.value,
      peerConnections.value[remoteConnectionId]
    );
    // dataChannel.onopen = () => {
    //   console.log("Data channel opened, sending queued data to peer:");
    //   send(remoteConnectionId, data);
    // };
  }
};

const broadcast = (data: any) => {
  Object.keys(peerConnections.value).forEach((id) => {
    send(id, data);
  });
  //loopback for self
  onWebRTCReceived({ ...data, sourceId: myId.value });
};

const createRoom = async (timeout = 30000): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isInitialized.value) {
      return reject(new Error("Already initialized"));
    }
    isHost.value = true;
    isInitialized.value = true;
    const localSocket = new WebSocket(signalServer);

    const timeoutId = setTimeout(() => {
      console.log("Room creation timed out");
      cleanUp();
      reject(new Error("Room creation timed out"));
    }, timeout);

    const cleanUp = () => {
      clearTimeout(timeoutId);
      localSocket.close();
      // onUnmountedCleanup();
    };

    const onUnmountedCleanup = onUnmounted(() => {
      localSocket.close();
      clearTimeout(timeoutId);
    });

    onCloseRoomCallback.value.push(() => {
      console.log("close room!!!");
      if (!isHost.value || !isInitialized.value) {
        return;
      }
      if (localSocket) {
        localSocket.send(
          JSON.stringify({
            action: "roomClosed",
          })
        );
        cleanUp();
      }
    });

    localSocket.onopen = () => {
      console.log("WebSocket connection opened as host");
      localSocket.send(JSON.stringify({ action: "createRoom" }));
    };

    localSocket.onmessage = async (event: any) => {
      const message = JSON.parse(event.data);
      console.log("Received WebSocket message:", message);
      switch (message.action) {
        case "roomCreated":
          roomId.value = message.roomId;
          myId.value = message.roomId;
          clearTimeout(timeoutId);
          resolve();
          break;
        case "newJoiner":
          if (message.app !== appId) {
            console.log("Request received with mismatching app");
            localSocket.send(
              JSON.stringify({ action: "reject", targetId: message.sourceId })
            );
            break;
          }
          await handleNewJoiner(message.sourceId, withSocket(localSocket));
          break;
        case "answer":
          await handleAnswer(message.sourceId, message.sdp);
          break;
        case "candidate":
          handleCandidate(message.sourceId, message.candidate);
          break;
        case "roomClosed":
          cleanUp();
          break;
        default:
          console.log(`Unknown message action: ${message.action}`);
      }
    };

    localSocket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    localSocket.onerror = (error: any) => {
      console.error("WebSocket error:", error);
      cleanUp();
      reject(error);
    };
  });
};

const joinRoom = async (_roomId: string, timeout = 30000): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isInitialized.value) {
      return reject(new Error("Already initialized"));
    }
    if (!_roomId) {
      return reject(new Error("Room ID required"));
    }
    isHost.value = false;
    const localSocket = new WebSocket(signalServer);

    roomId.value = _roomId;

    const timeoutId = setTimeout(() => {
      console.log("Connection attempt timed out");
      cleanUp();
      reject(new Error("Connection attempt timed out"));
    }, timeout);

    onUnmounted(() => {
      localSocket?.close();
      clearTimeout(timeoutId);
    });

    const cleanUp = () => {
      clearTimeout(timeoutId);
      localSocket.close();
      // onUnmountedCleanup();
    };

    localSocket.onopen = () => {
      console.log("WebSocket connection opened as joiner");
      localSocket.send(
        JSON.stringify({ action: "joinRoom", roomId: _roomId, app: appId })
      );
    };

    localSocket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log("Received WebSocket message:", message);
      if (message.err) {
        cleanUp();
        reject(new Error(message.err));
      }
      switch (message.action) {
        case "reject":
          console.log("Request rejected");
          cleanUp();
          return reject(new Error("Request rejected"));
        case "offer":
          myId.value = message.targetId;
          try {
            await handleOffer(
              message.sourceId,
              message.sdp,
              withSocket(localSocket)
            );
          } catch (error) {
            cleanUp();
            return reject(error);
          }
          break;
        case "candidate":
          handleCandidate(message.roomId, message.candidate);
          break;
        case "roomNotFound":
          console.log("Room not found");
          cleanUp();
          return reject(new Error("Room not found"));
        default:
          console.log(`Unknown message action: ${message.action}`);
      }
    };

    localSocket.onerror = (error: any) => {
      console.error("WebSocket error:", error);
      cleanUp();
      return reject(error);
    };

    onConnected((peerConnection) => {
      cleanUp();
      isInitialized.value = true;
      resolve();
    });

    onDisconnected((peerConnection) => {
      cleanUp();
      reject(new Error("Disconnected before connection established"));
    });
  });
};

const connectionOptions: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
    {
      urls: "stun:stun2.l.google.com:19302",
    },
    {
      urls: "stun:stun3.l.google.com:19302",
    },
    {
      urls: "stun:stun4.l.google.com:19302",
    },
  ],
};

const handleNewJoiner = async (sourceId: string, channel: sendChannel) => {
  const peerConnection = new RTCPeerConnection(connectionOptions);
  peerConnections.value[sourceId] = peerConnection as ExtendedPeerConnection;
  await startWebRTC(peerConnection, sourceId, channel, true);

  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    iceRestart: true,
  });
  offer.sdp = fixSdp(offer.sdp);
  await peerConnection.setLocalDescription(offer);
  console.log("setlocaldescription offer", peerConnection);

  channel.send(sourceId, {
    action: "offer",
    sourceId: myId.value,
    sdp: offer,
  });
};

const handleOffer = async (
  remoteId: string,
  sdp: any,
  channel: sendChannel
) => {
  console.log("handleOffer", remoteId, sdp);

  const peerConnection = new RTCPeerConnection(connectionOptions);
  peerConnections.value[remoteId] = peerConnection as ExtendedPeerConnection;
  await startWebRTC(peerConnection, remoteId, channel, false);

  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  processIceCandidates(remoteId);
  const answer = await peerConnection.createAnswer();
  answer.sdp = fixSdp(answer.sdp);
  await peerConnection.setLocalDescription(answer);
  console.log("setlocaldescription answer", peerConnection);

  channel.send(remoteId, {
    action: "answer",
    sourceId: myId.value,
    sdp: answer,
  });
};

const handleAnswer = async (remoteId: string, sdp: any) => {
  console.log("handleAnswer", remoteId, sdp);
  await peerConnections.value[remoteId].setRemoteDescription(
    new RTCSessionDescription(sdp)
  );
  processIceCandidates(remoteId);
};

const handleCandidate = async (connectionId: string, candidate: any) => {
  if (peerConnections.value[connectionId]) {
    if (peerConnections.value[connectionId].remoteDescription) {
      await peerConnections.value[connectionId].addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    } else {
      if (!iceCandidateQueues.value[connectionId]) {
        iceCandidateQueues.value[connectionId] = [];
      }
      iceCandidateQueues.value[connectionId].push(candidate);
    }
  } else {
    if (!iceCandidateQueues.value[connectionId]) {
      iceCandidateQueues.value[connectionId] = [];
    }
    iceCandidateQueues.value[connectionId].push(candidate);
  }
};

const processIceCandidates = (connectionId: string) => {
  console.log("Processing ICE candidates for connection:", connectionId);
  if (iceCandidateQueues.value[connectionId]) {
    const peerConnection = peerConnections.value[connectionId];
    while (iceCandidateQueues.value[connectionId].length > 0) {
      const candidate = iceCandidateQueues.value[connectionId].shift();
      console.log("Adding ICE candidate:", candidate);
      peerConnection
        .addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => {
          console.log("Successfully added ICE candidate:", candidate);
        })
        .catch((error) => {
          console.error("Error adding received ICE candidate", error);
        });
    }
  }
};

const pageLeaveWarning = (e: any) => {
  // e.preventDefault();
  // e.returnValue = "";
  // // For some browsers, returnValue needs to be set explicitly.
  // return "";
};

const startWebRTC = async (
  peerConnection: RTCPeerConnection,
  remoteConnectionId: string,
  channel: sendChannel,
  asHost: boolean
) => {
  console.log("startWebRTC ", peerConnection, remoteConnectionId);
  (peerConnection as any).id = remoteConnectionId;

  window.addEventListener("beforeunload", pageLeaveWarning);

  peerConnection.onicecandidate = (event: any) => {
    console.log("onicecandidate", event);
    if (event.candidate) {
      console.log("Sending ICE candidate to peer", channel, remoteConnectionId);
      channel.send(remoteConnectionId, {
        action: "candidate",
        roomId: roomId.value,
        targetId: remoteConnectionId,
        candidate: event.candidate,
      });
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

      if (!isHost.value) {
        closeWebsocket();
      }
    }
  };

  peerConnection.onconnectionstatechange = () => {
    console.log("Connection state change:", peerConnection.connectionState);
    if (peerConnection.connectionState === "connected") {
      console.log(
        "Peer connection is fully connected.",
        (peerConnection as ExtendedPeerConnection).id
      );
      if (!isHost.value) {
        closeWebsocket();
      }
    } else if (peerConnection.connectionState === "failed") {
      console.error("Peer connection failed.");
    }
  };

  if (asHost) {
    const dataChannel = peerConnection.createDataChannel("dataChannel");
    dataChannel.onopen = () => {
      console.log("Data channel is open", remoteConnectionId, peerConnection);
      peerConnections.value[remoteConnectionId].dataChannel = dataChannel;
      onConnectedCallback.value.forEach((c) => {
        c(peerConnection as ExtendedPeerConnection);
      });

      if (isHost.value) notifyExistingPeers(remoteConnectionId);
    };
    dataChannel.onclose = () => {
      console.log("Data channel is closed");
      onDisconnectedCallback.value.forEach((c) => {
        c(peerConnection as ExtendedPeerConnection);
      });
    };
    dataChannel.onmessage = (event: any) =>
      onWebRTCReceived(JSON.parse(event.data));
  } else {
    peerConnection.ondatachannel = (event: any) => {
      const dataChannel = event.channel;
      dataChannel.onopen = () => {
        console.log("Data channel is open", remoteConnectionId, peerConnection);
        peerConnections.value[remoteConnectionId].dataChannel = dataChannel;
        onConnectedCallback.value.forEach((c) => {
          c(peerConnection as ExtendedPeerConnection);
        });
      };
      dataChannel.onclose = () => {
        console.log("Data channel is closed");
        onDisconnectedCallback.value.forEach((c) => {
          c(peerConnection as ExtendedPeerConnection);
        });
      };
      dataChannel.onmessage = (event: any) =>
        onWebRTCReceived(JSON.parse(event.data));
    };
  }

  // Process any queued ICE candidates
  processIceCandidates(remoteConnectionId);
};

const fixSdp = (sdp: any) => {
  // // Check if 'a=sctp-port' is present
  // if (!sdp.includes("a=sctp-port")) {
  //   // Append the default SCTP port if missing
  //   sdp += "a=sctp-port:5000\r\n";
  // }

  // if (!sdp.includes("a=max-message-size")) {
  //   // Append the default SCTP port if missing
  //   sdp += "a=max-message-size:262144\r\n";
  // }

  // sdp = sdp.replace(/a=extmap-allow-mixed\r\n/g, "");
  // sdp = sdp.replace(/a=msid-semantic: WMS\r\n/g, "");
  return sdp;
};

const notifyExistingPeers = (newConnectionId: string) => {
  Object.entries(peerConnections.value).forEach(
    ([connectionId, peerConnection]) => {
      if (connectionId !== newConnectionId) {
        send(connectionId, {
          action: "newPeer",
          ns: "connection",
          sourceId: newConnectionId,
        });
      }
    }
  );
};

onConnected((peer) => {
  const profiles = useProfile();

  console.log("connected so sending ", peer);
  send(peer.id, {
    action: "iam",
    data: profiles.me.value,
  });
  setTimeout(() => {
    openSnackbar(`${profiles.getUserProfile(peer.id)?.name} joined`);
  }, 500);
});

onData((data) => {
  const profiles = useProfile();

  if (data.action === "iam") {
    profiles.updateUserProfile(data.sourceId, data.data);
  }
});

export function useConnectionHandler() {
  return {
    isHost,
    isInitialized,
    isReady,
    roomId,
    peerConnections,
    iceCandidateQueues,
    onData,
    offData,
    send,
    broadcast,
    createRoom,
    joinRoom,
    onConnected,
    onDisconnected,
    myId,
    useDataListener,
    closeRoom,
  };
}
