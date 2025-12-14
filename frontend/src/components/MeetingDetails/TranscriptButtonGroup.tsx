"use client";

import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Copy, FolderOpen } from 'lucide-react';
import Analytics from '@/lib/analytics';


interface TranscriptButtonGroupProps {
  transcriptCount: number;
  onCopyTranscript: () => void;
  onOpenMeetingFolder: () => Promise<void>;
}


export function TranscriptButtonGroup({
  transcriptCount,
  onCopyTranscript,
  onOpenMeetingFolder
}: TranscriptButtonGroupProps) {
  return (
    <div className="flex items-center justify-center w-full gap-2">
      <ButtonGroup>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            Analytics.trackButtonClick('copy_transcript', 'meeting_details');
            onCopyTranscript();
          }}
          disabled={transcriptCount === 0}
          title={transcriptCount === 0 ? 'Kein Transkript verfügbar' : 'Transkript kopieren'}
        >
          <Copy />
          <span className="hidden lg:inline">Kopieren</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="xl:px-4"
          onClick={() => {
            Analytics.trackButtonClick('open_recording_folder', 'meeting_details');
            onOpenMeetingFolder();
          }}
          title="Aufnahmeordner öffnen"
        >
          <FolderOpen className="xl:mr-2" size={18} />
          <span className="hidden lg:inline">Aufnahme</span>
        </Button>
      </ButtonGroup>
    </div>
  );
}
