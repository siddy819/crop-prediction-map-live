/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Agricultural tools for crop recommendation system
 */

export const agriculturalTools = [
  {
    name: 'agriculturalRecommendation',
    description: 'Provides crop recommendations based on location and agricultural parameters',
    parameters: {
      type: 'object',
      properties: {
        latitude: { 
          type: 'number', 
          description: 'Farm latitude coordinate' 
        },
        longitude: { 
          type: 'number', 
          description: 'Farm longitude coordinate' 
        },
        soilType: { 
          type: 'string', 
          enum: ['clay', 'sandy', 'loamy', 'silt', 'peat'],
          description: 'Type of soil on the farm'
        },
        climate: { 
          type: 'string', 
          enum: ['tropical', 'arid', 'temperate', 'continental', 'polar'],
          description: 'Climate zone of the farm location'
        },
        season: { 
          type: 'string', 
          enum: ['spring', 'summer', 'fall', 'winter'],
          description: 'Current or planned planting season'
        },
        rainfall: { 
          type: 'number', 
          description: 'Annual rainfall in mm (optional)' 
        },
        temperature: { 
          type: 'number', 
          description: 'Average temperature in °C (optional)' 
        },
        irrigationAvailable: { 
          type: 'boolean', 
          description: 'Whether irrigation is available (optional)' 
        },
        farmSize: { 
          type: 'number', 
          description: 'Farm size in hectares (optional)' 
        },
        previousCrop: { 
          type: 'string', 
          description: 'Previously grown crop (optional)' 
        }
      },
      required: ['latitude', 'longitude', 'soilType', 'climate', 'season']
    },
    isEnabled: true,
  }
];
