import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface PermissionStatus {
  hasMicrophone: boolean;
  hasSystemAudio: boolean;
  isChecking: boolean;
  error: string | null;
}

// Helper to check if running in Tauri
const isTauri = () => typeof window !== 'undefined' && !!(window as any).__TAURI__;

// Check if running on Windows
const isWindowsOS = () => typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

export function usePermissionCheck() {
  // On Windows, default to showing UI (hasMicrophone: true) while checking
  // This prevents the UI from flickering or being hidden during permission check
  const [status, setStatus] = useState<PermissionStatus>({
    hasMicrophone: isWindowsOS(), // Default to true on Windows
    hasSystemAudio: false,
    isChecking: true,
    error: null,
  });

  const checkPermissions = async () => {
    setStatus(prev => ({ ...prev, isChecking: true, error: null }));

    // In browser mode (non-Tauri), always return true for permissions
    if (!isTauri()) {
      console.log('Running in browser mode, skipping permission check');
      setStatus({
        hasMicrophone: true,
        hasSystemAudio: true,
        isChecking: false,
        error: null,
      });
      return { hasMicrophone: true, hasSystemAudio: true };
    }

    try {
      // Get audio devices to check for microphone and system audio availability
      const devices = await invoke<Array<{ name: string; device_type: 'Input' | 'Output' }>>('get_audio_devices');

      // Check for microphone devices (Input)
      const inputDevices = devices.filter(d => d.device_type === 'Input');
      let hasMicrophone = inputDevices.length > 0;

      // Check for system audio devices (Output)
      // On macOS, we need ScreenCaptureKit devices for system audio
      const outputDevices = devices.filter(d => d.device_type === 'Output');
      const hasSystemAudio = outputDevices.length > 0;

      console.log('Permission check:', {
        hasMicrophone,
        hasSystemAudio,
        inputDevices: inputDevices.length,
        outputDevices: outputDevices.length,
        allDevices: devices.length
      });

      // On Windows, if no input devices are detected, default to allowing UI
      // The actual recording will handle device selection with fallbacks
      const isWindows = navigator.userAgent.includes('Windows');
      if (isWindows && !hasMicrophone) {
        console.warn('Windows: No input devices detected, defaulting to show UI');
        hasMicrophone = true;
      }

      setStatus({
        hasMicrophone,
        hasSystemAudio,
        isChecking: false,
        error: null,
      });

      return { hasMicrophone, hasSystemAudio };
    } catch (error) {
      console.error('Failed to check audio permissions:', error);
      // On Windows, if get_audio_devices fails, still allow UI to show
      // The error might be transient or a timing issue
      const isWindows = navigator.userAgent.includes('Windows');
      if (isWindows) {
        console.warn('Windows detected with permission error - defaulting to allow UI');
        setStatus({
          hasMicrophone: true,
          hasSystemAudio: false, // System audio typically doesn't work on Windows via browser
          isChecking: false,
          error: null,
        });
        return { hasMicrophone: true, hasSystemAudio: false };
      }
      setStatus({
        hasMicrophone: false,
        hasSystemAudio: false,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Berechtigungen konnten nicht geprüft werden',
      });
      return { hasMicrophone: false, hasSystemAudio: false };
    }
  };

  const requestPermissions = async () => {
    try {
      // Trigger audio permission by trying to access devices
      await invoke('get_audio_devices');

      // Recheck after triggering
      setTimeout(() => {
        checkPermissions();
      }, 1000);
    } catch (error) {
      console.error('Failed to request permissions:', error);
    }
  };

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  return {
    ...status,
    checkPermissions,
    requestPermissions,
  };
}
