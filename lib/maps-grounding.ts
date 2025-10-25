/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
* @license
* SPDX-License-Identifier: Apache-2.0
*/


import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { useMapStore } from '@/lib/state';

// TODO - replace with appropriate key
// const API_KEY = process.env.GEMINI_API_KEY
const API_KEY = process.env.API_KEY as string;

// Agricultural parameters interface
export interface AgriculturalParameters {
  // Required parameters (5)
  latitude: number;
  longitude: number;
  soilType: 'clay' | 'sandy' | 'loamy' | 'silt' | 'peat';
  climate: 'tropical' | 'arid' | 'temperate' | 'continental' | 'polar';
  season: 'spring' | 'summer' | 'fall' | 'winter';
  
  // Optional parameters (5)
  rainfall?: number; // Annual rainfall in mm
  temperature?: number; // Average temperature in °C
  irrigationAvailable?: boolean;
  farmSize?: number; // Farm size in hectares
  previousCrop?: string;
}

const AGRICULTURAL_SYS_INSTRUCTIONS = `You are an expert agricultural advisor AI. Based on the provided location coordinates and agricultural parameters (soil type, climate, season, rainfall, temperature, irrigation, farm size, previous crop), provide detailed crop recommendations. Include:
1. Top 3-5 recommended crops with rationale
2. Planting and harvesting timeline
3. Expected yield estimates
4. Soil preparation requirements
5. Water and fertilizer needs
6. Potential challenges and mitigation strategies
Format your response in clear sections.`;

/**
 * Helper function to automatically zoom the map to a specific location
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 */
function zoomToLocation(latitude: number, longitude: number): void {
  const { setCameraTarget, setPreventAutoFrame } = useMapStore.getState();
  
  // Set camera target for field-level view
  setCameraTarget({
    center: { 
      lat: latitude, 
      lng: longitude, 
      altitude: 750 // 750m altitude for good field detail
    },
    range: 2500, // 2.5km range for field-level view
    tilt: 50, // 50° tilt for better terrain view
    heading: 0,
    roll: 0,
  });
  
  // Prevent auto-framing to maintain our specific zoom level
  setPreventAutoFrame(true);
}

/**
* Calls the Gemini API with the googleSearch tool to get a grounded response.
* @param prompt The user's text prompt.
* @returns An object containing the model's text response and grounding sources.
*/
export async function fetchMapsGroundedResponseSDK({
 prompt,
 enableWidget = true,
 lat,
 lng,
 systemInstruction,
}: {
 prompt: string;
 enableWidget?: boolean;
 lat?: number;
 lng?: number;
 systemInstruction?: string;
}): Promise<GenerateContentResponse> {
 if (!API_KEY) {
   throw new Error('Missing required environment variable: API_KEY');
 }


 try {
   const ai = new GoogleGenAI({apiKey: API_KEY});


   const request: any = {
     model: 'gemini-2.5-flash',
     contents: prompt,
     config: {
       tools: [{googleMaps: {}}],
       thinkingConfig: {
         thinkingBudget: 0,
       },
       systemInstruction: systemInstruction || AGRICULTURAL_SYS_INSTRUCTIONS,
     },
   };


   if (lat !== undefined && lng !== undefined) {
     request.toolConfig = {
       retrievalConfig: {
         latLng: {
           latitude: lat,
           longitude: lng,
         },
       },
     };
   }


   const response = await ai.models.generateContent(request);
   return (response);
 } catch (error) {
   console.error(`Error calling Google Search grounding: ${error}
   With prompt: ${prompt}`);
   // Re-throw the error to be handled by the caller
   throw error;
 }
}


/**
* Calls the Google AI Platform REST API to get a Maps-grounded response.
* @param options The request parameters.
* @returns A promise that resolves to the API's GenerateContentResponse.
*/
export async function fetchMapsGroundedResponseREST({
 prompt,
 enableWidget = true,
 lat,
 lng,
 systemInstruction,
}: {
 prompt: string;
 enableWidget?: boolean;
 lat?: number;
 lng?: number;
 systemInstruction?: string;
}): Promise<GenerateContentResponse> {
 if (!API_KEY) {
   throw new Error('Missing required environment variable: API_KEY');
 }
 const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

const requestBody: any = {
   contents: [
     {
       parts: [
         {
           text: prompt,
         },
       ],
     },
   ],
   system_instruction: {
       parts: [ { text: systemInstruction || AGRICULTURAL_SYS_INSTRUCTIONS } ]
   },
   tools: [
     {
       google_maps: {
        enable_widget: enableWidget
       },
     },
   ],
   generationConfig: {
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
 };


 if (lat !== undefined && lng !== undefined) {
   requestBody.toolConfig = {
     retrievalConfig: {
       latLng: {
         latitude: lat,
         longitude: lng,
       },
     },
   };
 }


 try {
  //  console.log(`endpoint: ${endpoint}\nbody: ${JSON.stringify(requestBody, null, 2)}`)
   const response = await fetch(endpoint, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-goog-api-key': API_KEY,
     },
     body: JSON.stringify(requestBody),
   });


   if (!response.ok) {
     const errorBody = await response.text();
     console.error('Error from Generative Language API:', errorBody);
     throw new Error(
       `API request failed with status ${response.status}: ${errorBody}`,
     );
   }


   const data = await response.json();
   return data as GenerateContentResponse;
 } catch (error) {
   console.error(`Error calling Maps grounding REST API: ${error}`);
   throw error;
 }
}

/**
* Calls the Google AI Platform REST API to get agricultural recommendations.
* @param params The agricultural parameters and location data.
* @returns A promise that resolves to the API's GenerateContentResponse.
*/
export async function fetchAgriculturalRecommendations(
 params: AgriculturalParameters
): Promise<GenerateContentResponse> {
 if (!API_KEY) {
   throw new Error('Missing required environment variable: API_KEY');
 }
 const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

 // Construct agricultural prompt with all parameters
 const agriculturalPrompt = `Location: ${params.latitude}, ${params.longitude}
Soil Type: ${params.soilType}
Climate: ${params.climate}
Season: ${params.season}
${params.rainfall ? `Annual Rainfall: ${params.rainfall}mm` : ''}
${params.temperature ? `Average Temperature: ${params.temperature}°C` : ''}
${params.irrigationAvailable !== undefined ? `Irrigation Available: ${params.irrigationAvailable ? 'Yes' : 'No'}` : ''}
${params.farmSize ? `Farm Size: ${params.farmSize} hectares` : ''}
${params.previousCrop ? `Previous Crop: ${params.previousCrop}` : ''}

Please provide detailed crop recommendations for this agricultural location.`;

const requestBody: any = {
   contents: [
     {
       parts: [
         {
           text: agriculturalPrompt,
         },
       ],
     },
   ],
   system_instruction: {
       parts: [ { text: AGRICULTURAL_SYS_INSTRUCTIONS } ]
   },
   tools: [
     {
       google_maps: {
        enable_widget: true
       },
     },
   ],
   generationConfig: {
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
 };


 // Add location context for Maps grounding
 requestBody.toolConfig = {
   retrievalConfig: {
     latLng: {
       latitude: params.latitude,
       longitude: params.longitude,
     },
   },
 };


 try {
  //  console.log(`endpoint: ${endpoint}\nbody: ${JSON.stringify(requestBody, null, 2)}`)
   const response = await fetch(endpoint, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'x-goog-api-key': API_KEY,
     },
     body: JSON.stringify(requestBody),
   });


   if (!response.ok) {
     const errorBody = await response.text();
     console.error('Error from Generative Language API:', errorBody);
     throw new Error(
       `API request failed with status ${response.status}: ${errorBody}`,
     );
   }


   const data = await response.json();
   
   // Automatically zoom to the location after getting the response
   zoomToLocation(params.latitude, params.longitude);
   
   return data as GenerateContentResponse;
 } catch (error) {
   console.error(`Error calling Agricultural Recommendations API: ${error}`);
   throw error;
 }
}