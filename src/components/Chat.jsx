'use client'

import { useState } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
//import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import InputBox from './InputBox'

export default function ChatDisplay() {
  const [messages, setMessages] = useState([])

  const handleSendMessage = (message) => {
    const newMessages = [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: 'This is a sample response from the assistant.' }
    ]
    setMessages(newMessages)
  }

  const isChatStarted = messages.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-800">
      {/* Initial Input Box Centered Layout */}
      {!isChatStarted && (
        <div className="flex flex-col justify-center items-center flex-grow">
        <h2 className="text-white text-2xl mb-4">What's going on?</h2>
          <div className="w-full max-w-md px-4">
            <InputBox onSendMessage={handleSendMessage} />
          </div>
        </div>
      )}

      {/* Chat Layout after the first message */}
      {isChatStarted && (
        <>
          <ScrollArea className="flex-grow p-4 overflow-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                <div
                  className={`flex items-start ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className="mx-2 p-3 rounded-xl bg-gray-900 text-white">
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
          <InputBox onSendMessage={handleSendMessage} />
        </>
      )}
    </div>
  );
}