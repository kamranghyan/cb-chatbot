'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useSendMessage } from '../hooks/useChat';

interface Bubble { role: 'user' | 'assistant'; body: string }

export function ChatWindow() {
  const sendMessage = useSendMessage();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Bubble[]>([]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sendMessage.isPending) return;
    setMessages((m) => [...m, { role: 'user', body: text }]);
    setInput('');
    const data = (await sendMessage.mutateAsync({ message: text })) as {
      conversation?: { body?: string };
    };
    setMessages((m) => [...m, { role: 'assistant', body: data?.conversation?.body ?? '…' }]);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
      <Paper variant="outlined" sx={{ flex: 1, p: 2, mb: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.length === 0 && (
          <Typography color="text.secondary">Ask a question to start the conversation.</Typography>
        )}
        {messages.map((m, i) => (
          <Box
            key={i}
            sx={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              bgcolor: m.role === 'user' ? 'primary.main' : 'grey.100',
              color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
              px: 2, py: 1, borderRadius: 2, maxWidth: '75%',
            }}
          >
            {m.body}
          </Box>
        ))}
        {sendMessage.isPending && <Typography variant="body2" color="text.secondary">Thinking…</Typography>}
      </Paper>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Type your message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button variant="contained" onClick={handleSend} disabled={sendMessage.isPending}>Send</Button>
      </Box>
    </Box>
  );
}
