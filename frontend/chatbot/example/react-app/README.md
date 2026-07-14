# Example — React app usage (npm package)

`MyAppWithChatWidget.example.tsx` shows how a team already using React
consumes this as a normal npm dependency — no script tags, no Shadow DOM,
just an import.

## Using it in your own project

Once published (or linked locally):

```bash
npm install react-chat-widget-kit
```

```tsx
import { ChatWidget } from 'react-chat-widget-kit'

<ChatWidget config={{ botName: 'Bot', protocol: { type: 'mock' } }} />
```

## Trying it against this repo before publishing

From the repo root:

```bash
npm run build:lib
npm link                 # registers this package globally

# in your other React project
npm link react-chat-widget-kit
```

Styles are injected automatically at runtime (see `src/components/ChatWidget.tsx`)
— there's no separate `.css` file to import.
