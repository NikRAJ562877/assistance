// src/renderer/App.tsx
import { useState, useEffect, useCallback } from "react";
import "./App.css";

type Mode = "summarize" | "rewrite" | "outline" | "todos";

declare global {
  interface Window {
    assistant: Window['assistant']
  }
}

export default function App() {
  const [mode, setMode] = useState<Mode>("summarize");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [model, setModel] = useState<string>(() => localStorage.getItem('gemini_model') || 'gemini-2.0-flash');
  const [temperature, setTemperature] = useState<number>(() => Number(localStorage.getItem('gemini_temperature') ?? '0.4'));
  const [systemPrompt, setSystemPrompt] = useState<string>(() => localStorage.getItem('gemini_system_prompt') || '');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [compact, setCompact] = useState<boolean>(() => localStorage.getItem('compact_mode') === '1');
  const [alwaysOnTop, setAlwaysOnTop] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleCompact = useCallback(async () => {
    const next = !compact;
    setCompact(next);
    localStorage.setItem('compact_mode', next ? '1' : '0');
    // In compact mode, enable always-on-top by default for convenience
    try {
      await window.assistant.setCompact(next);
      const res = await window.assistant.setAlwaysOnTop(next);
      setAlwaysOnTop(res.alwaysOnTop);
    } catch (e) {
      console.error('setAlwaysOnTop failed', e);
    }
  }, [compact]);

  const toggleAlwaysOnTop = useCallback(async () => {
    try {
      const res = await window.assistant.setAlwaysOnTop(!alwaysOnTop);
      setAlwaysOnTop(res.alwaysOnTop);
    } catch (e) {
      console.error('setAlwaysOnTop failed', e);
    }
  }, [alwaysOnTop]);

  const pasteClipboard = (): void => {
    try {
      setInput(window.assistant.readClipboard());
    } catch (e) {
      const message = e instanceof Error ? e.message : "Clipboard read failed";
      setError(message);
    }
  };

  const run = useCallback(async (): Promise<void> => {
    if (!input.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await window.assistant.run(mode, input, apiKey || undefined, {
        model,
        temperature,
        systemPrompt: systemPrompt || undefined,
      });
      setOutput(res);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [mode, input, apiKey, model, temperature, systemPrompt]);

  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  const saveSettings = useCallback(() => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_model', model);
    localStorage.setItem('gemini_temperature', String(temperature));
    localStorage.setItem('gemini_system_prompt', systemPrompt);
  }, [apiKey, model, temperature, systemPrompt]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            if (!busy && input.trim()) {
              run();
            }
            break;
          case 'v':
            e.preventDefault();
            pasteClipboard();
            break;
          case 'k':
            e.preventDefault();
            clearAll();
            break;
          case 's':
            e.preventDefault();
            saveSettings();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busy, input, run, saveSettings, clearAll]);

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Gemini Desk Assistant</h1>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙' : '☀️'} {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
          <button className="theme-toggle" onClick={toggleCompact}>
            {compact ? '↗️ Exit Compact' : '🗔 Compact'}
          </button>
          {compact && (
            <button className="theme-toggle" onClick={toggleAlwaysOnTop}>
              {alwaysOnTop ? '📌 Pinned' : '📌 Pin'}
            </button>
          )}
        </div>
      </div>

      {compact ? (
        <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
          <h3 className="card-title">Compact Mode</h3>
          <div className="controls">
            <div className="input-group">
              <label className="label">Task</label>
              <select
                className="input select"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
              >
                <option value="summarize">📝 Summarize</option>
                <option value="rewrite">✏️ Rewrite</option>
                <option value="outline">📋 Outline</option>
                <option value="todos">✅ TODOs</option>
              </select>
            </div>
            <button className="button button-secondary" onClick={pasteClipboard}>📋 Paste</button>
          </div>

          <div className="controls">
            <div className="input-group">
              <label className="label">Floating Mode</label>
              <select
                className="input select"
                defaultValue={localStorage.getItem('floating_mode') || 'pip'}
                onChange={async (e) => {
                  const mode = e.target.value as 'normal' | 'overlay' | 'pip' | 'dock-left' | 'dock-right'
                  localStorage.setItem('floating_mode', mode)
                  try {
                    await window.assistant.setFloatingMode(mode)
                  } catch (err) {
                    console.error(err)
                  }
                }}
              >
                <option value="pip">PiP</option>
                <option value="overlay">Overlay</option>
                <option value="dock-left">Dock Left</option>
                <option value="dock-right">Dock Right</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label className="label">Input</label>
            <textarea
              className="input"
              rows={6}
              placeholder="Paste or type here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="controls">
            <button className="button button-primary" disabled={busy || !input.trim()} onClick={run}>
              {busy ? (<div className="loading"><div className="spinner"></div>Processing...</div>) : '🚀 Run'}
            </button>
            <button className="button button-secondary" onClick={toggleCompact}>↗️ Exit</button>
          </div>

          {error && <div className="error">{error}</div>}
          {output && <pre className="output">{output}</pre>}
        </div>
      ) : (
      <div className="grid">
        <div className="card">
          <h3 className="card-title">Configuration</h3>
          
          <div className="input-group">
            <label className="label">API Key</label>
            <input
              type="password"
              className="input"
              placeholder="Enter your Gemini API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={saveSettings}
            />
          </div>

          <div className="controls">
            <div className="input-group">
              <label className="label">Model</label>
              <select
                className="input select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onBlur={saveSettings}
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </select>
            </div>
            <div className="input-group">
              <label className="label">Temperature</label>
              <input
                type="number"
                className="input"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                onBlur={saveSettings}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="label">System Prompt (Optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Override the default system prompt..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              onBlur={saveSettings}
            />
          </div>
        </div>

      <div className="card">
          <h3 className="card-title">Task & Input</h3>
          
          <div className="controls">
            <div className="input-group">
              <label className="label">Task Type</label>
              <select
                className="input select"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
              >
                <option value="summarize">📝 Summarize</option>
                <option value="rewrite">✏️ Rewrite</option>
                <option value="outline">📋 Outline</option>
                <option value="todos">✅ Extract TODOs</option>
              </select>
            </div>
            <button className="button button-secondary" onClick={pasteClipboard}>
              📋 Paste
            </button>
          </div>

          <div className="input-group">
            <label className="label">Input Text</label>
            <textarea
              className="input"
              rows={8}
              placeholder="Paste or type your text here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="controls">
            <button 
              className="button button-primary" 
              disabled={busy || !input.trim()} 
              onClick={run}
            >
              {busy ? (
                <div className="loading">
                  <div className="spinner"></div>
                  Processing...
                </div>
              ) : (
                '🚀 Run'
              )}
            </button>
            <button className="button button-secondary" onClick={clearAll}>
              🗑️ Clear
        </button>
          </div>
        </div>
      </div>
      )}
      {error && <div className="error">{error}</div>}

      {output && (
        <div className="card">
          <h3 className="card-title">Output</h3>
          <pre className="output">{output}</pre>
        </div>
      )}

      <div className="shortcuts">
        <div className="shortcut">
          <span className="shortcut-key">⌘</span>
          <span className="shortcut-key">Enter</span>
          <span>Run</span>
        </div>
        <div className="shortcut">
          <span className="shortcut-key">⌘</span>
          <span className="shortcut-key">V</span>
          <span>Paste</span>
        </div>
        <div className="shortcut">
          <span className="shortcut-key">⌘</span>
          <span className="shortcut-key">K</span>
          <span>Clear</span>
        </div>
        <div className="shortcut">
          <span className="shortcut-key">⌘</span>
          <span className="shortcut-key">S</span>
          <span>Save Settings</span>
        </div>
      </div>
    </div>
  );
}