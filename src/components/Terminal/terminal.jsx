import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./terminal.css";

export default function Terminal({ onSession }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      convertEol: true,
      scrollback: 1000,
      fontFamily: "monospace",
      fontSize: 14,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    term.focus();

    const wsUrl = import.meta.env.VITE_WS_URL;
    const ws = new WebSocket(`${wsUrl}/ws/terminal`);
    ws.binaryType = "arraybuffer";

    const sendResize = (cols, rows) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const buf = new Uint8Array(5);
      buf[0] = 0x01;
      new DataView(buf.buffer).setUint16(1, cols, false);
      new DataView(buf.buffer).setUint16(3, rows, false);
      ws.send(buf);
    };

    ws.onopen = () => {
      sendResize(term.cols, term.rows);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "session") {
            onSession?.(msg.id);
            return;
          }
        } catch {}
        term.write(event.data);
        return;
      }
      term.write(new Uint8Array(event.data));
    };

    term.onData(data => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      sendResize(term.cols, term.rows);
    });
    resizeObserver.observe(containerRef.current);

    const handlePageHide = () => ws.close();
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="terminalHost" />;
}
