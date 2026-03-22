import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { AttachAddon } from "@xterm/addon-attach";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import "./terminal.css";

export default function Terminal() {
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

    const ws = new WebSocket("ws://localhost:8000/ws/terminal");
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      const attachAddon = new AttachAddon(ws);
      term.loadAddon(attachAddon);

      sendResize(ws, term.cols, term.rows);
    };

    const sendResize = (socket, cols, rows) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const buf = new Uint8Array(5);
      buf[0] = 0x01;
      new DataView(buf.buffer).setUint16(1, cols, false);
      new DataView(buf.buffer).setUint16(3, rows, false);
      socket.send(buf);
    };

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      sendResize(ws, term.cols, term.rows);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="terminalHost" />;
}