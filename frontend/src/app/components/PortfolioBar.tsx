"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- The root belongs to the separate Flutter app; Next Link would prepend /yuzu. */
import { useState } from "react";
export default function PortfolioBar() {
  const [open, setOpen] = useState(false),
    [copied, setCopied] = useState(false);
  const prompt =
    "Help me learn the Yuzu bank-book simulator. Explain one field at a time: principal versus carrying value, fixed/floating interest and fixing, SPPI/business model, AC/FVOCI/FVTPL, banking versus trading book, curve units, deposit beta/life/runoff, and the distinction between full-life EVE and horizon NII. Use fictional examples. Ask which field I am on. Explain uncertainties and do not claim regulatory compliance or invent BIS thresholds. No portfolio or personal data is included in this prompt.";
  return (
    <>
      <div className="portfolio-bar">
        <a href="/">← Chris Plitz Portfolio</a>
        <span>Yuzu · Accounting & risk lab</span>
        <button
          className="text-button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Help getting started
        </button>
      </div>
      {open && (
        <section className="welcome-help" aria-label="Getting started">
          <div>
            <h2>Start with a story, then change a number.</h2>
            <p>
              In the stress lab, open <strong>Explore scenarios</strong> to
              compare three worked examples without entering data. Load one into
              your draft, then hover, focus or tap a dotted field label for an
              explanation.
            </p>
            <p>
              Change one assumption, run the model, and inspect coverage before
              reading the result. Saved runs preserve the inputs you used.
            </p>
          </div>
          <details>
            <summary>Optional: continue learning with ChatGPT</summary>
            <p>
              This is a manual handoff. You can review and copy this generic
              prompt, then paste it into ChatGPT. No book, field values or
              personal data is sent by this website. ChatGPT access depends on
              your own account.
            </p>
            <textarea
              aria-label="ChatGPT learning prompt"
              readOnly
              value={prompt}
              rows={5}
            />
            <div className="actions">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(prompt);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "Prompt copied" : "Copy learning prompt"}
              </button>
              <a
                className="secondary"
                href="https://chatgpt.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open ChatGPT ↗
              </a>
            </div>
            <p role="status">
              {copied
                ? "Paste it into ChatGPT when you are ready."
                : "You can also select and copy the text yourself."}
            </p>
          </details>
        </section>
      )}
    </>
  );
}
