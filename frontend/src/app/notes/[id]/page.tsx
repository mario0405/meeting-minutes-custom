import React from 'react';
import { Clock, Users, Calendar, Tag } from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

interface Note {
  title: string;
  date: string;
  time?: string;
  attendees?: string[];
  tags: string[];
  content: string;
}

export function generateStaticParams() {
  // Return all possible note IDs
  return [
    { id: 'team-sync-dec-26' },
    { id: 'product-review' },
    { id: 'project-ideas' },
    { id: 'action-items' }
  ];
}

const NotePage = ({ params }: PageProps) => {
  // This would normally come from your database
  const sampleData: Record<string, Note> = {
    'team-sync-dec-26': {
      title: 'Team-Abstimmung – 26. Dez',
      date: '2024-12-26',
      time: '10:00 – 11:00',
      attendees: ['John Doe', 'Jane Smith', 'Mike Johnson'],
      tags: ['Team-Abstimmung', 'Wöchentlich', 'Produkt'],
      content: `
# Meeting-Zusammenfassung
Team-Abstimmung zu den Zielen für Q1 2024 und dem aktuellen Projektstatus.

## Agenda
1. Projekt-Statusupdates
2. Planung Q1 2024
3. Team-Themen & Feedback

## Wichtige Entscheidungen
- Mobile-App-Entwicklung für Q1 priorisiert
- Wöchentliche Design-Reviews geplant
- Zwei neue Features in die Roadmap aufgenommen

## Aufgaben
- [ ] John: Projekt-Zeitplan erstellen
- [ ] Jane: Design-Review-Meetings terminieren
- [ ] Mike: Dokumentation aktualisieren

## Notizen
- Aktuelle Projekt-Engpässe besprochen
- Kundenfeedback aus dem letzten Release geprüft
- Ressourcenplanung für den nächsten Sprint vorgenommen
      `
    },
    'product-review': {
      title: 'Produkt-Review',
      date: '2024-12-26',
      time: '14:00 – 15:00',
      attendees: ['Sarah Wilson', 'Tom Brown', 'Alex Chen'],
      tags: ['Produkt', 'Review', 'Quartal'],
      content: `
# Produkt-Review-Meeting

## Überblick
Quartalsweises Produkt-Review mit Stakeholdern.

## Diskussionsthemen
1. Rückblick auf die Performance in Q4
2. Feature-Priorisierung
3. Analyse von Kundenfeedback

## Aufgaben
- [ ] Produkt-Roadmap aktualisieren
- [ ] User-Research-Sessions planen
- [ ] Wettbewerbsanalyse prüfen
      `
    },
    'project-ideas': {
      title: 'Projekt-Ideen',
      date: '2024-12-26',
      tags: ['Ideen', 'Planung'],
      content: `
# Projekt-Ideen

## Neue Features
1. KI-gestützte Meeting-Zusammenfassungen
2. Kalender-Integration
3. Team-Kollaborationstools

## Verbesserungen
- Verbesserte Suchfunktion
- Bessere Notiz-Organisation
- Echtzeit-Zusammenarbeit
      `
    },
    'action-items': {
      title: 'Aufgaben',
      date: '2024-12-26',
      tags: ['Aufgaben', 'To-do', 'Planung'],
      content: `
# Aufgaben

## Hohe Priorität
- [ ] v2.0 in Produktion deployen
- [ ] Kritische Sicherheitsprobleme beheben
- [ ] Nutzerdokumentation fertigstellen

## Mittlere Priorität
- [ ] Abhängigkeiten aktualisieren
- [ ] Fehler-Tracking implementieren
- [ ] Unit-Tests ergänzen

## Niedrige Priorität
- [ ] Legacy-Code refaktorieren
- [ ] Code-Dokumentation verbessern
- [ ] Entwicklungsrichtlinien aufsetzen
      `
    }
  };

  const note = sampleData[params.id as keyof typeof sampleData];

  if (!note) {
    return <div className="p-8">Notiz nicht gefunden</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{note.title}</h1>
        
        <div className="flex flex-wrap gap-4 text-gray-600">
          {note.date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{note.date}</span>
            </div>
          )}
          
          {note.time && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{note.time}</span>
            </div>
          )}
          
          {note.attendees && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{note.attendees.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {note.tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
              <Tag className="w-3 h-3" />
              {tag}
            </div>
          ))}
        </div>
      </div>

      <div className="prose prose-blue max-w-none">
        <div dangerouslySetInnerHTML={{ __html: note.content.split('\n').map(line => {
          if (line.startsWith('# ')) {
            return `<h1>${line.slice(2)}</h1>`;
          } else if (line.startsWith('## ')) {
            return `<h2>${line.slice(3)}</h2>`;
          } else if (line.startsWith('- ')) {
            return `<li>${line.slice(2)}</li>`;
          }
          return line;
        }).join('\n') }} />
      </div>
    </div>
  );
};

export default NotePage;
