import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { sendChat } from "./chatbot";

const CSS = `
.cb *{box-sizing:border-box}
.cb{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;font-size:14px;color:#0f172a}
.cb-fab{position:fixed;right:20px;bottom:20px;width:52px;height:52px;border-radius:50%;border:0;background:#4f46e5;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(79,70,229,.4);z-index:80}
.cb-fab:hover{background:#4338ca}
.cb-panel{position:fixed;right:20px;bottom:84px;width:360px;max-width:calc(100vw - 32px);height:480px;max-height:calc(100vh - 110px);background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 28px rgba(15,23,42,.18);display:flex;flex-direction:column;z-index:80;overflow:hidden}
.cb-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#4f46e5;color:#fff;font-weight:600}
.cb-head button{border:0;background:transparent;color:#fff;cursor:pointer;display:inline-flex}
.cb-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f8fafc}
.cb-msg{max-width:85%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word;line-height:1.45}
.cb-msg.user{align-self:flex-end;background:#4f46e5;color:#fff;border-bottom-right-radius:4px}
.cb-msg.assistant{align-self:flex-start;background:#fff;border:1px solid #e2e8f0;border-bottom-left-radius:4px}
.cb-msg.error{align-self:stretch;max-width:100%;background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.cb-action{align-self:flex-start;display:flex;align-items:center;gap:6px;font-size:12px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;padding:3px 10px}
.cb-head .cb-tools{display:flex;gap:8px}
.cb-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff}
.cb-form input{flex:1;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit}
.cb-form button{width:40px;border:0;border-radius:8px;background:#4f46e5;color:#fff;display:grid;place-items:center;cursor:pointer}
.cb-form button:disabled{opacity:.5;cursor:not-allowed}
.cb :focus-visible{outline:2px solid #4f46e5;outline-offset:2px}
.cb-spin{animation:cbspin 1s linear infinite}
@keyframes cbspin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.cb-spin{animation:none}}
`;

const GREETING = { role: "assistant", content: "Hi! Ask me anything about your leads, services or sales follow-ups." };

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, error, open]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);

    try {
      // The greeting is UI only; the API history must start with a user message
      const history = next.filter((m) => m !== GREETING).map(({ role, content }) => ({ role, content }));
      const { reply, actions } = await sendChat(history);
      if (actions?.length) window.dispatchEvent(new Event("crm:data-changed"));
      setMessages((m) => [...m, { role: "assistant", content: reply, actions }]);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    if (loading) return;
    setMessages([GREETING]);
    setError("");
  };

  return (
    <div className="cb">
      <style>{CSS}</style>

      {open && (
        <section className="cb-panel" aria-label="Chat assistant">
          <div className="cb-head">
            <span>Assistant</span>
            <span className="cb-tools">
              <button onClick={resetChat} aria-label="Start a new chat" title="New chat"><RotateCcw size={16} /></button>
              <button onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>
            </span>
          </div>

          <div className="cb-body" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} style={{ display: "contents" }}>
                {m.actions?.map((a, j) => (
                  <div key={j} className="cb-action"><CheckCircle2 size={13} /> {a}</div>
                ))}
                <div className={`cb-msg ${m.role}`}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="cb-msg assistant" role="status"><Loader2 size={16} className="cb-spin" /></div>
            )}
            {error && <div className="cb-msg error" role="alert">{error}</div>}
            <div ref={endRef} />
          </div>

          <form className="cb-form" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              aria-label="Message"
              maxLength={2000}
              autoFocus
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send message"><Send size={16} /></button>
          </form>
        </section>
      )}

      <button className="cb-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? "Close chat" : "Open chat"} aria-expanded={open}>
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}