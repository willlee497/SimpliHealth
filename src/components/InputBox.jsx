'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function InputBox({ onSendMessage }) {
  const [inputValue, setInputValue] = useState('')

  const handleInputChange = (event) => {
    setInputValue(event.target.value)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (inputValue.trim()) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-10">
      <div className="space-y-4 pb-16">
        <div>
          <div className="flex space-x-2">
            <Input
                type="text"
                id="stringInput"
                value={inputValue}
                onChange={handleInputChange}
                className="flex-1 mt-1"
                placeholder="Type something..."
            />
            <Button type="submit" className="bg-gray-900 w-auto rounded-xl">
                Submit
            </Button>
            </div>
        </div>
      </div>
    </form>
  )
}