'use client'

import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ChatDisplay() {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!inputValue.trim() || isLoading) return

    setIsLoading(true)
    setMessages(prev => [...prev, { type: 'user', content: inputValue }])

    try {
      const response = await fetch('/api/process-health-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput: inputValue }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

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
      setMessages(prev => [...prev, { type: 'assistant', content: `An error occurred: ${error.message}` }])
    } finally {
      setIsLoading(false)
      setInputValue('')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-800">
      <ScrollArea className="flex-grow p-4 overflow-auto" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full">
            <h2 className="text-white text-2xl mb-4">What's going on?</h2>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div
                className={`flex items-start ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className="mx-2 p-3 rounded-xl bg-gray-900 text-white">
                  <pre className="text-sm whitespace-pre-wrap font-sans">{message.content}</pre>
                </div>
              </div>
            </div>
          ))
        )}
      </ScrollArea>
      
      <div className="flex justify-center items-center p-4">
        <form onSubmit={handleSubmit} className="w-full max-w-md flex space-x-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow"
            placeholder="Type something..."
            disabled={isLoading}
          />
          <Button type="submit" className="bg-gray-900 w-auto rounded-xl" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </div>
    </div>
  )
}