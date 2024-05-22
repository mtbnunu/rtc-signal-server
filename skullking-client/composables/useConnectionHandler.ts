import { ref, onUnmounted } from "vue";

const signalServer =
  // "wss://urmdrodnf9.execute-api.us-east-1.amazonaws.com/dev/";
  "wss://wrtc.api.jaeb.ae/";

const appId = "skk" + new Date();

type sendChannel = {
  send: (target: string, data: any) => void;
};

type CallbackType<T = unknown> = {
  callback: (data: T) => void;
  once: boolean;
  ran?: boolean;
};

const withSocket = (socket: WebSocket): sendChannel => {
  return {
    send: (target: string, data: any) => {
      socket.send(JSON.stringify({ ...data, targetId: target }));
    },
  };
};

const withRtcRelay = (): sendChannel => {
  return {
    send: (target: string, data: any) => {
      send(roomId.value!, {
        data: { ...data, ns: "connection" },
        targetId: target,
        action: "relay",
        ns: "connection",
      });
    },
  };
};

const isHost = ref(true);
const isInitialized = ref(false);
const isReady = ref(false);
const roomId = ref<string | undefined>();
const myId = ref<string | undefined>();
const socket = ref<WebSocket | undefined>();
const peerConnections = ref<
  Record<string, RTCPeerConnection & { dataChannel?: any }>
>({});
const iceCandidateQueues = ref<Record<string, any[]>>({});

const onDataCallback = ref<CallbackType[]>([]);
const onConnectedCallback = ref<CallbackType<RTCPeerConnection>[]>([]);
const onDisconnectedCallback = ref<CallbackType<RTCPeerConnection>[]>([]);

const closeWebsocket = () => {
  console.log("Closing Websocket");
  if (socket.value) {
    socket.value.close();
    socket.value = undefined;
  }
};

const onWebRTCReceived = async (data: any) => {
  console.log("Received data:", data);
  onDataCallback.value.forEach((c) => {
    if (c.once && c.ran) return;
    c.callback(data);
    c.ran = true;
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
        await peerConnections.value[data.sourceId].setRemoteDescription(
          new RTCSessionDescription(data.sdp)
        );
        processIceCandidates(data.sourceId);
        break;
    }
  }
};

const onData = (
  callback: CallbackType["callback"],
  options: Omit<CallbackType, "callback">
) => {
  onDataCallback.value.push({ callback, ...options });
};

const offData = (callback: CallbackType["callback"]) => {
  onDataCallback.value = onDataCallback.value.filter(
    (x) => x.callback !== callback
  );
};

const onConnected = (
  callback: CallbackType<RTCPeerConnection>["callback"],
  options: Omit<CallbackType<RTCPeerConnection>, "callback">
) => {
  onConnectedCallback.value.push({ callback, ...options });
};

const onDisconnected = (
  callback: CallbackType<RTCPeerConnection>["callback"],
  options: Omit<CallbackType<RTCPeerConnection>, "callback">
) => {
  onDisconnectedCallback.value.push({ callback, ...options });
};

const send = (remoteConnectionId: string, data: any) => {
  const dataChannel = peerConnections.value[remoteConnectionId]?.dataChannel;
  if (dataChannel && dataChannel.readyState === "open") {
    dataChannel.send(JSON.stringify(data));
    console.log("Sent data:", data);
  } else {
    console.log("Data channel is not open");
  }
};

const broadcast = (data: any) => {
  const message = {
    data,
    sourceId: myId.value,
  };
  Object.keys(peerConnections.value).forEach((id) => {
    send(id, message);
  });
  //loopback for self
  onWebRTCReceived(message);
};

const createRoom = () => {
  if (isInitialized.value) {
    throw new Error("Already initialized");
  }
  isHost.value = true;
  isInitialized.value = true;
  socket.value = new WebSocket(signalServer);

  socket.value.onopen = () => {
    console.log("WebSocket connection opened for host");
    socket.value?.send(JSON.stringify({ action: "createRoom" }));
  };

  socket.value.onmessage = async (event: any) => {
    const message = JSON.parse(event.data);
    console.log("Received WebSocket message:", message);
    switch (message.action) {
      case "roomCreated":
        roomId.value = message.roomId;
        myId.value = message.roomId;
        break;
      case "newJoiner":
        if (message.app !== appId) {
          console.log("request receivd with mismatching app");
          socket.value?.send(
            JSON.stringify({ action: "reject", targetId: message.sourceId })
          );
          break;
        }
        await handleNewJoiner(message.sourceId, withSocket(socket.value!));
        break;
      case "answer":
        await peerConnections.value[message.sourceId].setRemoteDescription(
          new RTCSessionDescription(message.sdp)
        );
        processIceCandidates(message.sourceId);
        break;
      case "candidate":
        handleCandidate(message.sourceId, message.candidate);
        break;
      case "roomClosed":
        closeWebsocket();
        break;
      default:
        console.log(`Unknown message action: ${message.action}`);
    }
  };

  socket.value.onclose = () => {
    console.log("WebSocket connection closed");
  };

  socket.value.onerror = (error: any) => {
    console.error("WebSocket error:", error);
  };
};

const closeRoom = () => {
  if (!isHost.value || !isInitialized.value) {
    return;
  }
  if (socket.value) {
    socket.value.send(
      JSON.stringify({
        action: "roomClosed",
      })
    );
    closeWebsocket();
  }
  broadcast({
    action: "start",
  });
};

const joinRoom = async (_roomId: string) => {
  if (isInitialized.value) {
    throw new Error("Already initialized");
  }
  if (!_roomId) {
    throw new Error("room id required");
  }
  isHost.value = false;
  isInitialized.value = true;
  socket.value = new WebSocket(signalServer);

  roomId.value = _roomId;

  socket.value.onopen = () => {
    console.log("WebSocket connection opened for joiner");
    socket.value?.send(
      JSON.stringify({ action: "joinRoom", roomId: _roomId, app: appId })
    );
  };

  socket.value.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    console.log("Received WebSocket message:", message);
    switch (message.action) {
      case "reject":
        console.log("request rejected");
      // need to notify caller somehow
      case "offer":
        myId.value = message.targetId;
        await handleOffer(
          message.sourceId,
          message.sdp,
          withSocket(socket.value!)
        );
        break;
      case "candidate":
        handleCandidate(message.roomId, message.candidate);
        break;
      case "roomNotFound":
        console.log("Room not found");
        closeWebsocket();
        break;
      default:
        console.log(`Unknown message action: ${message.action}`);
    }
  };
};

const handleNewJoiner = async (sourceId: string, channel: sendChannel) => {
  const peerConnection = new RTCPeerConnection();
  peerConnections.value[sourceId] = peerConnection;
  await startWebRTC(peerConnection, sourceId);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  channel.send(sourceId, {
    action: "offer",
    sourceId: myId.value,
    sdp: offer,
  });
};

const handleOffer = async (
  roomId: string,
  sdp: any,
  sendChannel: sendChannel
) => {
  const peerConnection = new RTCPeerConnection();
  peerConnections.value[roomId] = peerConnection;
  await startWebRTC(peerConnection, roomId);

  await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
  processIceCandidates(roomId);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  sendChannel.send(roomId, {
    action: "answer",
    sourceId: myId.value,
    sdp: answer,
  });
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
  if (iceCandidateQueues.value[connectionId]) {
    const peerConnection = peerConnections.value[connectionId];
    while (iceCandidateQueues.value[connectionId].length > 0) {
      const candidate = iceCandidateQueues.value[connectionId].shift();
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }
};

const startWebRTC = async (peerConnection: any, remoteConnectionId: string) => {
  peerConnection.onicecandidate = (event: any) => {
    if (event.candidate) {
      socket.value?.send(
        JSON.stringify({
          action: "candidate",
          roomId: roomId.value,
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

      if (!isHost.value) {
        closeWebsocket();
      }
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === "connected") {
      if (!isHost.value) {
        closeWebsocket();
      }
    }
  };

  if (isHost.value) {
    const dataChannel = peerConnection.createDataChannel("dataChannel");
    dataChannel.onopen = () => {
      console.log("Data channel is open");
      peerConnections.value[remoteConnectionId].dataChannel = dataChannel;
      onConnectedCallback.value.forEach((c) => {
        if (c.once && c.ran) return;
        c.callback(peerConnection);
        c.ran = true;
      });

      notifyExistingPeers(remoteConnectionId);
    };
    dataChannel.onclose = () => {
      console.log("Data channel is closed");
      onDisconnectedCallback.value.forEach((c) => {
        if (c.once && c.ran) return;
        c.callback(peerConnection);
        c.ran = true;
      });
    };
    dataChannel.onmessage = (event: any) =>
      onWebRTCReceived(JSON.parse(event.data));
  } else {
    peerConnection.ondatachannel = (event: any) => {
      const dataChannel = event.channel;
      dataChannel.onopen = () => {
        console.log("Data channel is open");
        onConnectedCallback.value.forEach((c) => {
          if (c.once && c.ran) return;
          c.callback(peerConnection);
          c.ran = true;
        });
        peerConnections.value[remoteConnectionId].dataChannel = dataChannel;
      };
      dataChannel.onclose = () => {
        console.log("Data channel is closed");
        onDisconnectedCallback.value.forEach((c) => {
          if (c.once && c.ran) return;
          c.callback(peerConnection);
          c.ran = true;
        });
      };
      dataChannel.onmessage = (event: any) =>
        onWebRTCReceived(JSON.parse(event.data));
    };
  }

  // Process any queued ICE candidates
  processIceCandidates(remoteConnectionId);
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

onUnmounted(() => {
  closeWebsocket();
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
    closeRoom,
    onConnected,
    onDisconnected,
  };
}
