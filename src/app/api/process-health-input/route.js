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
async function processHealthInput(input, conversationHistory) {
  // Get the Gemini model we'll use for text generation
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  // Construct a prompt for Gemini to extract age, location, condition (if any), and symptoms
  // We're asking Gemini to return the information in a specific JSON format
  const prompt = `
    Given the following conversation history and new input, extract the age, location, condition (if any), and symptoms.
    If the new input is a question or comment about a previous health issue, use the most recent health information from the conversation history.
    If it's a new health issue, extract the information from the new input.
    
    Conversation history:
    ${conversationHistory.join('\n')}
    
    New input: "${input}"
    
    Respond with a JSON object containing these fields:
    {
      "age": (number or null if not provided),
      "location": (string or null if not provided),
      "condition": (string or null if not provided),
      "symptoms": (array of strings, can be empty),
      "isFollowUp": (boolean, true if the input is a follow-up question or comment about a previous health issue),
      "followUpTopic": (string, the main topic of the follow-up question or comment, or null if not a follow-up)
    }
  `
  
  // Send the prompt to Gemini and await the response
  const result = await model.generateContent(prompt)
  const response = await result.response
  
  try {
    // Remove the backticks, "JSON" tag, and any leading/trailing whitespace from the response
    const cleanedResponse = response.text().replace(/```json\n|\n```/g, '').trim()
    // Parse the JSON response from Gemini
    // This gives us an object with age, location, condition, symptoms, isFollowUp, and followUpTopic
    return JSON.parse(cleanedResponse)
  } catch (error) {
    console.error('Error parsing Gemini response:', response.text())
    // If JSON parsing fails, attempt to extract information manually
    const manualExtraction = {
      age: parseInt(input.match(/\b(\d+)\b/)?.[1]) || null,
      location: (input.match(/\b(?:at|in)\s+([^\.]+)/i)?.[1] || '').trim() || null,
      condition: (input.match(/\b(?:with|have)\s+(\w+)(?:\s+condition)?/i)?.[1] || null),
      symptoms: (input.match(/symptoms?:?\s*(.+)$/i)?.[1] || '').split(/\s*,\s*|\s+and\s+/).filter(Boolean),
      isFollowUp: input.toLowerCase().includes('previous') || input.toLowerCase().includes('earlier') || input.trim().endsWith('?'),
      followUpTopic: null // We can't reliably extract this manually
    }
    console.log('Manually extracted data:', manualExtraction)
    return manualExtraction
  }
}

// This function fetches relevant clinical trials based on the symptoms, condition, and country
async function fetchClinicalTrials(symptoms, location, condition) {
  // Construct the query string
  const queryTerms = [...symptoms];
  if (condition) queryTerms.push(condition);
  const query = queryTerms.join(' OR ');

  // Extract just the country name from the location
  const country = location.split(' ')[0];

  // Construct the URL for the Clinical Trials API, including our search parameters
  const url = `https://clinicaltrials.gov/api/v2/studies?format=json&query.cond=${encodeURIComponent(query)}&query.locn=${encodeURIComponent(country)}&pageSize=5`;
  
  console.log('Clinical Trials API URL:', url);
  
  // Fetch data from the Clinical Trials API
  const response = await fetch(url);
  
  // Check if the API request was successful
  if (!response.ok) {
    console.error('Clinical Trials API Error:', await response.text());
    // Instead of throwing an error, return an empty array
    return [];
  }
  
  // Parse the JSON response and return the studies
  const data = await response.json();
  return data.studies || [];
}

// This function uses Gemini to generate health advice based on the extracted information
async function generateHealthAdvice(age, location, symptoms, condition, isFollowUp, followUpTopic, conversationHistory) {
  // Get the Gemini model for text generation
  const model = genAI.getGenerativeModel({ model: "gemini-pro" })
  
  // Construct a prompt for Gemini to generate health advice
  // We include the extracted age, location, symptoms, and condition (if any) in the prompt
  let prompt = `Given the following conversation history and current health information, `
  
  if (isFollowUp) {
    prompt += `provide a detailed answer to the user's follow-up question or comment about ${followUpTopic || 'their previous health issue'}. `
    prompt += `Consider the previous health information and advice given when formulating your response.`
  } else {
    prompt += `generate health advice for a person`
    
    if (age !== null) {
      prompt += ` aged ${age}`
    }
    
    if (location) {
      prompt += ` in ${location}`
    }
    
    if (symptoms.length > 0) {
      prompt += ` experiencing the following symptom${symptoms.length > 1 ? 's' : ''}: ${symptoms.join(', ')}.`
    } else {
      prompt += ` with no reported symptoms.`
    }
    
    if (condition) {
      prompt += ` They have a pre-existing condition of ${condition}.`
    }
  }
  
  prompt += `
    Provide specific recommendations for each symptom (if any) and when to seek professional medical help. 
    If there's a pre-existing condition, consider how it might interact with the symptoms.
    
    Conversation history:
    ${conversationHistory.join('\n')}
    
    Format the response as follows:
    ${isFollowUp ? 'Answer: [Provide a detailed answer to the user\'s follow-up question or comment]' : `
    General Advice: [General advice here]
    
    ${symptoms.length > 0 ? `Symptom-specific Advice:
    ${symptoms.map(symptom => `[${symptom}]: [Advice for ${symptom}]`).join('\n')}
    ` : ''}
    When to Seek Medical Help: [Advice on when to seek professional help]
    `}
  `
  
  // Send the prompt to Gemini and await the response
  const result = await model.generateContent(prompt)
  const response = await result.response
  return response.text()
}

export async function POST(request) {
  try {
    const { userInput, conversationHistory = [] } = await request.json();
    console.log('Received user input:', userInput);
    console.log('Conversation history:', conversationHistory);

    const extractedData = await processHealthInput(userInput, conversationHistory);
    console.log('Extracted data:', extractedData);

    const { age, location, condition, symptoms, isFollowUp, followUpTopic } = extractedData;

    const [clinicalTrials, healthAdvice] = await Promise.all([
      fetchClinicalTrials(symptoms, location, condition).catch(error => {
        console.error('Error fetching clinical trials:', error);
        return []; // Return empty array if there's an error
      }),
      generateHealthAdvice(age, location, symptoms, condition, isFollowUp, followUpTopic, conversationHistory)
    ]);

    return NextResponse.json({ extractedData, clinicalTrials, healthAdvice });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}