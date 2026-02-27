import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import "./terminal.css";

export default function Terminal() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({ 
      cursorBlink: true,
      convertEol: true 
    });
    
    term.open(containerRef.current);
    term.focus();

    const prompt = "user@lti-shell:~$ ";
    term.write(prompt);

    let currentLine = "";

    const disposable = term.onData((data) => {
      const code = data.charCodeAt(0);

      if (code === 13) {
        term.write("\r\n");
        const command = currentLine.trim();
        console.log(command);

        if(currentLine == "clear"){
          term.clear();
          currentLine = "";
          term.write(prompt);
          return;
        }

        currentLine = "";
        term.write(prompt);
        return;
      }

      // backspace
      if (code === 127) {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write("\b \b"); 
        }
        return;
      }

      // Ignore control characters like arrow keps
      if (code < 32) return;

      currentLine += data;
      term.write(data);
    });

    return () => {
      disposable.dispose();
      term.dispose();
    };
  }, []);

  return <div ref={containerRef} className="terminalHost" />;
}