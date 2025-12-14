import React from "react";
import { invoke } from '@tauri-apps/api/core';
import Image from 'next/image';
import AnalyticsConsentSwitch from "./AnalyticsConsentSwitch";


export function About() {
    const handleContactClick = async () => {
        try {
            await invoke('open_external_url', { url: 'https://meetily.zackriya.com/#about' });
        } catch (error) {
            console.error('Link konnte nicht geöffnet werden:', error);
        }
    };

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
                <span className="text-sm text-gray-500">v0.1.1 – Vorabversion</span>
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
                    <span className="font-bold">Demnächst:</span> Eine Bibliothek von On‑Device‑KI‑Agenten – automatisiert Follow‑ups, Aufgaben-Tracking und mehr.
                </p>
            </div>

            {/* CTA Section - Compact */}
            <div className="text-center space-y-2">
                <h3 className="text-medium font-semibold text-gray-800">Bereit, dein Unternehmen weiter voranzubringen?</h3>
                <p className="text-s text-gray-600">
                    Wenn du planst, datenschutzfreundliche, maßgeschneiderte KI‑Agenten oder ein komplett angepasstes Produkt für dein <span className="font-bold">Unternehmen</span> zu bauen, unterstützen wir dich dabei.
                </p>
                <button 
                    onClick={handleContactClick}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                    Chat mit dem Zackriya‑Team
                </button>
            </div>

            {/* Footer - Compact */}
            <div className="pt-2 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400">
                    Entwickelt von Zackriya Solutions
                </p>
            </div>
            <AnalyticsConsentSwitch />
        </div>

    )
}
