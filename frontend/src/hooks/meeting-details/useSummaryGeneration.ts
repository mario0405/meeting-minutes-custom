import { useState, useCallback } from 'react';
import { Transcript, Summary } from '@/types';
import { ModelConfig } from '@/components/ModelSettingsModal';
import { CurrentMeeting, useSidebar } from '@/components/Sidebar/SidebarProvider';
import { invoke as invokeTauri } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import Analytics from '@/lib/analytics';

type SummaryStatus = 'idle' | 'processing' | 'summarizing' | 'regenerating' | 'completed' | 'error';

interface UseSummaryGenerationProps {
  meeting: any;
  transcripts: Transcript[];
  modelConfig: ModelConfig;
  isModelConfigLoading: boolean;
  selectedTemplate: string;
  onMeetingUpdated?: () => Promise<void>;
  updateMeetingTitle: (title: string) => void;
  setAiSummary: (summary: Summary | null) => void;
}

export function useSummaryGeneration({
  meeting,
  transcripts,
  modelConfig,
  isModelConfigLoading,
  selectedTemplate,
  onMeetingUpdated,
  updateMeetingTitle,
  setAiSummary,
}: UseSummaryGenerationProps) {
  const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>('idle');
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [originalTranscript, setOriginalTranscript] = useState<string>('');

  const { startSummaryPolling } = useSidebar();

  // Helper to get status message
  const getSummaryStatusMessage = useCallback((status: SummaryStatus) => {
    switch (status) {
      case 'processing':
        return 'Transkript wird verarbeitet…';
      case 'summarizing':
        return 'Zusammenfassung wird erstellt…';
      case 'regenerating':
        return 'Zusammenfassung wird neu erstellt…';
      case 'completed':
        return 'Zusammenfassung fertig';
      case 'error':
        return 'Fehler beim Erstellen der Zusammenfassung';
      default:
        return '';
    }
  }, []);

  // Unified summary processing logic
  const processSummary = useCallback(async ({
    transcriptText,
    customPrompt = '',
    isRegeneration = false,
  }: {
    transcriptText: string;
    customPrompt?: string;
    isRegeneration?: boolean;
  }) => {
    setSummaryStatus(isRegeneration ? 'regenerating' : 'processing');
    setSummaryError(null);

    try {
      if (!transcriptText.trim()) {
        throw new Error('Kein Transkripttext verfügbar. Bitte füge zuerst Text hinzu.');
      }

      if (!isRegeneration) {
        setOriginalTranscript(transcriptText);
      }

      console.log('Processing transcript with template:', selectedTemplate);

      // Calculate time since recording
      const timeSinceRecording = (Date.now() - new Date(meeting.created_at).getTime()) / 60000; // minutes

      // Track summary generation started
      await Analytics.trackSummaryGenerationStarted(
        modelConfig.provider,
        modelConfig.model,
        transcriptText.length,
        timeSinceRecording
      );

      // Track custom prompt usage if present
      if (customPrompt.trim().length > 0) {
        await Analytics.trackCustomPromptUsed(customPrompt.trim().length);
      }

      // Process transcript and get process_id
      const result = await invokeTauri('api_process_transcript', {
        text: transcriptText,
        model: modelConfig.provider,
        modelName: modelConfig.model,
        meetingId: meeting.id,
        chunkSize: 40000,
        overlap: 1000,
        customPrompt: customPrompt,
        templateId: selectedTemplate,
      }) as any;

      const process_id = result.process_id;
      console.log('Process ID:', process_id);

      // Start global polling via context
      startSummaryPolling(meeting.id, process_id, async (pollingResult) => {
        console.log('Summary status:', pollingResult);

        // Handle errors
        if (pollingResult.status === 'error' || pollingResult.status === 'failed') {
          console.error('Backend returned error:', pollingResult.error);
          const errorMessage =
            pollingResult.error ||
            `Zusammenfassung ${isRegeneration ? 'konnte nicht neu erstellt' : 'konnte nicht erstellt'} werden`;
          setSummaryError(errorMessage);
          setSummaryStatus('error');

          toast.error(`Zusammenfassung ${isRegeneration ? 'konnte nicht neu erstellt' : 'konnte nicht erstellt'} werden`, {
            description: errorMessage.includes('Connection refused')
              ? 'Keine Verbindung zum LLM-Dienst. Bitte stelle sicher, dass Ollama oder dein konfigurierter LLM-Anbieter läuft.'
              : errorMessage,
          });

          await Analytics.trackSummaryGenerationCompleted(
            modelConfig.provider,
            modelConfig.model,
            false,
            undefined,
            errorMessage
          );
          return;
        }

        // Handle successful completion
        if (pollingResult.status === 'completed' && pollingResult.data) {
          console.log('✅ Summary generation completed:', pollingResult.data);

          // Update meeting title if available
          const meetingName = pollingResult.data.MeetingName || pollingResult.meetingName;
          if (meetingName) {
            updateMeetingTitle(meetingName);
          }

          // Check if backend returned markdown format (new flow)
          if (pollingResult.data.markdown) {
            console.log('📝 Received markdown format from backend');
            setAiSummary({ markdown: pollingResult.data.markdown } as any);
            setSummaryStatus('completed');

            if (meetingName && onMeetingUpdated) {
              await onMeetingUpdated();
            }

            await Analytics.trackSummaryGenerationCompleted(
              modelConfig.provider,
              modelConfig.model,
              true
            );
            return;
          }

          // Legacy format handling
          const summarySections = Object.entries(pollingResult.data).filter(([key]) => key !== 'MeetingName');
          const allEmpty = summarySections.every(([, section]) => !(section as any).blocks || (section as any).blocks.length === 0);

          if (allEmpty) {
            console.error('Summary completed but all sections empty');
            setSummaryError('Die Zusammenfassung wurde erstellt, enthält aber keinen Inhalt.');
            setSummaryStatus('error');

            await Analytics.trackSummaryGenerationCompleted(
              modelConfig.provider,
              modelConfig.model,
              false,
              undefined,
              'Leere Zusammenfassung erstellt'
            );
            return;
          }

          // Remove MeetingName from data before formatting
          const { MeetingName, ...summaryData } = pollingResult.data;

          // Format legacy summary data
          const formattedSummary: Summary = {};
          const sectionKeys = pollingResult.data._section_order || Object.keys(summaryData);

          for (const key of sectionKeys) {
            try {
              const section = summaryData[key];
              if (section && typeof section === 'object' && 'title' in section && 'blocks' in section) {
                const typedSection = section as { title?: string; blocks?: any[] };

                if (Array.isArray(typedSection.blocks)) {
                  formattedSummary[key] = {
                    title: typedSection.title || key,
                    blocks: typedSection.blocks.map((block: any) => ({
                      ...block,
                      color: 'default',
                      content: block?.content?.trim() || ''
                    }))
                  };
                } else {
                  formattedSummary[key] = {
                    title: typedSection.title || key,
                    blocks: []
                  };
                }
              }
            } catch (error) {
              console.warn(`Error processing section ${key}:`, error);
            }
          }

          setAiSummary(formattedSummary);
          setSummaryStatus('completed');

          await Analytics.trackSummaryGenerationCompleted(
            modelConfig.provider,
            modelConfig.model,
            true
          );

          if (meetingName && onMeetingUpdated) {
            await onMeetingUpdated();
          }
        }
      });
    } catch (error) {
      console.error(`Failed to ${isRegeneration ? 'regenerate' : 'generate'} summary:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setSummaryError(errorMessage);
      setSummaryStatus('error');
      if (isRegeneration) {
        setAiSummary(null);
      }

      toast.error(`Zusammenfassung ${isRegeneration ? 'konnte nicht neu erstellt' : 'konnte nicht erstellt'} werden`, {
        description: errorMessage,
      });

      await Analytics.trackSummaryGenerationCompleted(
        modelConfig.provider,
        modelConfig.model,
        false,
        undefined,
        errorMessage
      );
    }
  }, [
    meeting.id,
    meeting.created_at,
    modelConfig,
    selectedTemplate,
    startSummaryPolling,
    setAiSummary,
    updateMeetingTitle,
    onMeetingUpdated,
  ]);

  // Public API: Generate summary from transcripts
  const handleGenerateSummary = useCallback(async (customPrompt: string = '') => {
    // Check if model config is still loading
    if (isModelConfigLoading) {
      console.log('⏳ Model configuration is still loading, please wait...');
      toast.info('Modellkonfiguration wird geladen, bitte warten…');
      return;
    }

    if (!transcripts.length) {
      const error_msg = 'Keine Transkripte für die Zusammenfassung vorhanden';
      console.log(error_msg);
      toast.error(error_msg);
      return;
    }

    console.log('🚀 Starting summary generation with config:', {
      provider: modelConfig.provider,
      model: modelConfig.model,
      template: selectedTemplate
    });

    // Check if Ollama provider has models available
    if (modelConfig.provider === 'ollama') {
      try {
        const endpoint = modelConfig.ollamaEndpoint || null;
        const models = await invokeTauri('get_ollama_models', { endpoint }) as any[];

        if (!models || models.length === 0) {
          toast.error(
            'Keine Ollama-Modelle gefunden. Bitte lade ein Modell (z. B. gemma3:1b) in den Modell-Einstellungen herunter.',
            { duration: 5000 }
          );
          return;
        }
      } catch (error) {
        console.error('Error checking Ollama models:', error);
        toast.error(
          'Ollama-Modelle konnten nicht geprüft werden. Bitte stelle sicher, dass Ollama läuft, und lade ein Modell in den Einstellungen herunter.',
          { duration: 5000 }
        );
        return;
      }
    }

    const fullTranscript = transcripts.map(t => t.text).join('\n');
    await processSummary({ transcriptText: fullTranscript, customPrompt });
  }, [transcripts, processSummary, modelConfig, isModelConfigLoading, selectedTemplate]);

  // Public API: Regenerate summary from original transcript
  const handleRegenerateSummary = useCallback(async (customPrompt: string = '') => {
    const transcriptText = originalTranscript.trim() || transcripts.map(t => t.text).join('\n').trim();
    if (!transcriptText) {
      console.error('No transcript available for regeneration');
      toast.error('Kein Transkript für die Neuerstellung verfügbar');
      return;
    }

    await processSummary({
      transcriptText,
      customPrompt,
      isRegeneration: true
    });
  }, [originalTranscript, transcripts, processSummary]);

  // Resume polling for an already-running summary process without starting a new one
  const resumeSummaryPolling = useCallback(async () => {
    setSummaryStatus('summarizing');
    setSummaryError(null);

    startSummaryPolling(meeting.id, meeting.id, async (pollingResult) => {
      if (pollingResult.status === 'error' || pollingResult.status === 'failed') {
        const errorMessage =
          pollingResult.error ||
          'Zusammenfassung konnte nicht erstellt werden';
        setSummaryError(errorMessage);
        setSummaryStatus('error');
        toast.error('Zusammenfassung konnte nicht erstellt werden', { description: errorMessage });
        return;
      }

      if (pollingResult.status === 'completed' && pollingResult.data) {
        const meetingName = pollingResult.data.MeetingName || pollingResult.meetingName;
        if (meetingName) {
          updateMeetingTitle(meetingName);
        }

        if (pollingResult.data.markdown) {
          setAiSummary({ markdown: pollingResult.data.markdown } as any);
          setSummaryStatus('completed');
          if (meetingName && onMeetingUpdated) {
            await onMeetingUpdated();
          }
          return;
        }

        // Legacy format handling
        const summarySections = Object.entries(pollingResult.data).filter(([key]) => key !== 'MeetingName');
        const allEmpty = summarySections.every(([, section]) => !(section as any).blocks || (section as any).blocks.length === 0);

        if (allEmpty) {
          setSummaryError('Die Zusammenfassung wurde erstellt, enthält aber keinen Inhalt.');
          setSummaryStatus('error');
          return;
        }

        const { MeetingName, ...summaryData } = pollingResult.data;
        const formattedSummary: Summary = {};
        const sectionKeys = pollingResult.data._section_order || Object.keys(summaryData);

        for (const key of sectionKeys) {
          try {
            const section = summaryData[key];
            if (section && typeof section === 'object' && 'title' in section && 'blocks' in section) {
              const typedSection = section as { title?: string; blocks?: any[] };

              if (Array.isArray(typedSection.blocks)) {
                formattedSummary[key] = {
                  title: typedSection.title || key,
                  blocks: typedSection.blocks.map((block: any) => ({
                    ...block,
                    color: 'default',
                    content: block?.content?.trim() || ''
                  }))
                };
              } else {
                formattedSummary[key] = {
                  title: typedSection.title || key,
                  blocks: []
                };
              }
            }
          } catch (error) {
            console.warn(`Error processing section ${key}:`, error);
          }
        }

        setAiSummary(formattedSummary);
        setSummaryStatus('completed');

        if (meetingName && onMeetingUpdated) {
          await onMeetingUpdated();
        }
      }
    });
  }, [meeting.id, startSummaryPolling, updateMeetingTitle, setAiSummary, onMeetingUpdated]);

  return {
    summaryStatus,
    summaryError,
    handleGenerateSummary,
    handleRegenerateSummary,
    resumeSummaryPolling,
    getSummaryStatusMessage,
  };
}
