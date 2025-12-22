import React from "react";
import Image from 'next/image';

export function About() {
    return (
        <div className="p-4 space-y-4 h-[80vh] overflow-y-auto">
            {/* Compact Header */}
            <div className="text-center">
                <div className="mb-3">
                    <Image 
                        src="icon_128x128.png" 
                        alt="Protocolito-Logo" 
                        width={64} 
                        height={64}
                        className="mx-auto"
                    />
                </div>
                {/* <h1 className="text-xl font-bold text-gray-900">Protocolito</h1> */}
                <span className="text-sm text-gray-500">v0.1.18 – Beta version</span>
                <p className="text-medium text-gray-600 mt-1">
                    Echtzeit-Notizen und Zusammenfassungen – alles bleibt auf deinem Gerät.
                </p>
            </div>

            {/* Features Grid - Compact */}
            <div className="space-y-3">
                <h2 className="text-base font-semibold text-gray-800">Was Protocolito besonders macht</h2>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded p-3 hover:bg-gray-100 transition-colors">
                        <h3 className="font-bold text-sm text-gray-900 mb-1">Datenschutz an erster Stelle</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">Deine Daten und die KI-Verarbeitung bleiben in deiner Umgebung. Keine Cloud, keine Leaks.</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3 hover:bg-gray-100 transition-colors">
                        <h3 className="font-bold text-sm text-gray-900 mb-1">Beliebige Modelle nutzen</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">Lieber ein lokales Open‑Source‑Modell? Super. Externe API anbinden? Geht auch. Kein Lock‑in.</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3 hover:bg-gray-100 transition-colors">
                        <h3 className="font-bold text-sm text-gray-900 mb-1">Kostenbewusst</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">Vermeide Minuten-Abrechnung, indem du Modelle lokal ausführst (oder zahle nur für die Aufrufe, die du wirklich nutzt).</p>
                    </div>
                    <div className="bg-gray-50 rounded p-3 hover:bg-gray-100 transition-colors">
                        <h3 className="font-bold text-sm text-gray-900 mb-1">Funktioniert überall</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">Google Meet, Zoom, Microsoft Teams – online oder offline.</p>
                    </div>
                </div>
            </div>

            {/* Coming Soon - Compact */}
            <div className="bg-blue-50 rounded p-3">
                <p className="text-s text-blue-800">
                    <span className="font-bold">Demnächst:</span> Zugriff auf OpenAI's Whisper Modellen via API; Zugriff auf die neusten OpenAI Modelle (gpt-5.1 &amp; 5.2), weitere Verbesserungen der Qualität der Zusammenfassungen;
                </p>
            </div>
        </div>

    )
}
