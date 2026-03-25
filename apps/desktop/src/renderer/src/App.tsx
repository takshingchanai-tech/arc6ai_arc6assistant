import ChatWindow from './components/ChatWindow.js'

const API_URL = import.meta.env.VITE_API_URL || 'https://arc6assistant.takshingchanai.workers.dev'

export default function App(): JSX.Element {
  return <ChatWindow apiUrl={API_URL} />
}
