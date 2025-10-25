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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GenAILiveClient } from '../lib/genai-live-client';
import { LiveConnectConfig, LiveServerToolCall } from '@google/genai';
import { useLogStore, useMapStore, useSettings } from '@/lib/state';
import { GenerateContentResponse, GroundingChunk } from '@google/genai';
import { ToolContext, toolRegistry } from '@/lib/tools/tool-registry';

export type UseLiveApiResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;
  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  heldGroundingChunks: GroundingChunk[] | undefined;
  clearHeldGroundingChunks: () => void;
  heldGroundedResponse: GenerateContentResponse | undefined;
  clearHeldGroundedResponse: () => void;
};

export function useLiveApi({
  apiKey,
  map,
  placesLib,
  elevationLib,
  geocoder,
  padding,
}: {
  apiKey: string;
  map: google.maps.maps3d.Map3DElement | null;
  placesLib: google.maps.PlacesLibrary | null;
  elevationLib: google.maps.ElevationLibrary | null;
  geocoder: google.maps.Geocoder | null;
  padding: [number, number, number, number];
}): UseLiveApiResults {
  const { model } = useSettings();
  const client = useMemo(() => new GenAILiveClient(apiKey, model), [apiKey, model]);

  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConnectConfig>({});
  const [heldGroundingChunks, setHeldGroundingChunks] = useState<
    GroundingChunk[] | undefined
  >(undefined);
  const [heldGroundedResponse, setHeldGroundedResponse] = useState<
    GenerateContentResponse | undefined
  >(undefined);

  const clearHeldGroundingChunks = useCallback(() => {
    setHeldGroundingChunks(undefined);
  }, []);

  const clearHeldGroundedResponse = useCallback(() => {
    setHeldGroundedResponse(undefined);
  }, []);


  // This effect sets up the main event listeners for the GenAILiveClient.
  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
    };

    const onSetupComplete = () => {
      client.sendRealtimeText('hello');
    };

    const onClose = (event: CloseEvent) => {
      setConnected(false);
      let reason = "Session ended. Press 'Play' to start a new session. "+ event.reason;
      useLogStore.getState().addTurn({
        role: 'agent',
        text: reason,
        isFinal: true,
      });
    };


    const onInterrupted = () => {
      const { updateLastTurn, turns } = useLogStore.getState();
      const lastTurn = turns[turns.length - 1];
      if (lastTurn && !lastTurn.isFinal) {
        updateLastTurn({ isFinal: true });
      }
    };
    
    const onGenerationComplete = () => {
    };

    client.on('open', onOpen);
    client.on('setupcomplete', onSetupComplete);
    client.on('close', onClose);
    client.on('interrupted', onInterrupted);
    client.on('generationcomplete', onGenerationComplete);

    const onToolCall = async (toolCall: LiveServerToolCall) => {
      useLogStore.getState().setIsAwaitingFunctionResponse(true);
      try {
        const functionResponses: any[] = [];
        const toolContext: ToolContext = {
          map,
          placesLib,
          elevationLib,
          geocoder,
          padding,
          setHeldGroundedResponse,
          setHeldGroundingChunks,
        };

        for (const fc of toolCall.functionCalls) {
          const triggerMessage = `Triggering function call: **${
            fc.name
          }**\n\`\`\`json\n${JSON.stringify(fc.args, null, 2)}\n\`\`\``;
          useLogStore.getState().addTurn({
            role: 'system',
            text: triggerMessage,
            isFinal: true,
          });

          let toolResponse: GenerateContentResponse | string = 'ok';
          try {
            const toolImplementation = toolRegistry[fc.name];
            if (toolImplementation) {
              toolResponse = await toolImplementation(fc.args, toolContext);
            } else {
              toolResponse = `Unknown tool called: ${fc.name}.`;
              console.warn(toolResponse);
            }

            functionResponses.push({
              id: fc.id,
              name: fc.name,
              response: { result: toolResponse },
            });
          } catch (error) {
            const errorMessage = `Error executing tool ${fc.name}.`;
            console.error(errorMessage, error);
            useLogStore.getState().addTurn({
              role: 'system',
              text: errorMessage,
              isFinal: true,
            });
            functionResponses.push({
              id: fc.id,
              name: fc.name,
              response: { result: errorMessage },
            });
          }
        }

        if (functionResponses.length > 0) {
          const responseMessage = `Function call response:\n\`\`\`json\n${JSON.stringify(
            functionResponses,
            null,
            2,
          )}\n\`\`\``;
          useLogStore.getState().addTurn({
            role: 'system',
            text: responseMessage,
            isFinal: true,
          });
        }

        client.sendToolResponse({ functionResponses: functionResponses });
      } finally {
        useLogStore.getState().setIsAwaitingFunctionResponse(false);
      }
    };

    client.on('toolcall', onToolCall);

    return () => {
      client.off('open', onOpen);
      client.off('setupcomplete', onSetupComplete);
      client.off('close', onClose);
      client.off('interrupted', onInterrupted);
      client.off('toolcall', onToolCall);
      client.off('generationcomplete', onGenerationComplete);
    };
  }, [client, map, placesLib, elevationLib, geocoder, padding, setHeldGroundedResponse, setHeldGroundingChunks]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error('config has not been set');
    }
    useLogStore.getState().clearTurns();
    useMapStore.getState().clearMarkers();
    client.disconnect();
    await client.connect(config);
  }, [client, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connect,
    connected,
    disconnect,
    heldGroundingChunks,
    clearHeldGroundingChunks,
    heldGroundedResponse,
    clearHeldGroundedResponse,
  };
}
