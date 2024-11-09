import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI with the API key from environment variables
// This allows us to use Gemini's capabilities throughout our application
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/* We receive the user's input as a string in the POST request.
 We pass this string to the `processHealthInput` function, which uses Gemini to extract the required information.
 Gemini parses the input and returns a JSON object with age, location, and symptom.
 We destructure this object to store these values as separate variables.
 We then use these stored variables in subsequent function calls to fetch clinical trials and generate health advice.
 Finally, we return all of this information, including the extracted variables, in our API response.
This approach allows us to effectively use Gemini for natural language processing, extracting structured data from unstructured text input. 
The extracted variables are then available for use throughout the rest of our application logic.
*/

// This function uses Gemini to process the user's input and extract key health information
async function processHealthInput(input) {
  // Get the Gemini model we'll use for text generation
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  // Construct a prompt for Gemini to extract age, location, and symptom
  // We're asking Gemini to return the information in a specific JSON format
  const prompt = `
    Extract the age, location, and symptom from the following text. 
    Respond with a JSON object containing these three fields:
    {
      "age": (number),
      "location": (string),
      "symptom": (string)
    }
    
    Text: "${input}"
  `
  
  // Send the prompt to Gemini and await the response
  const result = await model.generateContent(prompt)
  const response = await result.response
  
  try {
    // Parse the JSON response from Gemini
    // This gives us an object with age, location, and symptom
    return JSON.parse(response.text())
  } catch (error) {
    console.error('Error parsing Gemini response:', response.text())
    throw new Error('Failed to parse Gemini response')
  }
}

// This function fetches relevant clinical trials based on the condition and country
async function fetchClinicalTrials(condition, country) {
  // Construct the URL for the Clinical Trials API, including our search parameters
  const url = `https://clinicaltrials.gov/api/v2/studies?format=json&query.cond=${encodeURIComponent(condition)}&query.locn=${encodeURIComponent(country)}&pageSize=5`
  
  // Fetch data from the Clinical Trials API
  const response = await fetch(url)
  
  // Check if the API request was successful
  if (!response.ok) {
    throw new Error(`Clinical Trials API responded with status: ${response.status}`)
  }
  
  // Parse the JSON response and return the studies
  const data = await response.json()
  return data.studies
}

// This function uses Gemini to generate health advice based on the extracted information
async function generateHealthAdvice(age, location, symptom) {
  // Get the Gemini model for text generation
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  // Construct a prompt for Gemini to generate health advice
  // We include the extracted age, location, and symptom in the prompt
  const prompt = `
    Generate brief health advice for a ${age}-year-old in ${location} experiencing ${symptom}.
    Provide general recommendations and when to seek professional medical help.
  `
  
  // Send the prompt to Gemini and await the response
  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function POST(request) {
  try {
    const { userInput } = await request.json()
    console.log('Received user input:', userInput)

    const extractedData = await processHealthInput(userInput)
    console.log('Extracted data:', extractedData)

    const { age, location, symptom } = extractedData

    const [clinicalTrials, healthAdvice] = await Promise.all([
      fetchClinicalTrials(symptom, location),
      generateHealthAdvice(age, location, symptom)
    ])

    return NextResponse.json({ extractedData, clinicalTrials, healthAdvice })
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}