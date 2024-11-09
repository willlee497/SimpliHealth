'use client'

import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
        body: JSON.stringify({ 
          userInput: inputValue,
          conversationHistory: messages.map(m => `${m.type}: ${m.content}`)
        }),
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
          content: (
            <Card className="w-full bg-gray-900 text-white">
              <CardHeader>
                <CardTitle>Health Information</CardTitle>
              </CardHeader>
              <CardContent>
                <h3 className="text-lg font-semibold mb-2">Extracted Information:</h3>
                <p>Age: {data.extractedData.age || 'Not provided'}</p>
                <p>Location: {data.extractedData.location || 'Not provided'}</p>
                {data.extractedData.condition && <p>Condition: {data.extractedData.condition}</p>}
                <p>Symptoms: {data.extractedData.symptoms.length > 0 ? data.extractedData.symptoms.join(', ') : 'None reported'}</p>

                <h3 className="text-lg font-semibold mt-4 mb-2">Health Advice:</h3>
                <pre className="whitespace-pre-wrap">{data.healthAdvice}</pre>

                <h3 className="text-lg font-semibold mt-4 mb-2">Relevant Clinical Trials:</h3>
                {data.clinicalTrials.length > 0 ? (
                  <ul>
                    {data.clinicalTrials.map((trial, index) => (
                      <li key={index}>- {trial.protocolSection.identificationModule.briefTitle}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No relevant clinical trials found.</p>
                )}
              </CardContent>
            </Card>
          )
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
            <p className="text-gray-400 text-center">
              Describe your age, location, any pre-existing conditions, and current symptoms.
              For example: "I'm 43 at Congo. I have diabetes, and my stomach hurts. I'm also vomiting blood."
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            >
              <div
                className={`flex items-start max-w-3xl ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className={`mx-2 p-3 rounded-xl ${message.type === 'user' ? 'bg-blue-600' : 'bg-gray-900'} text-white`}>
                  {typeof message.content === 'string' ? (
                    <pre className="text-sm whitespace-pre-wrap font-sans">{message.content}</pre>
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </ScrollArea>
      
      <div className="flex justify-center items-center p-4">
        <form onSubmit={handleSubmit} className="w-full max-w-3xl flex space-x-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow"
            placeholder="Describe your health issue or ask a question..."
            disabled={isLoading}
          />
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-auto rounded-xl" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Submit'}
          </Button>
        </form>
      </div>
    </div>
  )
}