"use client";
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Summary, SummaryResponse } from '@/types';
import { useSidebar } from '@/components/Sidebar/SidebarProvider';
import Analytics from '@/lib/analytics';
import { TranscriptPanel } from '@/components/MeetingDetails/TranscriptPanel';
import { SummaryPanel } from '@/components/MeetingDetails/SummaryPanel';
import { invoke as invokeTauri } from '@tauri-apps/api/core';
import { toast } from 'sonner';

// Custom hooks
import { useMeetingData } from '@/hooks/meeting-details/useMeetingData';
import { useSummaryGeneration } from '@/hooks/meeting-details/useSummaryGeneration';
import { useModelConfiguration } from '@/hooks/meeting-details/useModelConfiguration';
import { useTemplates } from '@/hooks/meeting-details/useTemplates';
import { useCopyOperations } from '@/hooks/meeting-details/useCopyOperations';
import { useMeetingOperations } from '@/hooks/meeting-details/useMeetingOperations';

export default function PageContent({
  meeting,
  summaryData,
  summaryProcessStatus = 'idle',
  summaryProcessError = null,
  onMeetingUpdated
}: {
  meeting: any;
  summaryData: Summary | null;
  summaryProcessStatus?: string;
  summaryProcessError?: string | null;
  onMeetingUpdated?: () => Promise<void>;
}) {
  console.log('📄 PAGE CONTENT: Initializing with data:', {
    meetingId: meeting.id,
    summaryDataKeys: summaryData ? Object.keys(summaryData) : null,
    transcriptsCount: meeting.transcripts?.length
  });

  // State
  const [customPrompt, setCustomPrompt] = useState<string>(() => meeting?.summary_prompt ?? '');
  const [isRecording] = useState(false);
  const [summaryResponse] = useState<SummaryResponse | null>(null);
  const lastSavedPromptRef = useRef<string>((meeting?.summary_prompt ?? '').trim());
  const hasShownPromptSaveErrorRef = useRef<boolean>(false);

  // Sidebar context
  const { serverAddress } = useSidebar();

  // Custom hooks
  const meetingData = useMeetingData({ meeting, summaryData, onMeetingUpdated });
  const modelConfig = useModelConfiguration({ serverAddress });
  const templates = useTemplates();

  const summaryGeneration = useSummaryGeneration({
    meeting,
    transcripts: meetingData.transcripts,
    modelConfig: modelConfig.modelConfig,
    isModelConfigLoading: modelConfig.isLoading,
    selectedTemplate: templates.selectedTemplate,
    onMeetingUpdated,
    updateMeetingTitle: meetingData.updateMeetingTitle,
    setAiSummary: meetingData.setAiSummary,
  });

  const resumeSummaryPolling = summaryGeneration.resumeSummaryPolling;

  // If a summary process is already running for this meeting, resume polling instead of starting a new one
  const resumedPollingForMeetingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!meeting?.id) return;
    if (resumedPollingForMeetingRef.current === meeting.id) return;
    if (meetingData.aiSummary) return;

    if (summaryProcessStatus === 'pending') {
      resumedPollingForMeetingRef.current = meeting.id;
      try {
        resumeSummaryPolling?.();
      } catch (error) {
        console.error('Failed to resume summary polling:', error);
        toast.error('Zusammenfassung konnte nicht geladen werden', { description: String(error) });
      }
      return;
    }

    if (summaryProcessStatus === 'failed' && summaryProcessError) {
      toast.error('Zusammenfassung fehlgeschlagen', { description: summaryProcessError });
      resumedPollingForMeetingRef.current = meeting.id;
    }
  }, [meeting?.id, meetingData.aiSummary, summaryProcessStatus, summaryProcessError, resumeSummaryPolling]);

  const copyOperations = useCopyOperations({
    meeting,
    transcripts: meetingData.transcripts,
    meetingTitle: meetingData.meetingTitle,
    aiSummary: meetingData.aiSummary,
    blockNoteSummaryRef: meetingData.blockNoteSummaryRef,
  });

  const meetingOperations = useMeetingOperations({
    meeting,
  });

  // Track page view
  useEffect(() => {
    Analytics.trackPageView('meeting_details');
  }, []);

  // Keep custom prompt in sync when switching meetings
  useEffect(() => {
    const promptFromMeeting = (meeting?.summary_prompt ?? '') as string;
    setCustomPrompt(promptFromMeeting);
    lastSavedPromptRef.current = promptFromMeeting.trim();
    hasShownPromptSaveErrorRef.current = false;
  }, [meeting?.id, meeting?.summary_prompt]);

  // Persist custom prompt per meeting (debounced)
  useEffect(() => {
    const meetingId = meeting?.id as string | undefined;
    if (!meetingId) return;

    const normalized = customPrompt.trim();
    if (normalized === lastSavedPromptRef.current) return;

    const timeout = setTimeout(async () => {
      try {
        await invokeTauri('api_save_meeting_summary_prompt', {
          meetingId,
          summaryPrompt: customPrompt,
        });
        lastSavedPromptRef.current = normalized;
        hasShownPromptSaveErrorRef.current = false;
      } catch (error) {
        console.error('Failed to save meeting summary prompt:', error);
        if (!hasShownPromptSaveErrorRef.current) {
          toast.error('KI-Anweisungen konnten nicht gespeichert werden', {
            description: String(error),
          });
          hasShownPromptSaveErrorRef.current = true;
        }
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [customPrompt, meeting?.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-screen bg-gray-50"
    >
      <div className="flex flex-1 overflow-hidden">
      

        <TranscriptPanel
          transcripts={meetingData.transcripts}
          customPrompt={customPrompt}
          onPromptChange={setCustomPrompt}
          onCopyTranscript={copyOperations.handleCopyTranscript}
          onOpenMeetingFolder={meetingOperations.handleOpenMeetingFolder}
          isRecording={isRecording}
        />

          <SummaryPanel
          meeting={meeting}
          meetingTitle={meetingData.meetingTitle}
          onTitleChange={meetingData.handleTitleChange}
          isEditingTitle={meetingData.isEditingTitle}
          onStartEditTitle={() => meetingData.setIsEditingTitle(true)}
          onFinishEditTitle={() => meetingData.setIsEditingTitle(false)}
          isTitleDirty={meetingData.isTitleDirty}
          summaryRef={meetingData.blockNoteSummaryRef}
          isSaving={meetingData.isSaving}
          onSaveAll={meetingData.saveAllChanges}
          onCopySummary={copyOperations.handleCopySummary}
          onOpenFolder={meetingOperations.handleOpenMeetingFolder}
          aiSummary={meetingData.aiSummary}
          summaryStatus={summaryGeneration.summaryStatus}
          transcripts={meetingData.transcripts}
          modelConfig={modelConfig.modelConfig}
          setModelConfig={modelConfig.setModelConfig}
          onSaveModelConfig={modelConfig.handleSaveModelConfig}
          onGenerateSummary={summaryGeneration.handleGenerateSummary}
          customPrompt={customPrompt}
          summaryResponse={summaryResponse}
          onSaveSummary={meetingData.handleSaveSummary}
          onSummaryChange={meetingData.handleSummaryChange}
          onDirtyChange={meetingData.setIsSummaryDirty}
          summaryError={summaryGeneration.summaryError}
          onRegenerateSummary={summaryGeneration.handleRegenerateSummary}
          getSummaryStatusMessage={summaryGeneration.getSummaryStatusMessage}
          availableTemplates={templates.availableTemplates}
          selectedTemplate={templates.selectedTemplate}
          onTemplateSelect={templates.handleTemplateSelection}
          isModelConfigLoading={modelConfig.isLoading}
        />

      </div>
    </motion.div>
  );
}
