import { KeyRound, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  clearProviderConfig,
  loadProviderConfig,
  saveProviderConfig,
} from "../features/ai/provider";
import { useUi } from "../lib/uiStore";

export function SettingsModal() {
  const open = useUi((s) => s.settingsOpen);
  const setSettingsOpen = useUi((s) => s.setSettingsOpen);
  const close = () => setSettingsOpen(false);
  const reduceMotion = useReducedMotion();
  const existing = loadProviderConfig();
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [model, setModel] = useState(existing?.model ?? "gpt-4o-mini");

  useEffect(() => {
    if (open) {
      const cfg = loadProviderConfig();
      setBaseUrl(cfg?.baseUrl ?? "https://api.openai.com/v1");
      setApiKey(cfg?.apiKey ?? "");
      setModel(cfg?.model ?? "gpt-4o-mini");
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={close}
          onKeyDown={(e) => e.key === "Escape" && close()}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-md border border-line bg-surface-2 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.64)]"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[14px] font-medium">
                <KeyRound size={15} className="text-accent" /> Connect AI provider
              </h2>
              <button
                type="button"
                className="cursor-pointer rounded-sm p-1 text-text-3 hover:bg-surface-3 hover:text-text-1"
                aria-label="Close settings"
                onClick={() => close()}
              >
                <X size={14} />
              </button>
            </div>

            <p className="mt-2 text-[12px] leading-relaxed text-text-3">
              Any OpenAI-compatible endpoint works — OpenAI, OpenRouter, Groq, or a local
              Ollama server.
            </p>

            <div className="mt-4 space-y-3">
              <Field label="Base URL" id="es-baseurl">
                <input
                  id="es-baseurl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  spellCheck={false}
                  className="input"
                  placeholder="https://api.openai.com/v1"
                />
              </Field>
              <Field label="API key" id="es-apikey">
                <input
                  id="es-apikey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                  spellCheck={false}
                  className="input"
                  placeholder="sk-…"
                />
              </Field>
              <Field label="Model" id="es-model">
                <input
                  id="es-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  spellCheck={false}
                  className="input"
                  placeholder="gpt-4o-mini"
                />
              </Field>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-sm border border-line-subtle bg-surface-1 p-2.5 text-[11px] leading-relaxed text-text-3">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-success" />
              Your key is stored only in this browser's local storage and sent directly to
              the provider you choose. It never reaches any other server. For shared
              deployments, host EchoSheets with a server-side proxy instead.
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearProviderConfig();
                  close();
                }}
              >
                Disconnect
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!apiKey.trim() || !baseUrl.trim() || !model.trim()) return;
                  saveProviderConfig({
                    baseUrl: baseUrl.trim(),
                    apiKey: apiKey.trim(),
                    model: model.trim(),
                  });
                  close();
                }}
              >
                Save & connect
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field(props: { label: string; id: string; children: React.ReactNode }) {
  return (
    <label htmlFor={props.id}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-text-3">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}
