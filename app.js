    "use strict";

    const PLAYERS = [
      "Cousins", "Smurph", "Vishnu", "Robbie", "Bilal",
      "AB", "Arnold", "Arjun", "Fuckshane", "Money"
    ];
    const STORAGE_KEY = "six-k-four-beers-bar-v3";
    const VERSION = "6K4B-BAR-V3";
    const encoder = new TextEncoder();

    const $ = (id) => document.getElementById(id);
    let state = defaultState();
    let toastTimer;

    function defaultState() {
      return {
        lockCode: "",
        lockAt: "",
        runner1Name: "Arjun",
        runner1Time: "",
        runner2Name: "",
        runner2Time: "",
        barName: "",
        beerStamps: ["", "", "", ""],
        receiptRef: "",
        receiptTotal: "",
        finalized: false,
        proof: "",
        order: []
      };
    }

    function safeLoad() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (!saved || typeof saved !== "object") return defaultState();
        return {
          ...defaultState(),
          ...saved,
          beerStamps: Array.isArray(saved.beerStamps) ? saved.beerStamps.slice(0, 4) : ["", "", "", ""],
          order: Array.isArray(saved.order) ? saved.order : []
        };
      } catch (_) {
        return defaultState();
      }
    }

    function save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>'"]/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
      }[char]));
    }

    function showToast(message) {
      clearTimeout(toastTimer);
      $("toast").textContent = message;
      $("toast").classList.add("visible");
      toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2200);
    }

    async function copyText(text, successMessage) {
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      showToast(successMessage);
    }

    function parseTime(value) {
      const match = String(value).trim().match(/^(\d{1,2}):([0-5]\d)$/);
      if (!match) return null;
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      if (minutes < 15 || minutes > 90) return null;
      return minutes * 60 + seconds;
    }

    function formatPace(totalSeconds) {
      const rounded = Math.round(totalSeconds / 6);
      const min = Math.floor(rounded / 60);
      const sec = rounded % 60;
      return `${min}:${String(sec).padStart(2, "0")} / km`;
    }

    function normalizeMoney(value) {
      const cleaned = String(value).trim().replace(/[$,\s]/g, "");
      if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
      const cents = Math.round(Number(cleaned) * 100);
      return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
    }

    function formatLocalStamp(iso) {
      if (!iso) return "Tap when served";
      const date = new Date(iso);
      const base = new Intl.DateTimeFormat(undefined, {
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      }).format(date);
      return `${base}.${String(date.getMilliseconds()).padStart(3, "0")}`;
    }

    function canonicalEvidence(source = state) {
      return {
        version: VERSION,
        roster: PLAYERS,
        lockCode: String(source.lockCode).trim().toUpperCase(),
        lockAt: String(source.lockAt),
        runner1: {
          name: String(source.runner1Name).trim(),
          seconds: parseTime(source.runner1Time)
        },
        runner2: {
          name: String(source.runner2Name).trim(),
          seconds: parseTime(source.runner2Time)
        },
        bar: String(source.barName).trim().replace(/\s+/g, " ").toUpperCase(),
        beerServedAt: source.beerStamps.map(String),
        receiptRef: String(source.receiptRef).trim().replace(/\s+/g, "").toUpperCase(),
        receiptTotalCents: normalizeMoney(source.receiptTotal)
      };
    }

    function isComplete(source = state) {
      const evidence = canonicalEvidence(source);
      return Boolean(
        evidence.lockCode && evidence.lockAt &&
        evidence.runner1.name && evidence.runner1.seconds &&
        evidence.runner2.name && evidence.runner2.seconds &&
        evidence.bar &&
        evidence.beerServedAt.length === 4 && evidence.beerServedAt.every(Boolean) &&
        evidence.receiptRef.length >= 3 && evidence.receiptTotalCents
      );
    }

    function resultText() {
      const lines = state.order.map((name, index) => `${index + 1}. ${name}`);
      return [
        "6K + 4 BEERS — OFFICIAL DRAFT ORDER",
        "",
        ...lines,
        "",
        `Lock: ${state.lockCode}`,
        `Proof: ${state.proof}`
      ].join("\n");
    }

    function encodePayload(payload) {
      const bytes = encoder.encode(JSON.stringify(payload));
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function decodePayload(value) {
      const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    }

    function sharePayload() {
      return {
        v: VERSION,
        evidence: {
          lockCode: state.lockCode,
          lockAt: state.lockAt,
          runner1Name: state.runner1Name,
          runner1Time: state.runner1Time,
          runner2Name: state.runner2Name,
          runner2Time: state.runner2Time,
          barName: state.barName,
          beerStamps: state.beerStamps,
          receiptRef: state.receiptRef,
          receiptTotal: state.receiptTotal
        },
        proof: state.proof,
        order: state.order
      };
    }

    function shareUrl() {
      return `${location.href.split("#")[0]}#r=${encodePayload(sharePayload())}`;
    }

    function syncInputsFromState() {
      ["runner1Name", "runner1Time", "runner2Name", "runner2Time", "barName", "receiptRef", "receiptTotal"].forEach((id) => {
        $(id).value = state[id] || "";
      });
    }

    function renderRoster() {
      $("roster").innerHTML = PLAYERS.map((name) => `<span class="pill">${escapeHtml(name)}</span>`).join("");
    }

    function renderLock() {
      const locked = Boolean(state.lockCode && state.lockAt);
      $("lockButton").style.display = locked ? "none" : "block";
      $("lockBox").classList.toggle("visible", locked);
      $("lockStatus").textContent = locked ? "Locked" : "Open";
      $("lockStatus").classList.toggle("done", locked);
      if (locked) {
        $("lockCode").textContent = state.lockCode;
        $("lockTime").textContent = `Created ${new Date(state.lockAt).toLocaleString()}`;
      }
    }

    function beerLabel(index) {
      const round = index < 2 ? 1 : 2;
      const isRunner1 = index % 2 === 0;
      const name = (isRunner1 ? state.runner1Name : state.runner2Name).trim() || (isRunner1 ? "Runner 1" : "Runner 2");
      return { round, name };
    }

    function renderBeerGrid() {
      $("beerGrid").innerHTML = state.beerStamps.map((stamp, index) => {
        const label = beerLabel(index);
        return `
          <button class="stamp ${stamp ? "recorded" : ""}" type="button" data-stamp-index="${index}" ${stamp || state.finalized ? "disabled" : ""}>
            <span class="stamp-kicker">Round ${label.round} · Beer ${index + 1}</span>
            <span class="stamp-name">${escapeHtml(label.name)}</span>
            <span class="stamp-value">${escapeHtml(formatLocalStamp(stamp))}</span>
          </button>`;
      }).join("");
      document.querySelectorAll("[data-stamp-index]").forEach((button) => {
        button.addEventListener("click", () => {
          if (state.finalized) return;
          const index = Number(button.dataset.stampIndex);
          if (state.beerStamps[index]) return;
          state.beerStamps[index] = new Date().toISOString();
          save();
          render();
          if (navigator.vibrate) navigator.vibrate(20);
          showToast(`Beer ${index + 1} stamped`);
        });
      });
    }

    function renderRunStatus() {
      const first = parseTime(state.runner1Time);
      const second = parseTime(state.runner2Time);
      $("pace1").textContent = first ? formatPace(first) : "Format MM:SS";
      $("pace2").textContent = second ? formatPace(second) : "Format MM:SS";
      const done = Boolean(state.runner1Name.trim() && first && state.runner2Name.trim() && second);
      $("runStatus").textContent = done ? "Recorded" : "Waiting";
      $("runStatus").classList.toggle("done", done);
    }

    function renderBarStatus() {
      const count = state.beerStamps.filter(Boolean).length;
      $("barStatus").textContent = `${count} / 4`;
      $("barStatus").classList.toggle("done", count === 4);
    }

    function renderDrawStatus() {
      const ready = isComplete();
      $("revealButton").disabled = !ready || state.finalized;
      $("drawStatus").textContent = state.finalized ? "Final" : ready ? "Ready" : "Locked";
      $("drawStatus").classList.toggle("done", ready || state.finalized);
      $("requirements").textContent = state.finalized
        ? "The event is finalized. Use the proof or verification link to reproduce it."
        : ready
          ? "All evidence captured. The order is ready to reveal."
          : "Complete the lock, both run times, four beer stamps and receipt details.";
      $("requirements").classList.toggle("ready", ready || state.finalized);
    }

    function renderResult(scroll = false) {
      const visible = state.finalized && state.order.length === PLAYERS.length && state.proof;
      $("resultCard").classList.toggle("visible", Boolean(visible));
      if (!visible) return;
      $("orderList").innerHTML = state.order.map((name) => `<li>${escapeHtml(name)}</li>`).join("");
      $("proofHash").textContent = state.proof;
      if (scroll) $("resultCard").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function lockEditableFields() {
      const disabled = state.finalized;
      ["runner1Name", "runner1Time", "runner2Name", "runner2Time", "barName", "receiptRef", "receiptTotal"].forEach((id) => {
        $(id).disabled = disabled;
      });
    }

    function render() {
      renderLock();
      renderRunStatus();
      renderBeerGrid();
      renderBarStatus();
      renderDrawStatus();
      renderResult();
      lockEditableFields();
    }

    async function finalize() {
      if (!isComplete() || state.finalized) return;
      $("revealButton").disabled = true;
      $("revealButton").textContent = "Calculating…";
      try {
        const evidence = canonicalEvidence();
        const canonical = JSON.stringify(evidence);
        const proof = await sha256Hex(canonical);
        const order = await deterministicShuffle(PLAYERS, proof);
        state.proof = proof;
        state.order = order;
        state.finalized = true;
        save();
        render();
        renderResult(true);
      } catch (error) {
        console.error(error);
        showToast("Could not generate the order");
      } finally {
        $("revealButton").textContent = "Generate official draft order";
      }
    }

    async function verifySharedPayload(payload) {
      if (!payload || payload.v !== VERSION || !payload.evidence) throw new Error("Unsupported receipt");
      const candidate = { ...defaultState(), ...payload.evidence };
      const canonical = JSON.stringify(canonicalEvidence(candidate));
      const proof = await sha256Hex(canonical);
      const order = await deterministicShuffle(PLAYERS, proof);
      if (proof !== payload.proof || JSON.stringify(order) !== JSON.stringify(payload.order)) {
        throw new Error("Verification failed");
      }
      state = { ...candidate, proof, order, finalized: true };
      syncInputsFromState();
      $("verificationBanner").classList.add("visible");
      render();
      renderResult(false);
    }

    function wireInputs() {
      ["runner1Name", "runner1Time", "runner2Name", "runner2Time", "barName", "receiptRef", "receiptTotal"].forEach((id) => {
        $(id).addEventListener("input", (event) => {
          if (state.finalized) return;
          state[id] = event.target.value;
          save();
          renderRunStatus();
          if (id.includes("Name")) renderBeerGrid();
          renderDrawStatus();
        });
      });

      $("lockButton").addEventListener("click", () => {
        if (state.lockCode) return;
        state.lockCode = makeLockCode();
        state.lockAt = new Date().toISOString();
        save();
        render();
      });

      $("copyLockButton").addEventListener("click", () => {
        copyText(
          `6K + 4 Beers lock: ${state.lockCode}\nLocked: ${new Date(state.lockAt).toLocaleString()}\nSave this message for the final verification.`,
          "Lock copied"
        );
      });

      $("revealButton").addEventListener("click", finalize);
      $("copyResultButton").addEventListener("click", () => copyText(resultText(), "Results copied"));
      $("shareButton").addEventListener("click", async () => {
        const url = shareUrl();
        const data = { title: "6K + 4 Beers Draft Order", text: resultText(), url };
        if (navigator.share) {
          try { await navigator.share(data); return; } catch (error) {
            if (error && error.name === "AbortError") return;
          }
        }
        copyText(url, "Verification link copied");
      });

      $("resetButton").addEventListener("click", () => {
        if (!confirm("Reset the lock, run, bar stamps and final result? This cannot be undone.")) return;
        localStorage.removeItem(STORAGE_KEY);
        history.replaceState(null, "", location.href.split("#")[0]);
        state = defaultState();
        $("verificationBanner").classList.remove("visible");
        syncInputsFromState();
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    async function boot() {
      renderRoster();
      wireInputs();
      const shared = location.hash.startsWith("#r=") ? location.hash.slice(3) : "";
      if (shared) {
        try {
          await verifySharedPayload(decodePayload(shared));
          return;
        } catch (error) {
          console.error(error);
          history.replaceState(null, "", location.href.split("#")[0]);
          showToast("That shared receipt could not be verified");
        }
      }
      state = safeLoad();
      syncInputsFromState();
      render();
    }

    boot();
