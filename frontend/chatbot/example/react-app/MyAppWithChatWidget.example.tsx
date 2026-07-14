import { ChatWidget } from 'react-chat-widget-kit'
// No separate CSS import needed — styles are auto-injected at runtime.

// ============================================================================
// Example: dropping the widget into an existing React app via the npm
// package (once published, or via `npm link` / a local `file:` dependency
// pointing at this repo's dist/ during development).
// ============================================================================

export default function MyAppWithChatWidget() {
  return (
    <div>
      {/* ... rest of your app ... */}

      <ChatWidget
        config={{
          botName: 'Product Assistant',
          welcomeMessage: 'Hi! Ask me anything about the product.',
          placeholderText: 'Type a message…',
          position: 'bottom-right',
          showTimestamps: true,
          theme: { colorScheme: 'auto' }, // follows the user's OS light/dark preference
          protocol: {
            type: 'http',
            endpoint: 'https://api.yourapp.com/chat',
            headers: { Authorization: 'Bearer <token>' }
          }
        }}
      />
    </div>
  )
}
