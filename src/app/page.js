'use client'

import { useState } from 'react'
import ChatDisplay from "@/components/Chat"

export default function Home() {
  const [messages, setMessages] = useState([])

  const handleSubmit = async (userInput) => {
    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', content: userInput }])

    try {
      const response = await fetch('/api/process-health-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch')
      }

      const data = await response.json()

      // Add API response to chat
      setMessages(prev => [
        ...prev,
        {
          type: 'assistant',
          content: `Extracted Information:
Age: ${data.extractedData.age}
Location: ${data.extractedData.location}
Symptom: ${data.extractedData.symptom}

Health Advice:
${data.healthAdvice}

Relevant Clinical Trials:
${data.clinicalTrials.map((trial) => `- ${trial.protocolSection.identificationModule.briefTitle}`).join('\n')}`
        }
      ])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { type: 'assistant', content: 'An error occurred while processing your request.' }])
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <ChatDisplay messages={messages} onSubmit={handleSubmit} />
    </div>
  )
}