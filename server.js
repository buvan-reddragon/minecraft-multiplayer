// ==UserScript==
// @name         Teletype Auto Red-Button Refresh & Task Tracker (Matrix IDE + Calendar)
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Matrix IDE theme, calendar date picker, draggable widget, arcade alerts, Enter-key tracking with modal detection.
// @match        https://exela.teletype.team/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // --- REFRESH TIMING CONFIGURATION (IN SECONDS) ---
    const MIN_REFRESH_SEC = 10;
    const MAX_REFRESH_SEC = 18;

    let isFormActive = false;
    let refreshTimeout = null;
    let lastActionTime = 0; // Debounce timer

    // --- RETRO ARCADE SOUND EFFECT (8-Bit Chime) ---
    function playArcadeSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

            notes.forEach((freq, index) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime + (index * 0.08));

                gain.gain.setValueAtTime(0.15, audioCtx.currentTime + (index * 0.08));
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (index * 0.08) + 0.12);

                osc.connect(gain);
                gain.connect(audioCtx.destination);

                osc.start(audioCtx.currentTime + (index * 0.08));
                osc.stop(audioCtx.currentTime + (index * 0.08) + 0.12);
            });
        } catch (e) {
            console.log("Arcade audio error: ", e);
        }
    }

    // --- DATA & STATS STORAGE ENGINE ---
    const getTodayKey = () => new Date().toISOString().split('T')[0];
    const today = getTodayKey();
    let selectedDate = today;

    function getStatsForDate(dateStr) {
        const history = GM_getValue("daily_history", {});
        return history[dateStr] || { accepted: 0, rejected: 0 };
    }

    function saveStatsForDate(dateStr, accepted, rejected) {
        const history = GM_getValue("daily_history", {});
        history[dateStr] = { accepted, rejected };
        GM_setValue("daily_history", history);
    }

    let todayStats = getStatsForDate(today);
    let todayAccepted = todayStats.accepted;
    let todayRejected = todayStats.rejected;
    let totalAccepted = GM_getValue("total_accepted", 0);
    let totalRejected = GM_getValue("total_rejected", 0);

    // --- UI DASHBOARD WIDGET (IDE MATRIX THEME + CALENDAR) ---
    function createWidget() {
        if (document.getElementById('teletype-stats-widget')) return;
        const div = document.createElement('div');
        div.id = 'teletype-stats-widget';
        div.style.position = 'fixed';

        // Load saved screen position or default to bottom-right
        const savedPos = GM_getValue("widget_pos", { bottom: "20px", right: "20px" });
        if (savedPos.top !== undefined) div.style.top = savedPos.top;
        if (savedPos.left !== undefined) div.style.left = savedPos.left;
        if (savedPos.bottom !== undefined) div.style.bottom = savedPos.bottom;
        if (savedPos.right !== undefined) div.style.right = savedPos.right;

        div.style.zIndex = '999999';
        div.style.backgroundColor = '#000000';
        div.style.color = '#00ff00';
        div.style.padding = '12px 16px';
        div.style.borderRadius = '2px';
        div.style.border = '2px solid #00ff00';
        div.style.boxShadow = 'none';
        div.style.fontFamily = '"Consolas", "Courier New", monospace';
        div.style.fontSize = '12px';
        div.style.lineHeight = '1.6';
        div.style.cursor = 'move';
        div.style.userSelect = 'none';

        updateWidgetContent(div);
        (document.body || document.documentElement).appendChild(div);

        makeDraggable(div);
    }

    function makeDraggable(elmnt) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        elmnt.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            // Allow interactions with the calendar input box without triggering drag
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            const newTop = (elmnt.offsetTop - pos2) + "px";
            const newLeft = (elmnt.offsetLeft - pos1) + "px";

            elmnt.style.bottom = 'auto';
            elmnt.style.right = 'auto';
            elmnt.style.top = newTop;
            elmnt.style.left = newLeft;

            GM_setValue("widget_pos", { top: newTop, left: newLeft });
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function updateWidgetContent(widgetEl = document.getElementById('teletype-stats-widget')) {
        if (!widgetEl) return;

        const isViewingToday = (selectedDate === today);
        const activeStats = isViewingToday ? { accepted: todayAccepted, rejected: todayRejected } : getStatsForDate(selectedDate);
        const totalSelectedDate = activeStats.accepted + activeStats.rejected;

        widgetEl.innerHTML = `
            <div style="background-color: #051405; border-bottom: 1px solid #00ff00; padding: 4px 6px; margin: -12px -16px 10px -16px; color: #00ff00; display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 11px;">
                <span>REPORT STATUS</span>
                <span style="font-size: 9px; color: #00ff00;">[BINSER-TOOLS]</span>
            </div>

            <div><span style="color: #ff2255;">TRACK THE WORK</span> <span style="color: #ff9900;">&lt;STAY FOCUSED&gt;</span></div>

            <div style="margin-top: 4px;">
                <span style="color: #ff0055;">FORM</span> status = <span style="color: ${isFormActive ? '#00ff00' : '#ffaa00'}; font-weight: bold;">"${isFormActive ? 'FORM_LOADED' : 'WAITING'}"</span>;
            </div>

            <div style="margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #ff0055;">WORK</span> <span style="color: #00ff00;">date</span> =
                <input type="date" id="teletype-date-picker" value="${selectedDate}" style="background-color: #000000; color: #ff9900; border: 1px solid #00ff00; border-radius: 0; padding: 2px 4px; font-family: monospace; font-size: 11px; cursor: pointer; outline: none; color-scheme: dark;">
            </div>

            <div><span style="color: #00ff00;">${isViewingToday ? 'today' : 'selected'}_accepted</span> = <span style="color: #00ff00; font-weight: bold;">${activeStats.accepted}</span>;</div>
            <div><span style="color: #ff0055;">${isViewingToday ? 'today' : 'selected'}_rejected</span> = <span style="color: #ff2255; font-weight: bold;">${activeStats.rejected}</span>;</div>
            <div><span style="color: #ff0055;">${isViewingToday ? 'today' : 'selected'}_total</span> = <span style="color: #ffffff; font-weight: bold;">${totalSelectedDate}</span>;</div>

            <div style="color: #00aa00; font-style: italic; margin-top: 6px;">// All-time performance stats</div>
            <div><span style="color: #ff0055;">all_time_accepted</span> = <span style="color: #ff00ff;">${totalAccepted}</span>;</div>
            <div><span style="color: #ff0055;">all_time_rejected</span> = <span style="color: #ff2255;">${totalRejected}</span>;</div>
        `;

        // Attach event listener for the Calendar Date Picker
        const dateInput = widgetEl.querySelector('#teletype-date-picker');
        if (dateInput) {
            dateInput.addEventListener('change', (e) => {
                selectedDate = e.target.value;
                updateWidgetContent();
            });
        }
    }

    function incrementStat(type) {
        const now = Date.now();
        if (now - lastActionTime < 800) return;
        lastActionTime = now;

        if (type === 'accept') {
            todayAccepted++;
            totalAccepted++;
            GM_setValue("total_accepted", totalAccepted);
            console.log("Counted: ACCEPT");
        } else if (type === 'reject') {
            todayRejected++;
            totalRejected++;
            GM_setValue("total_rejected", totalRejected);
            console.log("Counted: REJECT");
        }

        saveStatsForDate(today, todayAccepted, todayRejected);
        selectedDate = today;
        updateWidgetContent();
    }

    // Check if the "Fields Complete" popup overlay is visible
    function isCompletionModalPresent() {
        const bodyText = document.body.innerText || "";
        if (bodyText.includes("Fields Complete") || bodyText.includes("Press complete to save your changes")) {
            return true;
        }
       
        // Secondary check: look for specific buttons inside modal dialogs
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"], input[type="button"]'));
        return buttons.some(btn => {
            const text = btn.textContent.trim().toLowerCase();
            return text === 'complete' || text === 'complete & logout';
        });
    }

    // --- GLOBAL MOUSE CLICK INTERCEPTOR ---
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!target) return;

        const text = (target.textContent || target.value || '').trim().toLowerCase();

        if (text === 'accept') {
            incrementStat('accept');
            isFormActive = false;
            scheduleNextRedButtonClick();
        } else if (text === 'reject') {
            incrementStat('reject');
            isFormActive = false;
            scheduleNextRedButtonClick();
        }
    }, true);

    // --- GLOBAL ENTER KEY INTERCEPTOR ---
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && isFormActive) {
            // Check if the "Fields Complete" overlay is open
            if (isCompletionModalPresent()) {
                console.log("Completion modal detected. Enter key press ignored for counting.");
                return;
            }

            incrementStat('accept');
            isFormActive = false;
            scheduleNextRedButtonClick();
        }
    }, true);

    // --- AUTOMATION ENGINE ---
    function scheduleNextRedButtonClick() {
        if (isFormActive) return;

        const randomDelayMs = Math.floor(
            Math.random() * (MAX_REFRESH_SEC - MIN_REFRESH_SEC + 1) + MIN_REFRESH_SEC
        ) * 1000;

        console.log(`Auto-clicking red Refresh button in ${randomDelayMs / 1000} seconds...`);

        refreshTimeout = setTimeout(() => {
            if (isFormActive) return;

            const buttons = Array.from(document.querySelectorAll('button, div[role="button"], input[type="button"]'));
            const redRefreshBtn = buttons.find(btn => btn.textContent.trim().toLowerCase() === 'refresh');

            if (redRefreshBtn) {
                console.log("Clicking red Refresh button now.");
                redRefreshBtn.click();
            }

            scheduleNextRedButtonClick();
        }, randomDelayMs);
    }

    // Continuous State Check (Runs every 500ms)
    setInterval(() => {
        createWidget();

        const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
        const acceptBtn = buttons.find(btn => btn.textContent.trim().toLowerCase() === 'accept' || btn.value?.toLowerCase() === 'accept');
        const rejectBtn = buttons.find(btn => btn.textContent.trim().toLowerCase() === 'reject' || btn.value?.toLowerCase() === 'reject');

        if (acceptBtn || rejectBtn) {
            if (!isFormActive) {
                isFormActive = true;
                if (refreshTimeout) clearTimeout(refreshTimeout);

                playArcadeSound();
                updateWidgetContent();
                console.log("Form detected! Stopped auto-refresh.");
            }
        } else {
            if (isFormActive) {
                isFormActive = false;
                updateWidgetContent();
                scheduleNextRedButtonClick();
            }
        }
    }, 500);

    // Initial Start
    scheduleNextRedButtonClick();
})();
