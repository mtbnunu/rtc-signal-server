# RTC Signal Server
this is cdk app for creating a signal server on aws for webrtc.
websocket is used to communicate offer, answers, and signals between peers.
this websocket connection is designed to be disconnected as soon as webrtc connection has been made.

There is no state or database with this. `room id` to be used is host's websocket connectionid.
