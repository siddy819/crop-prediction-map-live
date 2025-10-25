/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState, FormEvent } from 'react';
import { AgriculturalParameters, fetchAgriculturalRecommendations } from '@/lib/maps-grounding';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AgriculturalFormProps {
  onSubmit?: (params: AgriculturalParameters) => void;
}

export default function AgriculturalForm({ onSubmit }: AgriculturalFormProps) {
  const [formData, setFormData] = useState<AgriculturalParameters>({
    latitude: 0,
    longitude: 0,
    soilType: 'loamy',
    climate: 'temperate',
    season: 'spring',
    rainfall: undefined,
    temperature: undefined,
    irrigationAvailable: undefined,
    farmSize: undefined,
    previousCrop: undefined,
  });

  const [showOptional, setShowOptional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof AgriculturalParameters, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.latitude || !formData.longitude) {
      setError('Please enter valid latitude and longitude coordinates');
      return;
    }

    if (formData.latitude < -90 || formData.latitude > 90) {
      setError('Latitude must be between -90 and 90 degrees');
      return;
    }

    if (formData.longitude < -180 || formData.longitude > 180) {
      setError('Longitude must be between -180 and 180 degrees');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResponse(null);

    try {
      // Call the agricultural recommendation API directly
      const result = await fetchAgriculturalRecommendations(formData);
      
      // Extract the text response from the API result
      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'No recommendations available';
      setResponse(responseText);

      // Call the optional onSubmit callback
      if (onSubmit) {
        onSubmit(formData);
      }
    } catch (error) {
      console.error('Error submitting agricultural form:', error);
      setError('Error getting recommendations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="agricultural-form">
      <div className="form-header">
        <h2>🌱 Agricultural Crop Recommendations</h2>
        <p>Get AI-powered crop recommendations based on your farm location and conditions.</p>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        {/* Location Section */}
        <div className="form-section">
          <h3>📍 Farm Location</h3>
          <div className="input-group">
            <div className="input-field">
              <label htmlFor="latitude">Latitude *</label>
              <input
                type="number"
                id="latitude"
                value={formData.latitude || ''}
                onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value) || 0)}
                placeholder="e.g., 40.7128"
                step="any"
                required
              />
            </div>
            <div className="input-field">
              <label htmlFor="longitude">Longitude *</label>
              <input
                type="number"
                id="longitude"
                value={formData.longitude || ''}
                onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value) || 0)}
                placeholder="e.g., -74.0060"
                step="any"
                required
              />
            </div>
          </div>
        </div>

        {/* Required Parameters */}
        <div className="form-section">
          <h3>🌍 Required Parameters</h3>
          <div className="input-group">
            <div className="input-field">
              <label htmlFor="soilType">Soil Type *</label>
              <select
                id="soilType"
                value={formData.soilType}
                onChange={(e) => handleInputChange('soilType', e.target.value)}
                required
              >
                <option value="clay">Clay</option>
                <option value="sandy">Sandy</option>
                <option value="loamy">Loamy</option>
                <option value="silt">Silt</option>
                <option value="peat">Peat</option>
              </select>
            </div>
            <div className="input-field">
              <label htmlFor="climate">Climate Zone *</label>
              <select
                id="climate"
                value={formData.climate}
                onChange={(e) => handleInputChange('climate', e.target.value)}
                required
              >
                <option value="tropical">Tropical</option>
                <option value="arid">Arid</option>
                <option value="temperate">Temperate</option>
                <option value="continental">Continental</option>
                <option value="polar">Polar</option>
              </select>
            </div>
            <div className="input-field">
              <label htmlFor="season">Season *</label>
              <select
                id="season"
                value={formData.season}
                onChange={(e) => handleInputChange('season', e.target.value)}
                required
              >
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Optional Parameters */}
        <div className="form-section">
          <button
            type="button"
            className="toggle-optional"
            onClick={() => setShowOptional(!showOptional)}
          >
            {showOptional ? '▼' : '▶'} Optional Parameters
          </button>
          
          {showOptional && (
            <div className="optional-params">
              <div className="input-group">
                <div className="input-field">
                  <label htmlFor="rainfall">Annual Rainfall (mm)</label>
                  <input
                    type="number"
                    id="rainfall"
                    value={formData.rainfall || ''}
                    onChange={(e) => handleInputChange('rainfall', parseFloat(e.target.value) || undefined)}
                    placeholder="e.g., 800"
                    min="0"
                  />
                </div>
                <div className="input-field">
                  <label htmlFor="temperature">Average Temperature (°C)</label>
                  <input
                    type="number"
                    id="temperature"
                    value={formData.temperature || ''}
                    onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || undefined)}
                    placeholder="e.g., 25"
                    step="any"
                  />
                </div>
                <div className="input-field">
                  <label htmlFor="farmSize">Farm Size (hectares)</label>
                  <input
                    type="number"
                    id="farmSize"
                    value={formData.farmSize || ''}
                    onChange={(e) => handleInputChange('farmSize', parseFloat(e.target.value) || undefined)}
                    placeholder="e.g., 10"
                    min="0"
                    step="any"
                  />
                </div>
              </div>
              <div className="input-group">
                <div className="input-field checkbox-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.irrigationAvailable || false}
                      onChange={(e) => handleInputChange('irrigationAvailable', e.target.checked)}
                    />
                    Irrigation Available
                  </label>
                </div>
                <div className="input-field">
                  <label htmlFor="previousCrop">Previous Crop</label>
                  <input
                    type="text"
                    id="previousCrop"
                    value={formData.previousCrop || ''}
                    onChange={(e) => handleInputChange('previousCrop', e.target.value || undefined)}
                    placeholder="e.g., Wheat, Corn, Rice"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Getting Recommendations...' : '🌾 Get Crop Recommendations'}
          </button>
          {error && (
            <p className="error-message" style={{ color: 'red', marginTop: '10px' }}>
              {error}
            </p>
          )}
        </div>
      </form>

      {/* Response Section */}
      {response && (
        <div className="recommendations-section" style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h3>🎯 Crop Recommendations</h3>
          <div className="recommendation-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {response}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
