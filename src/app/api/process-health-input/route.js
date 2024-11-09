import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI with the API key from environment variables
// This allows us to use Gemini's capabilities throughout our application
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/* We receive the user's input as a string in the POST request.
 We pass this string to the `processHealthInput` function, which uses Gemini to extract the required information.
 Gemini parses the input and returns a JSON object with age, location, condition (if any), and symptoms.
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
  
  // Construct a prompt for Gemini to extract age, location, condition (if any), and symptoms
  // We're asking Gemini to return the information in a specific JSON format
  const prompt = `
    Extract the age, location, condition (if any), and symptoms from the following text. 
    Respond with a JSON object containing these fields:
    {
      "age": (number),
      "location": (string),
      "condition": (string or null),
      "symptoms": (array of strings)
    }
    
    Text: "${input}"
  `
  
  // Send the prompt to Gemini and await the response
  const result = await model.generateContent(prompt)
  const response = await result.response
  
  try {
    // Remove the backticks, "JSON" tag, and any leading/trailing whitespace from the response
    const cleanedResponse = response.text().replace(/```JSON\n|\n```/g, '').trim()
    // Parse the JSON response from Gemini
    // This gives us an object with age, location, condition, and symptoms
    return JSON.parse(cleanedResponse)
  } catch (error) {
    console.error('Error parsing Gemini response:', response.text())
    // If JSON parsing fails, attempt to extract information manually
    const manualExtraction = {
      age: parseInt(input.match(/(\d+)/)?.[1] || '0'),
      location: (input.match(/at\s+(\w+)/i)?.[1] || '').toLowerCase(),
      condition: (input.match(/have\s+(\w+)/i)?.[1] || null),
      symptoms: input.match(/(?:hurts|vomiting|pain)\s+(\w+)/gi)?.map(s => s.trim().toLowerCase()) || []
    }
    console.log('Manually extracted data:', manualExtraction)
    return manualExtraction
  }
}

// This function fetches relevant clinical trials based on the symptoms, condition, and country
async function fetchClinicalTrials(symptoms, location, condition) {
  // Construct the URL for the Clinical Trials API, including our search parameters
  const conditionQuery = condition ? `${condition} OR ` : ''
  const symptomsQuery = symptoms.join(' OR ')
  const url = `https://clinicaltrials.gov/api/v2/studies?format=json&query.cond=${encodeURIComponent(conditionQuery + symptomsQuery)}&query.locn=${encodeURIComponent(location)}&pageSize=5`
  
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
async function generateHealthAdvice(age, location, symptoms, condition) {
  // Get the Gemini model for text generation
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  // Construct a prompt for Gemini to generate health advice
  // We include the extracted age, location, symptoms, and condition (if any) in the prompt
  const conditionInfo = condition ? `They have a pre-existing condition of ${condition}.` : ''
  const prompt = `
    Generate health advice for a ${age}-year-old in ${location} experiencing the following symptoms: ${symptoms.join(', ')}. ${conditionInfo}
    Provide specific recommendations for each symptom and when to seek professional medical help. 
    If there's a pre-existing condition, consider how it might interact with the symptoms.
    Format the response as follows:
    General Advice: [General advice here]
    
    Symptom-specific Advice:
    [Symptom 1]: [Advice for symptom 1]
    [Symptom 2]: [Advice for symptom 2]
    ...
    
    When to Seek Medical Help: [Advice on when to seek professional help]
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

    const { age, location, condition, symptoms } = extractedData

    const [clinicalTrials, healthAdvice] = await Promise.all([
      fetchClinicalTrials(symptoms, location, condition),
      generateHealthAdvice(age, location, symptoms, condition)
    ])

    return NextResponse.json({ extractedData, clinicalTrials, healthAdvice })
  } catch (error) {
    console.error('Error processing request:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}