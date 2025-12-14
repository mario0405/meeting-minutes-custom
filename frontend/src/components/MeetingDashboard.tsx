'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AlertCircle, CheckCircle2, Circle, Clock, ListChecks, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

type DashboardTask = {
  id: string;
  description: string;
  status: 'Erledigt' | 'Offen';
  due?: string;
};

type DashboardMeeting = {
  id: string;
  title: string;
  summaryStatus: string;
  tasks: DashboardTask[];
};

// Storage key for completed tasks
const COMPLETED_TASKS_KEY = 'protocolito-completed-tasks';

const ACTION_SECTION_TITLES = [
  'Aufgaben',
  'Action Items',
  'Nächste Schritte',
  'Tasks'
];

function extractTasksFromMarkdown(markdown: string, meetingId: string): DashboardTask[] {
  if (!markdown) return [];

  const normalized = markdown.replace(/\r\n/g, '\n');
  let sectionContent = '';

  // Try to locate the action items section using German or legacy English titles
  for (const title of ACTION_SECTION_TITLES) {
    const regex = new RegExp(`\\*\\*${title}\\*\\*\\s*\\n+([\\s\\S]*?)(?=\\n\\*\\*[^\\n]+\\*\\*|$)`, 'i');
    const match = normalized.match(regex);
    if (match && match[1]) {
      sectionContent = match[1];
      break;
    }
  }

  if (!sectionContent) {
    // Fallback: try heading style sections
    for (const title of ACTION_SECTION_TITLES) {
      const regex = new RegExp(`#\\s*${title}\\s*\\n+([\\s\\S]*?)(?=\\n#|$)`, 'i');
      const match = normalized.match(regex);
      if (match && match[1]) {
        sectionContent = match[1];
        break;
      }
    }
  }

  if (!sectionContent) return [];

  const lines = sectionContent
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const tasks: DashboardTask[] = [];

  lines.forEach((line, idx) => {
    // Skip markdown table separators
    if (/^\|\s*-/.test(line)) return;

    const status = /\[x\]/i.test(line) ? 'Erledigt' : 'Offen';

    if (line.startsWith('|')) {
      const cols = line
        .split('|')
        .map(col => col.trim())
        .filter(Boolean);

      // Skip table header rows
      const normalizedCols = cols
        .map(col => col.replace(/\*/g, '').toLowerCase())
        .map(col => col.replace(/\s+/g, ' ').trim());
      const isHeaderRow =
        normalizedCols.some(col => col.includes('verantwortlich')) &&
        normalizedCols.some(col => col.includes('aufgabe') || col.includes('task'));
      if (isHeaderRow) return;

      const description = cols[1] || cols[0];
      const due = cols[2];

      if (description) {
        tasks.push({
          id: `${meetingId}-table-${idx}`,
          description,
          due,
          status
        });
      }
      return;
    }

    const cleaned = line
      .replace(/^[\-\*\d\.\s]+/, '')
      .replace(/\[[ xX]\]\s*/, '')
      .trim();

    if (cleaned) {
      tasks.push({
        id: `${meetingId}-line-${idx}`,
        description: cleaned,
        status
      });
    }
  });

  return tasks;
}

function summaryStatusBadge(status: string) {
  const normalized = status?.toLowerCase() || 'unbekannt';
  const map: Record<string, { label: string; className: string }> = {
    completed: { label: 'Fertig', className: 'bg-green-100 text-green-700' },
    processing: { label: 'In Arbeit', className: 'bg-blue-100 text-blue-700' },
    summarizing: { label: 'In Arbeit', className: 'bg-blue-100 text-blue-700' },
    regenerating: { label: 'Erneut', className: 'bg-blue-100 text-blue-700' },
    pending: { label: 'Ausstehend', className: 'bg-amber-100 text-amber-700' },
    idle: { label: 'Keine Zusammenfassung', className: 'bg-gray-100 text-gray-700' },
    failed: { label: 'Fehlgeschlagen', className: 'bg-red-100 text-red-700' },
    error: { label: 'Fehler', className: 'bg-red-100 text-red-700' },
  };

  const fallback = { label: normalized, className: 'bg-gray-100 text-gray-700' };
  return map[normalized] ?? fallback;
}

const MeetingDashboard: React.FC = () => {
  const [meetings, setMeetings] = useState<DashboardMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  // Load completed tasks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COMPLETED_TASKS_KEY);
      if (stored) {
        setCompletedTasks(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error('Failed to load completed tasks from localStorage:', err);
    }
  }, []);

  // Save completed tasks to localStorage whenever they change
  const saveCompletedTasks = useCallback((tasks: Set<string>) => {
    try {
      localStorage.setItem(COMPLETED_TASKS_KEY, JSON.stringify([...tasks]));
    } catch (err) {
      console.error('Failed to save completed tasks to localStorage:', err);
    }
  }, []);

  // Toggle task completion status
  const toggleTaskCompletion = useCallback((taskId: string) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      saveCompletedTasks(newSet);
      return newSet;
    });
  }, [saveCompletedTasks]);

  // Check if a task is completed (either from markdown or manually toggled)
  const isTaskCompleted = useCallback((task: DashboardTask) => {
    return completedTasks.has(task.id) || task.status === 'Erledigt';
  }, [completedTasks]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const meetingList = await invoke<Array<{ id: string; title: string }>>('api_get_meetings');

      const meetingWithTasks = await Promise.all(
        meetingList.map(async (meeting) => {
          try {
            const summary = await invoke<any>('api_get_summary', { meetingId: meeting.id });
            const markdown = typeof summary?.data?.markdown === 'string' ? summary.data.markdown : '';
            const tasks = markdown ? extractTasksFromMarkdown(markdown, meeting.id) : [];

            return {
              id: meeting.id,
              title: meeting.title,
              summaryStatus: summary?.status ?? 'idle',
              tasks
            };
          } catch (err) {
            console.error(`Failed to load summary for meeting ${meeting.id}:`, err);
            return {
              id: meeting.id,
              title: meeting.title,
              summaryStatus: 'error',
              tasks: []
            };
          }
        })
      );

      setMeetings(meetingWithTasks);
    } catch (err) {
      console.error('Failed to load meeting dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden der Meetings');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalTasks = useMemo(
    () => meetings.reduce((acc, meeting) => acc + meeting.tasks.length, 0),
    [meetings]
  );

  const completedTasksCount = useMemo(() => {
    let count = 0;
    meetings.forEach(meeting => {
      meeting.tasks.forEach(task => {
        if (completedTasks.has(task.id) || task.status === 'Erledigt') {
          count++;
        }
      });
    });
    return count;
  }, [meetings, completedTasks]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Lade Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col space-y-6 px-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Meeting-Aufgaben</h2>
          <p className="text-sm text-gray-600">
            Überblick über alle aufgezeichneten Meetings und erkannte Aufgaben.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            <CheckCircle2 className="mr-1 inline h-4 w-4 text-green-600" />
            {completedTasksCount}/{totalTasks} erledigt
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRefreshing(true);
              loadData();
            }}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-4 lg:grid-cols-2">
        {meetings.map((meeting) => {
          const badge = summaryStatusBadge(meeting.summaryStatus);
          return (
            <div key={meeting.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Meeting</p>
                  <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                {meeting.tasks.length > 0 
                  ? `${meeting.tasks.filter(t => isTaskCompleted(t)).length}/${meeting.tasks.length} Aufgaben erledigt` 
                  : 'Keine Aufgaben gefunden'}
              </div>

              <div className="mt-4 space-y-2">
                {meeting.tasks.length === 0 ? (
                  <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Noch keine Aufgaben im Protokoll gefunden.
                  </div>
                ) : (
                  meeting.tasks.map((task) => {
                    const completed = isTaskCompleted(task);
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start justify-between rounded-md border px-3 py-2 transition-colors ${
                          completed
                            ? 'border-green-100 bg-green-50/50'
                            : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleTaskCompletion(task.id)}
                            className="mt-0.5 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full transition-transform hover:scale-110"
                            title={completed ? 'Als offen markieren' : 'Als erledigt markieren'}
                          >
                            {completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 cursor-pointer" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-pointer" />
                            )}
                          </button>
                          <div>
                            <p className={`text-sm ${completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                              {task.description}
                            </p>
                            {task.due && (
                              <p className="text-xs text-gray-600">
                                Fällig bis: <span className="font-medium">{task.due}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                            completed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {completed ? 'Erledigt' : 'Offen'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MeetingDashboard;
