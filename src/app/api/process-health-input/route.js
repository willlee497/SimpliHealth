import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI with the API key from environment variables
// This allows us to use Gemini's capabilities throughout our application
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

/* We receive the user's input as a single string in the POST request.
   This string contains information about the user's health concern, which may include age, location, and symptoms.
   We pass this string to the `processHealthInput` function, which uses Gemini to extract the required information.
   Gemini parses the input and returns a JSON object with age, location, and symptom.
   We then use these extracted variables in subsequent function calls to fetch clinical trials and generate health advice.
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
    If any information is missing, use "unknown" for that field.
    Respond with a JSON object containing these three fields:
    {
      "age": (number or "unknown"),
      "location": (string or "unknown"),
      "symptom": (string or "unknown")
    }
    
    Text: "${input}"
  `
  
  // Send the prompt to Gemini and await the response
  const result = await model.generateContent(prompt)
  const response = await result.response
  
  // Parse the JSON response from Gemini
  // This gives us an object with age, location, and symptom
  return JSON.parse(response.text())
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
    Given a patient with the following information:
    Age: ${age}
    Location: ${location}
    Symptom: ${symptom}

    Provide a brief analysis of potential health issues and general advice. 
    Keep the response concise and informative, suitable for a health app user.
    Do not provide a definitive diagnosis, but suggest possible causes and when to seek professional medical help.
  `
  
  // Send the prompt to Gemini and await the response
  const result = await model.generateContent(prompt)
  const response = await result.response
  
  // Return the generated health advice as text
  return response.text()
}

// This is the main handler for POST requests to this API route
export async function POST(request) {
  try {
    // Extract the userInput from the request body
    const { userInput } = await request.json()

    // Check if userInput is provided
    if (!userInput) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 })
    }

    // Process user input with Gemini and store extracted data into variables
    // This is where we use Gemini to parse the input and get our three key variables
    const extractedData = await processHealthInput(userInput)

    // Log the extracted variables for debugging purposes
    // This shows that we've successfully stored age, location, and symptom as separate variables
    console.log('Extracted variables:', extractedData)

    // Fetch relevant clinical trials using the extracted symptom and location
    // Here, we're using our stored variables to make an API call
    const trials = await fetchClinicalTrials(extractedData.symptom, extractedData.location)

    // Generate health advice using the extracted variables
    // Again, we're using our stored variables as input for another function
    const advice = await generateHealthAdvice(extractedData.age, extractedData.location, extractedData.symptom)

    // Return a JSON response with all the processed data
    // Note that we're including our extracted variables in the response
    return NextResponse.json({
      extractedData,
      clinicalTrials: trials,
      healthAdvice: advice
    })

  } catch (error) {
    // Log any errors that occur during processing
    console.error('Error processing request:', error)
    // Return an error response
    return NextResponse.json({ error: 'An error occurred while processing your request.' }, { status: 500 })
  }
}