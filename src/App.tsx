import {create} from "zustand";

const configuration = {
    iceServers: [{
        urls: "stun:stun2.1.google.com:19302"
    }]
} as RTCConfiguration

type OfferMessage = {
    name: string
    offer: RTCSessionDescriptionInit
}

type State = {
    peerConnection: RTCPeerConnection
    dataChannel: RTCDataChannel

    url: string
    setUrl: (url: string) => void
    name: string
    setName: (name: string) => void

    socket: WebSocket | null
    socketReadyState: number
    connect: () => void
    disconnect: () => void

    offerMessages: OfferMessage[]

    sendOffer: () => void
    sendAnswer: (message: OfferMessage) => void
}

const peerConnection = new RTCPeerConnection(configuration)
const dataChannel = peerConnection.createDataChannel('dataChannel')

const useStore = create<State>((set, get) => ({
    peerConnection: peerConnection,
    dataChannel: dataChannel,

    url: 'ws://localhost:4444',
    setUrl: (url) => set(() => ({url})),
    name: 'aboba',
    setName: (name) => set(() => ({name})),

    socket: null,
    socketReadyState: 3,
    connect: () => {
        let socket = get().socket
        if (socket) {
            socket.close()
        }
        socket = new WebSocket(get().url + '?' + new URLSearchParams({name: get().name}))
        socket.addEventListener('open', () => {
            set(() => ({socketReadyState: socket.readyState}))
            console.log('open', socket.readyState)
        })
        socket.addEventListener('close', () => {
            set(() => ({socket: null, socketReadyState: socket.readyState}))
            console.log('close', socket.readyState)
        })
        socket.addEventListener('message', (event) => {
            console.log('message', event)
            const message = JSON.parse(event.data)
            switch (message.event) {
                case 'offer': {
                    set(() => ({
                        socketReadyState: socket.readyState,
                        offerMessages: [...get().offerMessages, {
                            name: message.name,
                            offer: message.data
                        }]
                    }))
                    break;
                }
                default: {
                    console.log('unable to handle message', message)
                }
            }
        })
        socket.addEventListener('error', (event) => {
            set(() => ({socketReadyState: socket.readyState}))
            console.log('error', event)
        })
        set(() => ({socket, socketReadyState: socket.readyState}))
    },
    disconnect: () => {
        let socket = get().socket
        if (socket) {
            socket.close()
        }
    },
    offerMessages: [],
    sendOffer: () => {
        const socket = get().socket
        if (!socket)
            return
        peerConnection.createOffer({}).then(function (offer) {
            console.log("Offer:", offer)
            socket.send(JSON.stringify({
                type: 'publish',
                topic: 'broadcast',
                event: 'offer',
                name: get().name,
                data: offer
            }))
            peerConnection.setLocalDescription(offer);
        });
    },
    sendAnswer: (message) => {
        const socket = get().socket
        if (!socket) return
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer))
        peerConnection.createAnswer({}).then((answer) => {
            peerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({
                type: 'publish',
                topic: 'broadcast',
                event: 'answer',
                data: answer
            }));
        });
    }
}))


function App() {
    const {
        url, setUrl,
        name, setName,
        offerMessages,
        sendOffer,
        sendAnswer,
        socket, socketReadyState, connect, disconnect
    } = useStore(state => state)

    return (
        <div className={'h-screen flex flex-col items-center justify-center'}>
            <div>
                <div className={'mt-4'}>
                    <div>
                        <div className={'flex items-center'}>
                            <input className={'w-full p-2 border-2 border-gray-300 rounded-l-md focus:outline-gray-400'}
                                   value={url} onChange={(e) => setUrl(e.target.value)}/>
                            <input className={'w-full p-2 border-2 border-l-0 border-gray-300 rounded-r-md focus:outline-gray-400'}
                                   value={name} onChange={(e) => setName(e.target.value)}/>
                        </div>
                        <div className={'mt-1 flex items-center w-full'}>
                            <button className={'w-full p-2 border-2 border-gray-300 rounded-l-md'} onClick={connect}>
                                Connect
                            </button>
                            <button className={'w-full p-2 border-2 border-l-0 border-gray-300 rounded-r-md'}
                                    onClick={disconnect}>
                                Disconnect
                            </button>
                        </div>
                    </div>
                    <span className={'text-sm'}>
                        {{
                            0: <span className={'text-gray-400'}>Connecting</span>,
                            1: <span className={'text-green-600'}>Open</span>,
                            2: <span className={'text-yellow-600'}>Closing</span>,
                            3: <span className={'text-red-600'}>Closed</span>
                        }[socketReadyState]}
                    </span>
                </div>

                {
                    socketReadyState !== 1 ? null : (
                        <div className={'mt-4'}>
                            <button className={'p-2 border-2 border-gray-300 rounded-md'} onClick={sendOffer}>
                                Make offer
                            </button>
                            <div
                                className={'mt-1 flex flex-col border-2 border-gray-300 rounded-md w-full min-h-[100px]'}>
                                {
                                    offerMessages.map((message, index) => (
                                        <div key={index} className={'p-2 border-b-2 border-gray-300'} onClick={() => sendAnswer(message)}>
                                            {message.name}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    )
}

export default App
