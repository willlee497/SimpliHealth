'use client'

import { useState, useRef, useEffect } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Header from './Header'

// Custom hook for typing effect with error correction
function useTypingEffect(text, speed = 50, startTyping = true) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTypingComplete, setIsTypingComplete] = useState(false)

  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    setIsTypingComplete(false);

    if (!startTyping) return;

    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => {
          // Ensure full words are typed before moving to the next
          const nextChar = text.charAt(i);
          if (nextChar === ' ' || i === text.length - 1) {
            return text.substring(0, i + 1);
          }
          return prev + nextChar;
        });
        i++;
      } else {
        clearInterval(typingInterval);
        setIsTypingComplete(true);
        // Final check to ensure complete text is displayed
        setDisplayedText(text);
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed, startTyping]);

  return { displayedText, isTypingComplete };
}

// Typing Card component
function TypingCard({ data }) {
  if (!data || !data.extractedData) {
    return <p>Error: Invalid data received</p>;
  }

  const { displayedText: extractedInfo, isTypingComplete: extractedComplete } = useTypingEffect(
    `Age: ${data.extractedData.age || 'Not provided'}
Location: ${data.extractedData.location || 'Not provided'}
${data.extractedData.condition ? `Condition: ${data.extractedData.condition}` : ''}
Symptoms: ${data.extractedData.symptoms.length > 0 ? data.extractedData.symptoms.join(', ') : 'None reported'}`,
    50
  );

  const { displayedText: healthAdvice, isTypingComplete: adviceComplete } = useTypingEffect(
    data.healthAdvice,
    30,
    extractedComplete
  );

  const { displayedText: trials, isTypingComplete: trialsComplete } = useTypingEffect(
    data.clinicalTrials.length > 0
      ? data.clinicalTrials.map(trial => `-> ${trial.protocolSection.identificationModule.briefTitle}`).join('\n')
      : 'No relevant clinical trials found.',
    20,
    adviceComplete
  );

  return (
    <Card className="w-full bg-lime-900 text-white">
      <CardHeader>
        <CardTitle>Health Information</CardTitle>
      </CardHeader>
      <CardContent>
        <h3 className="text-lg font-semibold mb-2">Extracted Information:</h3>
        <pre className="whitespace-pre-wrap">{extractedInfo}</pre>

        {extractedComplete && (
          <>
            <h3 className="text-lg font-semibold mt-4 mb-2">Health Advice:</h3>
            <pre className="whitespace-pre-wrap">{healthAdvice}</pre>
          </>
        )}

        {adviceComplete && (
          <>
            <h3 className="text-lg font-semibold mt-4 mb-2">Relevant Clinical Trials:</h3>
            <pre className="whitespace-pre-wrap">{trials}</pre>
          </>
        )}
      </CardContent>
    </Card>
  );
}

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
          content: data && data.extractedData ? <TypingCard data={data} /> : 'Error: Invalid response from server'
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
    <div className="flex flex-col h-screen bg-amber-100">
      {messages.length > 0 && <Header />}
    
      <ScrollArea className="flex-grow p-4 overflow-auto" ref={scrollAreaRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full">
            <img
              className="w-64 h-64 p-4"
              src='/pngegg.png'
              alt="Image"
            />
            <h2 className="text-lime-900 text-2xl mb-4">What is going on?</h2>
    
            <form onSubmit={handleSubmit} className="w-full max-w-lg flex space-x-2">
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 placeholder:text-lime-900 text-lime-900"
                placeholder="Describe your health issue or ask a question..."
                disabled={isLoading}
              />
              <Button
                type="submit"
                className="bg-lime-900 hover:bg-lime-950 w-auto rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Submit'}
              </Button>
            </form>
            <h1 className="text-lime-900 text-sm text-center mb-6 pt-4">
              Describe your age, location, any pre-existing conditions, and current symptoms. <br />
              For example: "I am 43 at Congo. I have diabetes, and my stomach hurts. I am also vomiting blood."
            </h1>
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
                <div
                  className={`mx-2 p-3 rounded-xl ${
                    message.type === 'user' ? 'bg-lime-900' : 'bg-lime-900'
                  } text-white`}
                >
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
    
      {messages.length > 0 && (
        <div className="flex justify-center items-center p-4">
          <form onSubmit={handleSubmit} className="w-full max-w-3xl flex space-x-2">
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 mt-1 placeholder:text-lime-900 text-lime-900"
              placeholder="Describe your health issue or ask a question..."
              disabled={isLoading}
            />
            <Button
              type="submit"
              className="bg-lime-900 hover:bg-lime-950 w-auto rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Submit'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}