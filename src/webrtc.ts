import {useStore} from "./store.ts";

const peerConnection = new RTCPeerConnection({})
const dataChannel = peerConnection.createDataChannel('dataChannel')

dataChannel.onerror = function (error) {
    console.log("Error:", error);
};
dataChannel.onclose = function () {
    console.log("Data channel is closed");
};


signaling.addEventListener('open', () => {

    peerConnection.createOffer({}).then(function (offer) {
        console.log("Offer:", offer);
        signaling.send(JSON.stringify({
            type: 'publish',
            topic: 'broadcast',
            event: 'offer',
            data: offer
        }))
        peerConnection.setLocalDescription(offer);
    });


    peerConnection.onicecandidate = (event) => {
        console.log('icecandidate', event.candidate)
        if (event.candidate) {
            signaling.send(JSON.stringify({
                type: 'publish',
                topic: 'broadcast',
                event: 'candidate',
                data: event.candidate
            }))
        }
    };

})

signaling.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)

    switch (message.event) {
        case 'offer': {
            console.log('signaling offer', message)
            const offer = message.data
            peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            peerConnection.createAnswer({}).then((answer) => {
                peerConnection.setLocalDescription(answer);
                signaling.send(JSON.stringify({
                    type: 'publish',
                    topic: 'broadcast',
                    event: 'answer',
                    data: answer
                }));
            });
            break;
        }
        case 'candidate': {
            console.log('signaling candidate', message)
            const candidate = message.data
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            break;
        }
        case 'answer': {
            console.log('signaling answer', message)
            const answer = message.data
            peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            break;
        }
        default:
            console.log('signaling unknown', message)
    }
})


dataChannel.addEventListener('open', function () {
    console.log('datachannel open')
    dataChannel.onmessage = function (event) {
        console.log('datachannel message', event)
        useStore.getState().setPosition(event.data)
    }
});

peerConnection.ondatachannel = function (event) {
    console.log('datachannel update', event.channel)
    dataChannel = event.channel;
};