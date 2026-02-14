
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, PlantProfile } from "../types";

const PLANT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { 
      type: Type.STRING, 
      description: 'Common name of the matched plant. If no match is found, use "No Database Match Found".' 
    },
    scientificName: { 
      type: Type.STRING, 
      description: 'Scientific name from the profile. Use "N/A" if no match.' 
    },
    isInvasive: { 
      type: Type.BOOLEAN, 
      description: 'Invasive status from the profile. Use false if no match.' 
    },
    confidence: { 
      type: Type.NUMBER, 
      description: 'Confidence score from 0 to 1. If "No Database Match Found", this represents confidence that the specimen is NOT in the database.' 
    },
    description: { 
      type: Type.STRING, 
      description: 'Explanation of the identification or why it definitely does not match any profile.' 
    },
    matchedProfileId: { 
      type: Type.STRING, 
      description: 'The ID of the matched profile. Use "unknown" if no match is found.' 
    }
  },
  required: ['name', 'scientificName', 'isInvasive', 'confidence', 'description', 'matchedProfileId']
};

export const analyzePlantWithContext = async (
  base64Image: string, 
  profiles: PlantProfile[]
): Promise<AnalysisResult> => {
  // Initialize GoogleGenAI with the API key from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  if (profiles.length === 0) {
    throw new Error("Training database is empty. Please add plant profiles first.");
  }

  // Create a text-based manifest of profiles for the prompt
  const profileManifest = profiles.map(p => ({
    id: p.id,
    name: p.name,
    scientificName: p.scientificName,
    isInvasive: p.isInvasive,
    imageCount: p.images.length
  }));

  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
        { text: `
          SYSTEM TASK: Identify the plant in the provided image by matching it ONLY to the local database profiles listed below. 
          
          CRITICAL CONSTRAINTS: 
          1. Do NOT use external internet knowledge for identification.
          2. If the plant matches a profile, provide that profile's details and your confidence.
          3. If the plant does not match any profile, set the name to "No Database Match Found" and matchedProfileId to "unknown".
          4. For "No Database Match Found" results, the "confidence" field must represent how sure you are that this specimen IS NOT any of the plants in the provided list.
          5. If you are 100% certain that what you are looking at is NOT in the training database, set confidence to 1.0 and state your reasoning in the description.

          LOCAL PROFILES DATABASE:
          ${JSON.stringify(profileManifest, null, 2)}

          Analyze the specimen carefully. Determine if it is a match or a novel species relative to this specific dataset.
        ` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: PLANT_SCHEMA
    }
  });

  const text = result.text;
  if (!text) throw new Error("Identification failed.");
  return JSON.parse(text);
};
