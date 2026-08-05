import { db } from "./firebase-config.js?v=3.1";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Session check
const organizerUsername = localStorage.getItem("organizerUsername");
const organizerName = localStorage.getItem("organizerName");
const assignedEventId = localStorage.getItem("assignedEventId");

if (!organizerUsername) {
  window.location.href = "login.html";
}

// Elements
const orgUserBadge = document.getElementById("orgUserBadge");
const btnLogout = document.getElementById("btnLogout");
const assignedEventTitle = document.getElementById("assignedEventTitle");
const assignedEventSubtitle = document.getElementById("assignedEventSubtitle");
const noEventMessage = document.getElementById("noEventMessage");
const portalContent = document.getElementById("portalContent");

// Form 1 Elements (Event Info)
const orgEventForm = document.getElementById("orgEventForm");
const eventTitleInput = document.getElementById("eventTitle");
const eventDescriptionInput = document.getElementById("eventDescription");
const eventDateInput = document.getElementById("eventDate");
const eventTimeInput = document.getElementById("eventTime");
const eventVenueInput = document.getElementById("eventVenue");
const eventCoordinatorInput = document.getElementById("eventCoordinator");
const eventRulesInput = document.getElementById("eventRules");

// Form 2 Elements (Results)
const resultsForm = document.getElementById("resultsForm");
const winnerFirstSelect = document.getElementById("winnerFirst");
const winnerSecondSelect = document.getElementById("winnerSecond");
const winnerThirdSelect = document.getElementById("winnerThird");

// Registrants Elements
const registrantsTableBody = document.getElementById("registrantsTableBody");
const registeredCount = document.getElementById("registeredCount");
const checkedInCount = document.getElementById("checkedInCount");

// Judging & Marks Sheet Elements
const judgesLabel = document.getElementById("judgesLabel");
const criteriaLabel = document.getElementById("criteriaLabel");
const btnSaveMarks = document.getElementById("btnSaveMarks");
const btnShareJudging = document.getElementById("btnShareJudging");
const btnPrintMarksheet = document.getElementById("btnPrintMarksheet");
const btnAutomateWinners = document.getElementById("btnAutomateWinners");
const marksTableHeaderRow = document.getElementById("marksTableHeaderRow");
const marksTableBody = document.getElementById("marksTableBody");

// Coordinator Judging Config Elements
const btnToggleJudgingConfig = document.getElementById("btnToggleJudgingConfig");
const judgingConfigPanel = document.getElementById("judgingConfigPanel");
const orgJudgingForm = document.getElementById("orgJudgingForm");
const orgAllottedJudges = document.getElementById("orgAllottedJudges");
const orgCriteria = document.getElementById("orgCriteria");

// Event Status Elements
const currentStatusBadge = document.getElementById("currentStatusBadge");
const btnStartEvent = document.getElementById("btnStartEvent");

// State variables
let eventData = null;
let registeredStudents = [];
let checkedInStudentIds = [];

async function init() {
  orgUserBadge.innerText = `${organizerName} (${organizerUsername})`;
  btnLogout.addEventListener("click", handleLogout);

  if (!assignedEventId) {
    showNoAssignment();
    return;
  }

  await loadEventData();
  await loadRegistrants();
  setupEventListeners();
  setupOrgPromoStudio();
  await loadOrgPromosData();
  setupCredentialsModal();
  setupClassLimitsForm();

  const btnGoToMedia = document.getElementById("btnGoToMedia");
  if (btnGoToMedia) {
    btnGoToMedia.addEventListener("click", () => {
      window.location.href = `explore.html?event=${assignedEventId}`;
    });
  }
}

function handleLogout() {
  localStorage.clear();
  window.location.href = "login.html";
}

function showNoAssignment() {
  noEventMessage.style.display = "block";
  portalContent.style.display = "none";
  assignedEventSubtitle.innerText = "No Event Mapped";
}

async function loadEventData() {
  try {
    const eventRef = doc(db, "events", assignedEventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      showNoAssignment();
      assignedEventTitle.innerText = "Error: Event Not Found";
      assignedEventSubtitle.innerText = `Event with ID "${assignedEventId}" does not exist in events database.`;
      return;
    }

    eventData = eventSnap.data();
    checkedInStudentIds = eventData.checkedInStudents || [];

    // Update Status Badge UI
    if (currentStatusBadge) {
      const isStarted = eventData.status === "started";
      currentStatusBadge.innerText = isStarted ? "LIVE / STARTED" : "Not Started";
      currentStatusBadge.style.color = isStarted ? "var(--neon-green)" : "#888";
      
      if (btnStartEvent) {
        if (isStarted) {
          btnStartEvent.innerText = "Stop Event";
          btnStartEvent.disabled = false;
          btnStartEvent.style.opacity = "1";
          btnStartEvent.style.cursor = "pointer";
          btnStartEvent.style.borderColor = "var(--neon-red)";
          btnStartEvent.style.background = "rgba(220, 38, 38, 0.15)";
        } else {
          btnStartEvent.innerText = "Start Event & Notify Students";
          btnStartEvent.disabled = false;
          btnStartEvent.style.opacity = "1";
          btnStartEvent.style.cursor = "pointer";
          btnStartEvent.style.borderColor = "var(--neon-green)";
          btnStartEvent.style.background = "rgba(34, 197, 94, 0.15)";
        }
      }
    }

    // Title setup
    assignedEventTitle.innerText = `Dashboard: ${eventData.title}`;
    assignedEventSubtitle.innerText = `Manage coordinate parameters, registrations and publish results.`;

    // Fill Event Info Form
    if (eventTitleInput) eventTitleInput.value = eventData.title || "";
    eventDescriptionInput.value = eventData.description || "";
    eventDateInput.value = eventData.date || "";
    const regCloseDateEl = document.getElementById("eventRegCloseDate");
    if (regCloseDateEl) regCloseDateEl.value = eventData.registrationCloseDate || "";
    eventTimeInput.value = eventData.time || "";
    eventVenueInput.value = eventData.venue || "";
    eventCoordinatorInput.value = eventData.coordinator || "";
    eventRulesInput.value = eventData.rules || "";

    // Class Limits setup (Event Specific)
    const classLimitsPanelTitle = document.getElementById("classLimitsPanelTitle");
    if (classLimitsPanelTitle) {
      classLimitsPanelTitle.innerText = `Class Registration Limits (${eventData.title || assignedEventId})`;
    }
    if (document.getElementById("maxPerClassInput")) {
      document.getElementById("maxPerClassInput").value = eventData.maxPerClass || "";
    }
    tempClassLimits = eventData.classLimits || {};
    renderActiveClassLimits();

    // Event Rounds Setup
    currentEventRounds = eventData.rounds || [];
    setupEventRoundsHandlers();
    renderEventRounds();

    // Judging Labels
    if (judgesLabel) {
      judgesLabel.innerText = eventData.judges && eventData.judges.length > 0 ? eventData.judges.join(", ") : "None Allotted";
    }
    if (criteriaLabel) {
      criteriaLabel.innerText = eventData.criteria && eventData.criteria.length > 0 ? eventData.criteria.join(", ") : "None Configured";
    }

    if (orgAllottedJudges) {
      orgAllottedJudges.value = eventData.judges && eventData.judges.length > 0 ? eventData.judges.join(", ") : "";
    }
    if (orgCriteria) {
      orgCriteria.value = eventData.criteria && eventData.criteria.length > 0 ? eventData.criteria.join(", ") : "";
    }

    const assignJudgeEventName = document.getElementById("assignJudgeEventName");
    if (assignJudgeEventName) {
      assignJudgeEventName.innerText = eventData.title || assignedEventId;
    }

    renderJudgeAssignments();
    renderRoundPromotions();
    renderStudentCoordinators();

  } catch (error) {
    console.error("Error loading event details:", error);
  }
}

async function loadRegistrants() {
  try {
    // Fetch students registered for this event
    const q = query(collection(db, "students"), where("registeredEvents", "array-contains", assignedEventId));
    const querySnap = await getDocs(q);

    registeredStudents = [];
    querySnap.forEach(snap => {
      registeredStudents.push({ regNo: snap.id, ...snap.data() });
    });

    renderRegistrants();
    populateWinnerDropdowns();
    renderMarksSheet();
    await loadGamingTeams();
  } catch (error) {
    console.error("Error loading registrants:", error);
    registrantsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--neon-red);">Failed to load registrants.</td></tr>`;
  }
}

function renderRegistrants() {
  registeredCount.innerText = `Total Registrations: ${registeredStudents.length}`;
  checkedInCount.innerText = `Checked-in: ${checkedInStudentIds.length}`;

  if (registeredStudents.length === 0) {
    registrantsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-sub);">No students registered for this event.</td></tr>`;
    return;
  }

  registrantsTableBody.innerHTML = registeredStudents.map(st => {
    const isCheckedIn = checkedInStudentIds.includes(st.regNo);
    return `
      <tr>
        <td><strong>${st.regNo}</strong></td>
        <td>${st.name || "N/A"}</td>
        <td>${st.class || "N/A"}</td>
        <td>${st.email || '<span style="opacity: 0.5;">No email</span>'}</td>
        <td style="text-align: center;">
          <input type="checkbox" style="transform: scale(1.3); cursor: pointer;" 
            ${isCheckedIn ? "checked" : ""} 
            onclick="toggleCheckIn('${st.regNo}', this.checked)">
        </td>
        <td style="text-align: center;">
          <button class="btn-action btn-danger" style="padding: 4px 10px; font-size: 0.8rem; margin: 0;" onclick="removeStudentFromEvent('${st.regNo}', '${st.name ? st.name.replace(/'/g, "\\'") : "N/A"}')">Remove</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.toggleCheckIn = async function(studentRegNo, isChecked) {
  try {
    const eventRef = doc(db, "events", assignedEventId);
    if (isChecked) {
      await updateDoc(eventRef, {
        checkedInStudents: arrayUnion(studentRegNo)
      });
      checkedInStudentIds.push(studentRegNo);
    } else {
      await updateDoc(eventRef, {
        checkedInStudents: arrayRemove(studentRegNo)
      });
      checkedInStudentIds = checkedInStudentIds.filter(id => id !== studentRegNo);
    }
    
    // Refresh count values (no full re-render to avoid losing check focus)
    checkedInCount.innerText = `Checked-in: ${checkedInStudentIds.length}`;
  } catch (error) {
    console.error("Error toggling check-in:", error);
    alert("System check-in update failed.");
  }
};

window.removeStudentFromEvent = async function(studentRegNo, studentName) {
  if (!await confirm(`Are you sure you want to remove ${studentName} (${studentRegNo}) from this event?`)) {
    return;
  }

  try {
    // 1. Remove the event ID from student's registeredEvents array in Firestore
    const studentRef = doc(db, "students", studentRegNo);
    await updateDoc(studentRef, {
      registeredEvents: arrayRemove(assignedEventId)
    });

    // 2. Remove the student from the event's checkedInStudents array in Firestore (if present)
    const eventRef = doc(db, "events", assignedEventId);
    await updateDoc(eventRef, {
      checkedInStudents: arrayRemove(studentRegNo)
    });

    // 3. Update local state
    registeredStudents = registeredStudents.filter(st => st.regNo !== studentRegNo);
    checkedInStudentIds = checkedInStudentIds.filter(id => id !== studentRegNo);

    // 4. Re-render UI elements
    renderRegistrants();
    populateWinnerDropdowns();
    renderMarksSheet();

    alert(`Successfully removed ${studentName} from the event.`);
  } catch (error) {
    console.error("Error removing student from event:", error);
    alert("Failed to remove student from event. Please try again.");
  }
};

function populateWinnerDropdowns() {
  const optionsHTML = `<option value="">-- Select Winner --</option>` + 
    registeredStudents.map(st => `<option value="${st.name} (${st.regNo})">${st.regNo} - ${st.name}</option>`).join("");

  winnerFirstSelect.innerHTML = optionsHTML;
  winnerSecondSelect.innerHTML = optionsHTML;
  winnerThirdSelect.innerHTML = optionsHTML;

  // Restore current results if any
  if (eventData.results) {
    const findOptionVal = (savedVal) => {
      if (!savedVal) return "";
      const match = registeredStudents.find(st => st.regNo === savedVal || `${st.name} (${st.regNo})` === savedVal);
      return match ? `${match.name} (${match.regNo})` : savedVal;
    };
    
    winnerFirstSelect.value = findOptionVal(eventData.results.first);
    winnerSecondSelect.value = findOptionVal(eventData.results.second);
    winnerThirdSelect.value = findOptionVal(eventData.results.third);
  }
}

function setupEventListeners() {
  // Event Info Submission
  orgEventForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const eventRef = doc(db, "events", assignedEventId);
      await updateDoc(eventRef, {
        title: eventTitleInput ? eventTitleInput.value.trim() : (eventData ? eventData.title : ""),
        description: eventDescriptionInput.value.trim(),
        date: eventDateInput.value,
        registrationCloseDate: document.getElementById("eventRegCloseDate").value,
        time: eventTimeInput.value.trim(),
        venue: eventVenueInput.value.trim(),
        coordinator: eventCoordinatorInput.value.trim(),
        rules: eventRulesInput.value.trim()
      });

      alert("Event parameters updated successfully!");
      await loadEventData();
    } catch (error) {
      console.error("Error updating event rules:", error);
      alert("Failed to update event details.");
    }
  });

  // Results Submission
  resultsForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const first = winnerFirstSelect.value;
    const second = winnerSecondSelect.value;
    const third = winnerThirdSelect.value;

    try {
      const eventRef = doc(db, "events", assignedEventId);
      await updateDoc(eventRef, {
        results: {
          first: first,
          second: second,
          third: third
        }
      });

      alert("Event results lock and publish successful!");
      await loadEventData();
    } catch (error) {
      console.error("Error submitting results:", error);
      alert("Failed to publish event results.");
    }
  });

  // Start Event Action
  if (btnStartEvent) {
    btnStartEvent.addEventListener("click", async () => {
      if (!eventData) return;
      
      const isStarted = eventData.status === "started";
      
      if (isStarted) {
        // Stop Event Logic
        if (!await confirm(`Are you sure you want to stop the event "${eventData.title}"? This will revert its status and allow you to start it again.`)) {
          return;
        }
        
        btnStartEvent.disabled = true;
        btnStartEvent.innerText = "Stopping...";
        
        try {
          const eventRef = doc(db, "events", assignedEventId);
          await updateDoc(eventRef, {
            status: "not_started"
          });
          
          alert("Event status reverted to Not Started!");
          await loadEventData();
        } catch (error) {
          console.error("Error stopping event:", error);
          alert("Failed to stop event: " + error.message);
          btnStartEvent.disabled = false;
          btnStartEvent.innerText = "Stop Event";
        }
      } else {
        // Start Event Logic
        if (!await confirm(`Are you sure you want to start the event "${eventData.title}"? This will update the event status to Live and notify all registered students via email.`)) {
          return;
        }
        
        btnStartEvent.disabled = true;
        btnStartEvent.innerText = "Starting...";
        
        try {
          const eventRef = doc(db, "events", assignedEventId);
          await updateDoc(eventRef, {
            status: "started"
          });
          
          // Notify students via email
          const emails = registeredStudents.map(st => st.email).filter(Boolean);
          if (emails.length > 0) {
            const subject = `[LIVE] ${eventData.title} has started! - Tech Manthan 6.0`;
            
            const html = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #06b6d4;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
                  <p style="color: #06b6d4; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
                </div>
                
                <div style="padding: 30px; color: #334155; line-height: 1.6;">
                  <h2 style="color: #16a34a; margin-top: 0; font-size: 20px;">⚡ Event Started!</h2>
                  <p>Dear Participant,</p>
                  <p>This is to inform you that the event <strong>${eventData.title}</strong> has officially started! Please proceed to the venue immediately.</p>
                  
                  <div style="margin: 25px 0; padding: 20px; background-color: #f8fafc; border-left: 4px solid #16a34a; border-radius: 4px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                      <tr>
                        <td style="padding: 6px 0; width: 120px; font-weight: bold; color: #475569;">🏆 Event Name:</td>
                        <td style="padding: 6px 0; color: #0f172a; font-weight: bold;">${eventData.title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">📍 Venue:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${eventData.venue || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">🕒 Start Time:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${eventData.time || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-weight: bold; color: #475569;">👤 Coordinator:</td>
                        <td style="padding: 6px 0; color: #0f172a;">${eventData.coordinator || "N/A"}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p>Please report to the coordinator at the venue immediately. Bring your student ID and registration details.</p>
                  <p style="margin-top: 25px; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                    This is an automated live notification. Please do not reply directly to this email.
                  </p>
                  <p style="margin-bottom: 0;">Best regards,<br><strong>Tech Manthan 6.0 Organizing Committee</strong></p>
                </div>
              </div>
            `;
            
            const res = await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bcc: emails.join(', '),
                subject: subject,
                html: html
              })
            });
            
            const resData = await res.json();
            console.log("Start event email broadcast status:", resData);
            if (resData.success) {
              alert("Event marked as Started and participants notified successfully!");
            } else {
              alert("Event status updated, but failed to send email notifications: " + (resData.warning || resData.error));
            }
          } else {
            alert("Event started successfully! (No registered participants to notify)");
          }
          
          await loadEventData();
        } catch (error) {
          console.error("Error starting event:", error);
          alert("Failed to start event. Please check the logs.");
          btnStartEvent.disabled = false;
          btnStartEvent.innerText = "Start Event & Notify Students";
        }
      }
    });
  }

  const btnDownloadAttendance = document.getElementById("btnDownloadAttendance");
  if (btnDownloadAttendance) {
    btnDownloadAttendance.addEventListener("click", async () => {
      if (!eventData) return;

      const prevText = btnDownloadAttendance.innerText;
      btnDownloadAttendance.disabled = true;
      btnDownloadAttendance.innerText = "Generating PDF...";

      const studentsPayload = registeredStudents.map(st => ({
        regNo: st.regNo,
        name: st.name || "N/A",
        class: st.class || "N/A",
        email: st.email || "N/A",
        checkedIn: checkedInStudentIds.includes(st.regNo)
      }));

      const orgName = localStorage.getItem("organizerName") || eventData.coordinator || "Unassigned";

      const payload = {
        type: "attendance",
        title: eventData.title,
        coordinator: orgName,
        date: eventData.date || "N/A",
        time: eventData.time || "N/A",
        venue: eventData.venue || "N/A",
        students: studentsPayload
      };

      try {
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to generate PDF");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance_${eventData.title.toLowerCase().replace(/ /g, "_")}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error generating attendance PDF:", err);
        alert("Failed to generate PDF report.");
      } finally {
        btnDownloadAttendance.disabled = false;
        btnDownloadAttendance.innerText = prevText;
      }
    });
  }

  // Populate & Handle View Round / View Judge Select change
  const viewRoundSelect = document.getElementById("viewRoundSelect");
  const viewJudgeSelect = document.getElementById("viewJudgeSelect");

  if (viewRoundSelect) {
    viewRoundSelect.addEventListener("change", () => {
      populateJudgeSelect();
      renderMarksSheet();
    });
  }

  if (viewJudgeSelect) {
    viewJudgeSelect.addEventListener("change", renderMarksSheet);
  }

  // Print PDF Marksheet per Round & Per Judge
  if (btnPrintMarksheet) {
    btnPrintMarksheet.addEventListener("click", async () => {
      if (!eventData || !eventData.criteria || eventData.criteria.length === 0) {
        alert("No criteria configured for this event.");
        return;
      }

      const selectedRound = viewRoundSelect ? viewRoundSelect.value : "Round 1";
      const selectedJudge = viewJudgeSelect ? viewJudgeSelect.value : "all";
      const selectedJudgeText = (viewJudgeSelect && viewJudgeSelect.selectedIndex >= 0) ? viewJudgeSelect.options[viewJudgeSelect.selectedIndex].text : "All Judges";

      const criteria = eventData.criteria;

      const prevText = btnPrintMarksheet.innerText;
      btnPrintMarksheet.disabled = true;
      btnPrintMarksheet.innerText = "Generating PDF...";

      // Filter students for selectedRound
      const roundPromotions = (eventData.roundPromotions && eventData.roundPromotions[selectedRound])
        ? eventData.roundPromotions[selectedRound].promotedStudents
        : null;

      let targetStudents = [];
      if (selectedRound === "Round 1" || !roundPromotions) {
        targetStudents = registeredStudents;
      } else {
        targetStudents = registeredStudents.filter(st => roundPromotions.includes(st.regNo));
      }

      let roundMarksSheet = {};
      if (selectedRound === "Round 1") {
        roundMarksSheet = (eventData.rounds && eventData.rounds["Round 1"] && eventData.rounds["Round 1"].marksSheet)
          ? eventData.rounds["Round 1"].marksSheet
          : (eventData.marksSheet || {});
      } else if (eventData.rounds && eventData.rounds[selectedRound] && eventData.rounds[selectedRound].marksSheet) {
        roundMarksSheet = eventData.rounds[selectedRound].marksSheet;
      } else {
        roundMarksSheet = eventData.marksSheet || {};
      }

      const headers = ["Sl No", "Reg No", "Student Name", "Class", ...criteria, "Total Score"];
      const rows = targetStudents.map((st, idx) => {
        const studentEntry = roundMarksSheet[st.regNo] || {};
        const { critVals, finalTotal } = getStudentScoresForRoundAndJudge(studentEntry, criteria, selectedJudge);
        return [idx + 1, st.regNo, st.name || "N/A", st.class || "N/A", ...critVals, `${finalTotal} pts`];
      });

      const orgName = localStorage.getItem("organizerName") || eventData.coordinator || "Unassigned";

      const payload = {
        type: "marksheet",
        title: eventData.title,
        round: selectedRound,
        judge: selectedJudge !== "all" ? selectedJudgeText : null,
        coordinator: orgName,
        date: eventData.date || "N/A",
        time: eventData.time || "N/A",
        venue: eventData.venue || "N/A",
        headers: headers,
        rows: rows
      };

      try {
        const response = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to generate PDF");

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const judgeFileSuffix = selectedJudge !== "all" ? `_${selectedJudge}` : "";
        a.download = `marksheet_${eventData.title.toLowerCase().replace(/ /g, "_")}_${selectedRound.toLowerCase().replace(/ /g, "_")}${judgeFileSuffix}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Error generating marksheet PDF:", err);
        alert("Failed to generate PDF marksheet.");
      } finally {
        btnPrintMarksheet.disabled = false;
        btnPrintMarksheet.innerText = prevText;
      }
    });
  }

  // Export Excel CSV Sheet per Round & Per Judge
  const btnExportExcel = document.getElementById("btnExportExcel");
  if (btnExportExcel) {
    btnExportExcel.addEventListener("click", () => {
      if (!eventData || !eventData.criteria || eventData.criteria.length === 0) {
        alert("No criteria configured for this event.");
        return;
      }

      const selectedRound = viewRoundSelect ? viewRoundSelect.value : "Round 1";
      const selectedJudge = viewJudgeSelect ? viewJudgeSelect.value : "all";
      const criteria = eventData.criteria;

      // Filter students for selectedRound
      const roundPromotions = (eventData.roundPromotions && eventData.roundPromotions[selectedRound])
        ? eventData.roundPromotions[selectedRound].promotedStudents
        : null;

      let targetStudents = [];
      if (selectedRound === "Round 1" || !roundPromotions) {
        targetStudents = registeredStudents;
      } else {
        targetStudents = registeredStudents.filter(st => roundPromotions.includes(st.regNo));
      }

      let roundMarksSheet = {};
      if (selectedRound === "Round 1") {
        roundMarksSheet = (eventData.rounds && eventData.rounds["Round 1"] && eventData.rounds["Round 1"].marksSheet)
          ? eventData.rounds["Round 1"].marksSheet
          : (eventData.marksSheet || {});
      } else if (eventData.rounds && eventData.rounds[selectedRound] && eventData.rounds[selectedRound].marksSheet) {
        roundMarksSheet = eventData.rounds[selectedRound].marksSheet;
      } else {
        roundMarksSheet = eventData.marksSheet || {};
      }

      const headers = ["Sl No", "Reg No", "Student Name", "Class", ...criteria, "Total Score"];
      let csvContent = "\uFEFF" + headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

      targetStudents.forEach((st, idx) => {
        const studentEntry = roundMarksSheet[st.regNo] || {};
        const { critVals, finalTotal } = getStudentScoresForRoundAndJudge(studentEntry, criteria, selectedJudge);
        const row = [idx + 1, st.regNo, st.name || "N/A", st.class || "N/A", ...critVals, finalTotal];
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const judgeFileSuffix = selectedJudge !== "all" ? `_${selectedJudge}` : "";
      link.setAttribute("download", `${eventData.title.toLowerCase().replace(/ /g, "_")}_${selectedRound.toLowerCase().replace(/ /g, "_")}${judgeFileSuffix}_marksheet.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  // Judging Marks Inputs calculations
  if (marksTableBody) {
    marksTableBody.addEventListener("input", (e) => {
      if (e.target.classList.contains("marks-input")) {
        const regNo = e.target.dataset.reg;
        calculateStudentTotal(regNo);
      }
    });
  }

  // Copy Shareable Judging Link
  if (btnShareJudging) {
    btnShareJudging.addEventListener("click", () => {
      if (!assignedEventId) return;
      const shareUrl = `${window.location.origin}/j/${assignedEventId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        const prevText = btnShareJudging.innerText;
        btnShareJudging.innerText = "Link Copied ✓";
        btnShareJudging.style.borderColor = "var(--neon-green)";
        btnShareJudging.style.color = "var(--neon-green)";
        setTimeout(() => {
          btnShareJudging.innerText = prevText;
          btnShareJudging.style.borderColor = "";
          btnShareJudging.style.color = "";
        }, 2000);
      }).catch(err => {
        console.error("Clipboard copy failed:", err);
        alert("Please copy this link: " + shareUrl);
      });
    });
  }

  // Save Marks Sheet
  if (btnSaveMarks) {
    btnSaveMarks.addEventListener("click", async () => {
      if (!eventData || !eventData.criteria || eventData.criteria.length === 0) return;
      
      btnSaveMarks.disabled = true;
      btnSaveMarks.innerText = "Saving...";

      const marksSheet = {};
      let invalidScore = false;
      registeredStudents.forEach(st => {
        const scores = {};
        let total = 0;
        const inputs = document.querySelectorAll(`input.marks-input[data-reg="${st.regNo}"]`);
        inputs.forEach(input => {
          const score = parseFloat(input.value) || 0;
          if (score > 50) {
            invalidScore = true;
          }
          scores[input.dataset.criteria] = score;
          total += score;
        });
        marksSheet[st.regNo] = { scores, total };
      });

      if (invalidScore) {
        alert("Failed to save: Marks for each criterion cannot exceed 50.");
        btnSaveMarks.disabled = false;
        btnSaveMarks.innerText = "Save Marks Sheet";
        return;
      }

      try {
        const eventRef = doc(db, "events", assignedEventId);
        await updateDoc(eventRef, {
          marksSheet: marksSheet
        });

        alert("Marks sheet saved successfully!");
        await loadEventData();
        renderMarksSheet();
      } catch (error) {
        console.error("Error saving marks sheet:", error);
        alert("Failed to save marks sheet.");
      } finally {
        btnSaveMarks.disabled = false;
        btnSaveMarks.innerText = "Save Marks Sheet";
      }
    });
  }

  // Automate Winner Announcement
  if (btnAutomateWinners) {
    btnAutomateWinners.addEventListener("click", async () => {
      if (registeredStudents.length === 0) {
        alert("No students registered for this event.");
        return;
      }

      // Calculate totals for all registered students based on judges average totals
      const savedMarksSheet = eventData.marksSheet || {};
      const leaderboard = registeredStudents.map(st => {
        const studentSaved = savedMarksSheet[st.regNo] || {};
        const judgeKeys = Object.keys(studentSaved).filter(k => studentSaved[k] && studentSaved[k].scores !== undefined);
        
        let avgTotal = 0;
        
        if (studentSaved.scores !== undefined) {
          avgTotal = studentSaved.total || 0;
        } else if (judgeKeys.length > 0) {
          let sumTotal = 0;
          judgeKeys.forEach(jk => {
            sumTotal += studentSaved[jk].total || 0;
          });
          avgTotal = parseFloat((sumTotal / judgeKeys.length).toFixed(2));
        }

        return {
          regNo: st.regNo,
          name: st.name || "N/A",
          total: avgTotal
        };
      });

      // Sort descending by total score
      leaderboard.sort((a, b) => b.total - a.total);

      const first = leaderboard[0];
      const second = leaderboard[1] || null;
      const third = leaderboard[2] || null;

      let msg = `System calculated winners based on leaderboard totals:\n\n`;
      msg += `🥇 1st Place: ${first.name} (${first.regNo}) - ${first.total} pts\n`;
      if (second) {
        msg += `🥈 2nd Place: ${second.name} (${second.regNo}) - ${second.total} pts\n`;
      }
      if (third) {
        msg += `🥉 3rd Place: ${third.name} (${third.regNo}) - ${third.total} pts\n`;
      }
      msg += `\nDo you want to confirm and announce these results to the students directory?`;

      if (!await confirm(msg)) return;

      btnAutomateWinners.disabled = true;
      btnAutomateWinners.innerText = "Publishing...";

      try {
        const eventRef = doc(db, "events", assignedEventId);
        const resultsData = {
          first: `${first.name} (${first.regNo})`,
          second: second ? `${second.name} (${second.regNo})` : "",
          third: third ? `${third.name} (${third.regNo})` : ""
        };

        await updateDoc(eventRef, {
          results: resultsData
        });

        alert("Winners announced successfully!");
        await loadEventData();
        populateWinnerDropdowns(); // Populate the select dropdowns in the publish tab
      } catch (error) {
        console.error("Error automating winners:", error);
        alert("Failed to publish results.");
      } finally {
        btnAutomateWinners.disabled = false;
        btnAutomateWinners.innerText = "Automate Winners Announcement";
      }
    });
  }

  // Email Broadcast Announcement Submission
  const announcementForm = document.getElementById("announcementEmailForm");
  const announcementSubject = document.getElementById("announcementSubject");
  const announcementMessage = document.getElementById("announcementMessage");
  const btnSendAnnouncement = document.getElementById("btnSendAnnouncement");

  if (announcementForm) {
    announcementForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (registeredStudents.length === 0) {
        alert("No students registered for this event.");
        return;
      }

      const emails = registeredStudents.map(st => st.email).filter(Boolean);
      if (emails.length === 0) {
        alert("None of the registered students have provided an email address.");
        return;
      }

      const subject = announcementSubject.value.trim();
      const messageBody = announcementMessage.value.trim();

      if (!await confirm(`Are you sure you want to broadcast this announcement email to ${emails.length} registered students?`)) {
        return;
      }

      btnSendAnnouncement.disabled = true;
      btnSendAnnouncement.innerText = "Sending...";

      // Format the announcement body professionally
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #0f172a; padding: 25px; text-align: center; border-bottom: 3px solid #06b6d4;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">TECH MANTHAN 6.0</h1>
            <p style="color: #06b6d4; margin: 5px 0 0 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">Dr. B.B Hegde First Grade College, Kundapura</p>
          </div>
          
          <div style="padding: 30px; color: #334155; line-height: 1.6;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">${subject}</h2>
            
            <p style="white-space: pre-line; margin-top: 20px; color: #334155;">${messageBody}</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b;">
              <p style="margin: 0;"><strong>Event context:</strong> ${eventData ? eventData.title : 'Tech Manthan 6.0 Event'}</p>
              <p style="margin: 4px 0 0 0;"><strong>Coordinator:</strong> ${localStorage.getItem("organizerName") || 'Event Team'}</p>
            </div>
          </div>
          
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            This email was sent to registered participants of Tech Manthan 6.0.
          </div>
        </div>
      `;

      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bcc: emails.join(', '),
            subject: `[Announcement] ${subject} - Tech Manthan 6.0`,
            html: html
          })
        });

        const data = await res.json();
        if (data.success) {
          alert("Announcement emails broadcasted successfully!");
          announcementSubject.value = "";
          announcementMessage.value = "";
        } else {
          alert("Failed to send email. " + (data.warning || data.error));
        }
      } catch (err) {
        console.error("Announcement dispatch error:", err);
        alert("An error occurred while broadcasting emails.");
      } finally {
        btnSendAnnouncement.disabled = false;
        btnSendAnnouncement.innerText = "Send Announcement Email";
      }
    });
  }

  // Toggle Judging Config Panel
  if (btnToggleJudgingConfig && judgingConfigPanel) {
    btnToggleJudgingConfig.addEventListener("click", () => {
      const isHidden = judgingConfigPanel.style.display === "none" || !judgingConfigPanel.style.display;
      judgingConfigPanel.style.display = isHidden ? "block" : "none";
    });
  }

  // Handle Judging Config Form Submission
  if (orgJudgingForm) {
    orgJudgingForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const judgesInput = orgAllottedJudges.value.trim();
      const criteriaInput = orgCriteria.value.trim();

      const judgesList = judgesInput ? judgesInput.split(",").map(j => j.trim()).filter(Boolean) : [];
      const criteriaList = criteriaInput ? criteriaInput.split(",").map(c => c.trim()).filter(Boolean) : [];

      if (criteriaList.length === 0) {
        alert("Please set at least one judging criterion.");
        return;
      }

      const submitBtn = orgJudgingForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.innerText = "Saving...";

      try {
        const eventRef = doc(db, "events", assignedEventId);
        await updateDoc(eventRef, {
          judges: judgesList,
          criteria: criteriaList
        });

        alert("Judging parameters configured successfully!");
        judgingConfigPanel.style.display = "none";
        
        await loadEventData();
        renderMarksSheet();
      } catch (error) {
        console.error("Error setting judging parameters:", error);
        alert("Failed to save judging configuration.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Save Configuration";
      }
    });
  }

  // Handle Assign Judge Form Submit
  const assignJudgeForm = document.getElementById("assignJudgeForm");
  if (assignJudgeForm) {
    assignJudgeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const roundName = document.getElementById("selectAssignRound").value;
      const judgeName = document.getElementById("assignJudgeNameInput").value.trim();

      if (!judgeName) {
        alert("Please enter judge name.");
        return;
      }

      const link = `${window.location.protocol}//${window.location.host}/judge.html?event=${assignedEventId}&round=${encodeURIComponent(roundName)}&judge=${encodeURIComponent(judgeName)}`;

      const judgeAssignments = eventData.judgeAssignments || [];
      const newAsgn = {
        id: Date.now().toString(),
        round: roundName,
        judgeName: judgeName,
        link: link,
        createdAt: new Date().toISOString()
      };

      judgeAssignments.push(newAsgn);

      try {
        const eventRef = doc(db, "events", assignedEventId);
        await updateDoc(eventRef, { judgeAssignments });
        eventData.judgeAssignments = judgeAssignments;

        document.getElementById("assignJudgeNameInput").value = "";
        renderJudgeAssignments();
        alert(`Judge ${judgeName} assigned for ${roundName}! Scoring link generated.`);
      } catch (err) {
        console.error("Error saving judge assignment:", err);
        alert("Failed to save judge assignment.");
      }
    });
  }

  // Handle Promote Top N Students Form Submit
  const promoteStudentsForm = document.getElementById("promoteStudentsForm");
  if (promoteStudentsForm) {
    promoteStudentsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fromRound = document.getElementById("fromRoundSelect").value;
      const toRound = document.getElementById("toRoundSelect").value;
      const topN = parseInt(document.getElementById("topNCountInput").value);

      if (fromRound === toRound) {
        alert("Target round (TO ROUND) must be different from source round (FROM ROUND).");
        return;
      }

      if (!topN || topN < 1) {
        alert("Please enter a valid number of students to promote (N).");
        return;
      }

      // Calculate scores for fromRound
      const studentScores = calculateStudentScoresForRound(fromRound);
      if (studentScores.length === 0) {
        alert(`No student scores found for ${fromRound}. Please make sure judges have entered and saved scores for ${fromRound} first.`);
        return;
      }

      // Sort descending by average score
      studentScores.sort((a, b) => b.avgScore - a.avgScore);

      // Select top N
      const promoted = studentScores.slice(0, topN);
      const promotedRegNos = promoted.map(s => s.regNo);

      const roundPromotions = eventData.roundPromotions || {};
      roundPromotions[toRound] = {
        fromRound: fromRound,
        targetRound: toRound,
        topN: topN,
        promotedStudents: promotedRegNos,
        promotedDetails: promoted.map(s => ({ regNo: s.regNo, name: s.name, class: s.class, avgScore: s.avgScore })),
        promotedAt: new Date().toISOString()
      };

      try {
        const eventRef = doc(db, "events", assignedEventId);
        await updateDoc(eventRef, { roundPromotions });
        eventData.roundPromotions = roundPromotions;

        renderRoundPromotions();

        // Broadcast email notification to promoted students
        const emails = promoted.map(p => {
          const st = registeredStudents.find(s => s.regNo === p.regNo);
          return st ? st.email : null;
        }).filter(e => e && e.includes("@"));

        if (emails.length > 0) {
          const htmlMessage = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 25px 20px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 700;">🎉 Round Qualification Notice!</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Tech Manthan 6.0 - ${eventData.title}</p>
              </div>
              <div style="padding: 25px; color: #1e293b; line-height: 1.6;">
                <p style="font-size: 16px; margin-top: 0;">Congratulations!</p>
                <p>Based on your performance in <strong>${fromRound}</strong>, you have been selected and officially promoted to <strong>${toRound}</strong> in <strong>${eventData.title}</strong>!</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0;">
                  <p style="margin: 0; font-weight: 600; color: #475569; font-size: 13px;">QUALIFICATION DETAILS</p>
                  <p style="margin: 5px 0 0 0; color: #0f172a; font-weight: 500;">
                    🏆 Event: ${eventData.title}<br>
                    🎯 Target Round: ${toRound}<br>
                    📍 Venue: ${eventData.venue || "Event Venue"}<br>
                    📅 Date: ${eventData.date || "Scheduled Date"}
                  </p>
                </div>
                <p>Please report to the venue on time for <strong>${toRound}</strong>. Good luck!</p>
              </div>
              <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
                This is an automated notification from Tech Manthan 6.0 Event Coordinators.
              </div>
            </div>
          `;

          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bcc: emails.join(', '),
              subject: `🎉 Congratulations! You qualified for ${toRound} in ${eventData.title}`,
              html: htmlMessage
            })
          }).catch(err => console.error("Email notification error:", err));
        }

        alert(`Success! Top ${promoted.length} students from ${fromRound} have been promoted to ${toRound}! Email notifications have been dispatched.`);
      } catch (err) {
        console.error("Error saving round promotion:", err);
        alert("Failed to save round promotion.");
      }
    });
  }

  // Handle Add Student Coordinator Form Submit (Max 2)
  const addStudentCoordForm = document.getElementById("addStudentCoordForm");
  if (addStudentCoordForm) {
    addStudentCoordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const currentList = eventData.studentCoordinators || [];

      if (currentList.length >= 2) {
        alert("Maximum limit reached: You can only assign up to 2 student coordinators per event.");
        return;
      }

      const name = document.getElementById("scNameInput").value.trim();
      const rollNo = document.getElementById("scRollNoInput").value.trim().toUpperCase();
      const studentClass = document.getElementById("scClassSelect").value;
      const phone = document.getElementById("scPhoneInput").value.trim();

      if (!name || !rollNo || !studentClass || !phone) {
        alert("Please fill all student coordinator fields.");
        return;
      }

      if (studentClass !== "III BCA (A)" && studentClass !== "III BCA (B)") {
        alert("Student coordinators can only be selected from III BCA (A) or III BCA (B).");
        return;
      }

      if (currentList.some(sc => sc.rollNo === rollNo)) {
        alert(`Roll No "${rollNo}" is already added as a student coordinator for this event.`);
        return;
      }

      const newCoord = {
        name,
        rollNo,
        studentClass,
        phone,
        addedAt: new Date().toISOString()
      };

      currentList.push(newCoord);

      try {
        const eventRef = doc(db, "events", assignedEventId);
        await updateDoc(eventRef, { studentCoordinators: currentList });
        eventData.studentCoordinators = currentList;

        document.getElementById("scNameInput").value = "";
        document.getElementById("scRollNoInput").value = "";
        document.getElementById("scClassSelect").value = "";
        document.getElementById("scPhoneInput").value = "";

        renderStudentCoordinators();
        alert(`Student coordinator ${name} (${studentClass}) added successfully!`);
      } catch (err) {
        console.error("Error adding student coordinator:", err);
        alert("Failed to add student coordinator.");
      }
    });
  }
}

function populateJudgeSelect() {
  const viewJudgeSelect = document.getElementById("viewJudgeSelect");
  if (!viewJudgeSelect) return;

  const currentSelection = viewJudgeSelect.value || "all";
  viewJudgeSelect.innerHTML = `<option value="all">All Judges (Consolidated Avg)</option>`;

  const judgeSet = new Map();

  if (eventData && eventData.judges && Array.isArray(eventData.judges)) {
    eventData.judges.forEach(j => {
      if (j && j.trim()) {
        const name = j.trim();
        const key = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        judgeSet.set(key, name);
      }
    });
  }

  const allSheets = [eventData?.marksSheet || {}];
  if (eventData?.rounds) {
    Object.keys(eventData.rounds).forEach(rKey => {
      if (eventData.rounds[rKey]?.marksSheet) {
        allSheets.push(eventData.rounds[rKey].marksSheet);
      }
    });
  }

  allSheets.forEach(sheet => {
    Object.keys(sheet).forEach(regNo => {
      const entry = sheet[regNo];
      if (entry && typeof entry === "object" && entry.scores === undefined) {
        Object.keys(entry).forEach(jKey => {
          if (!judgeSet.has(jKey)) {
            const jName = entry[jKey]?.judgeName || jKey.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
            judgeSet.set(jKey, jName);
          }
        });
      }
    });
  });

  judgeSet.forEach((jName, jKey) => {
    viewJudgeSelect.innerHTML += `<option value="${jKey}">${jName}</option>`;
  });

  if (currentSelection && [...viewJudgeSelect.options].some(o => o.value === currentSelection)) {
    viewJudgeSelect.value = currentSelection;
  }
}

function getStudentScoresForRoundAndJudge(studentEntry, criteria, selectedJudge) {
  const criteriaScores = {};
  criteria.forEach(c => criteriaScores[c] = []);
  let totalSum = 0;
  let judgeCount = 0;

  if (!studentEntry) {
    return { critVals: criteria.map(() => 0), finalTotal: 0, judgeCount: 0 };
  }

  if (studentEntry.scores !== undefined) {
    if (selectedJudge === "all" || selectedJudge === "legacy") {
      criteria.forEach(c => criteriaScores[c].push(studentEntry.scores[c] || 0));
      totalSum = studentEntry.total || 0;
      judgeCount = 1;
    }
  } else {
    if (selectedJudge === "all") {
      Object.keys(studentEntry).forEach(jKey => {
        const entry = studentEntry[jKey];
        if (entry && entry.scores) {
          criteria.forEach(c => {
            if (entry.scores[c] !== undefined) criteriaScores[c].push(entry.scores[c]);
          });
          totalSum += entry.total || 0;
          judgeCount++;
        }
      });
    } else {
      let judgeEntry = studentEntry[selectedJudge];
      if (!judgeEntry) {
        const foundKey = Object.keys(studentEntry).find(k => k.toLowerCase() === selectedJudge.toLowerCase());
        if (foundKey) judgeEntry = studentEntry[foundKey];
      }

      if (judgeEntry && judgeEntry.scores) {
        criteria.forEach(c => {
          if (judgeEntry.scores[c] !== undefined) criteriaScores[c].push(judgeEntry.scores[c]);
        });
        totalSum = judgeEntry.total || 0;
        judgeCount = 1;
      }
    }
  }

  const critVals = criteria.map(c => {
    const vals = criteriaScores[c];
    return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
  });

  const finalTotal = judgeCount > 0 ? parseFloat((totalSum / judgeCount).toFixed(1)) : 0;

  return { critVals, finalTotal, judgeCount };
}

function renderMarksSheet() {
  populateJudgeSelect();

  const viewRoundSelect = document.getElementById("viewRoundSelect");
  const viewJudgeSelect = document.getElementById("viewJudgeSelect");
  const selectedRound = viewRoundSelect ? viewRoundSelect.value : "Round 1";
  const selectedJudge = viewJudgeSelect ? viewJudgeSelect.value : "all";

  if (!eventData || !eventData.criteria || eventData.criteria.length === 0) {
    marksTableHeaderRow.innerHTML = `
      <th style="width: 80px; text-align: center;">Sl No</th>
      <th style="width: 150px;">Reg No</th>
      <th>Student Name</th>
      <th>Class</th>
      <th style="width: 150px; text-align: center;">Total Score</th>
    `;
    marksTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-sub); padding: 20px;">
          Judging criteria have not been configured for this event yet. Click "Setup Criteria & Judges" above.
        </td>
      </tr>
    `;
    return;
  }

  const criteria = eventData.criteria;

  let headerHTML = `
    <th style="width: 60px; text-align: center;">SL NO</th>
    <th style="width: 120px;">REG NO</th>
    <th>STUDENT NAME</th>
    <th style="width: 110px;">CLASS</th>
    ${criteria.map(c => `<th style="text-align: center;">${c.toUpperCase()}</th>`).join("")}
    <th style="width: 130px; text-align: center; color: var(--neon-cyan);">TOTAL</th>
  `;
  marksTableHeaderRow.innerHTML = headerHTML;

  const roundPromotions = (eventData.roundPromotions && eventData.roundPromotions[selectedRound])
    ? eventData.roundPromotions[selectedRound].promotedStudents
    : null;

  let targetStudents = [];
  if (selectedRound === "Round 1" || !roundPromotions) {
    targetStudents = registeredStudents;
  } else {
    targetStudents = registeredStudents.filter(st => roundPromotions.includes(st.regNo));
  }

  if (targetStudents.length === 0) {
    marksTableBody.innerHTML = `
      <tr>
        <td colspan="${5 + criteria.length}" style="text-align: center; color: var(--text-sub); padding: 20px;">
          ${selectedRound !== "Round 1" ? `No students promoted to ${selectedRound} yet.` : "No registered students found."}
        </td>
      </tr>
    `;
    return;
  }

  let roundMarksSheet = {};
  if (selectedRound === "Round 1") {
    roundMarksSheet = (eventData.rounds && eventData.rounds["Round 1"] && eventData.rounds["Round 1"].marksSheet)
      ? eventData.rounds["Round 1"].marksSheet
      : (eventData.marksSheet || {});
  } else if (eventData.rounds && eventData.rounds[selectedRound] && eventData.rounds[selectedRound].marksSheet) {
    roundMarksSheet = eventData.rounds[selectedRound].marksSheet;
  } else {
    roundMarksSheet = eventData.marksSheet || {};
  }

  marksTableBody.innerHTML = targetStudents.map((st, index) => {
    const studentEntry = roundMarksSheet[st.regNo] || {};
    const { critVals, finalTotal, judgeCount } = getStudentScoresForRoundAndJudge(studentEntry, criteria, selectedJudge);

    const criteriaCellsHTML = critVals.map(val => {
      return `<td style="text-align: center; font-weight: bold; font-family: monospace;">${judgeCount > 0 ? val : "-"}</td>`;
    }).join("");

    return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong style="color: var(--neon-purple);">${st.regNo}</strong></td>
        <td>${st.name || "N/A"}</td>
        <td>${st.class || "N/A"}</td>
        ${criteriaCellsHTML}
        <td style="text-align: center; font-weight: bold; color: var(--neon-cyan); font-family: monospace; font-size: 1.05rem;">
          ${finalTotal}
        </td>
      </tr>
    `;
  }).join("");
}

function calculateStudentTotal(regNo) {
  const inputs = document.querySelectorAll(`input.marks-input[data-reg="${regNo}"]`);
  let sum = 0;
  inputs.forEach(input => {
    const val = parseFloat(input.value) || 0;
    sum += val;
  });
  const totalEl = document.getElementById(`total-${regNo}`);
  if (totalEl) {
    totalEl.innerText = sum;
  }
  return sum;
}

// ==========================================
// ROUND & JUDGE MANAGEMENT FUNCTIONS
// ==========================================

function renderJudgeAssignments() {
  const tableBody = document.getElementById("judgeAssignmentsTableBody");
  if (!tableBody) return;

  const judgeAssignments = eventData.judgeAssignments || [];
  if (judgeAssignments.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-sub);">No judges assigned for this event yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = judgeAssignments.map(asgn => {
    const link = asgn.link || `${window.location.protocol}//${window.location.host}/judge.html?event=${assignedEventId}&round=${encodeURIComponent(asgn.round)}&judge=${encodeURIComponent(asgn.judgeName)}`;
    return `
      <tr>
        <td><strong style="color: var(--neon-cyan);">${asgn.round}</strong></td>
        <td><strong>${asgn.judgeName}</strong></td>
        <td>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" readonly value="${link}" style="flex: 1; font-size: 0.8rem; padding: 4px 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); color: var(--neon-cyan); border-radius: 4px;" id="link-input-${asgn.id}">
            <button class="cyber-btn" style="font-size: 0.75rem; padding: 4px 8px;" onclick="copyJudgeLink('${link}', this)">📋 Copy</button>
          </div>
        </td>
        <td>
          <button class="cyber-btn cyber-btn-red" style="font-size: 0.75rem; padding: 4px 8px;" onclick="deleteJudgeAssignment('${asgn.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.copyJudgeLink = function(link, btn) {
  navigator.clipboard.writeText(link).then(() => {
    const origText = btn.innerText;
    btn.innerText = "✓ Copied!";
    btn.style.color = "var(--neon-green)";
    setTimeout(() => {
      btn.innerText = origText;
      btn.style.color = "";
    }, 1500);
  }).catch(err => {
    alert("Scoring Link: " + link);
  });
};

window.deleteJudgeAssignment = async function(asgnId) {
  if (!confirm("Are you sure you want to delete this judge assignment link?")) return;

  try {
    const judgeAssignments = (eventData.judgeAssignments || []).filter(a => a.id !== asgnId);
    const eventRef = doc(db, "events", assignedEventId);
    await updateDoc(eventRef, { judgeAssignments });
    eventData.judgeAssignments = judgeAssignments;
    renderJudgeAssignments();
    alert("Judge assignment deleted.");
  } catch (error) {
    console.error("Error deleting judge assignment:", error);
    alert("Failed to delete judge assignment.");
  }
};

function renderRoundPromotions() {
  const tableBody = document.getElementById("roundPromotionsTableBody");
  if (!tableBody) return;

  const roundPromotions = eventData.roundPromotions || {};
  const roundsList = Object.keys(roundPromotions);

  if (roundsList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-sub);">No round promotions created yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = roundsList.map(targetRound => {
    const promo = roundPromotions[targetRound];

    return `
      <tr>
        <td><strong style="color: var(--neon-purple);">${targetRound}</strong> <span style="font-size: 0.75rem; color: var(--text-sub);">(From ${promo.fromRound})</span></td>
        <td style="text-align: center;"><strong style="color: var(--neon-green); font-size: 1.1rem;">${promo.promotedStudents.length} Students</strong></td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button class="cyber-btn cyber-btn-blue" style="font-size: 0.75rem; padding: 6px 10px;" onclick="downloadPromotedStudentsExcel('${targetRound}')">
              📊 Excel (.csv)
            </button>
            <button class="cyber-btn cyber-btn-purple" style="font-size: 0.75rem; padding: 6px 10px;" onclick="downloadPromotedStudentsPDF('${targetRound}', this)">
              🖨️ PDF (.pdf)
            </button>
          </div>
        </td>
        <td style="text-align: center;">
          <button class="cyber-btn cyber-btn-red" style="font-size: 0.75rem; padding: 6px 10px;" onclick="clearRoundPromotion('${targetRound}')">Reset Promotion</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.downloadPromotedStudentsExcel = function(targetRound) {
  const roundPromotions = eventData.roundPromotions || {};
  const promo = roundPromotions[targetRound];
  if (!promo) {
    alert("No promotion data found for " + targetRound);
    return;
  }

  const promotedDetails = promo.promotedDetails || [];
  const headers = ["Sl No", "Reg No / Roll No", "Student Name", "Class", `Average Score in ${promo.fromRound}`];
  let csvContent = "\uFEFF" + headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

  promotedDetails.forEach((d, idx) => {
    const row = [idx + 1, d.regNo, d.name || "N/A", d.class || "N/A", d.avgScore || "N/A"];
    csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${eventData.title.toLowerCase().replace(/ /g, "_")}_${targetRound.toLowerCase().replace(/ /g, "_")}_promoted_students.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

window.downloadPromotedStudentsPDF = async function(targetRound, btnElement) {
  const roundPromotions = eventData.roundPromotions || {};
  const promo = roundPromotions[targetRound];
  if (!promo) {
    alert("No promotion data found for " + targetRound);
    return;
  }

  const promotedDetails = promo.promotedDetails || [];
  const headers = ["Sl No", "Reg No / Roll No", "Student Name", "Class", `Average Score (${promo.fromRound})` ];
  const rows = promotedDetails.map((d, idx) => [
    idx + 1,
    d.regNo,
    d.name || "N/A",
    d.class || "N/A",
    `${d.avgScore !== undefined ? d.avgScore : 'N/A'} pts`
  ]);

  let origText = "🖨️ PDF (.pdf)";
  if (btnElement) {
    origText = btnElement.innerText;
    btnElement.disabled = true;
    btnElement.innerText = "Generating...";
  }

  const orgName = localStorage.getItem("organizerName") || eventData.coordinator || "Unassigned";

  const payload = {
    type: "marksheet",
    title: `${eventData.title} - Qualified Students for ${targetRound}`,
    round: targetRound,
    coordinator: orgName,
    date: eventData.date || "N/A",
    time: eventData.time || "N/A",
    venue: eventData.venue || "N/A",
    headers: headers,
    rows: rows
  };

  try {
    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Failed to generate PDF");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventData.title.toLowerCase().replace(/ /g, "_")}_${targetRound.toLowerCase().replace(/ /g, "_")}_promoted_students.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Error generating PDF list:", err);
    alert("Failed to generate PDF for promoted students.");
  } finally {
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerText = origText;
    }
  }
};

window.clearRoundPromotion = async function(targetRound) {
  if (!confirm(`Are you sure you want to reset promotions for ${targetRound}?`)) return;

  try {
    const roundPromotions = eventData.roundPromotions || {};
    delete roundPromotions[targetRound];
    
    const eventRef = doc(db, "events", assignedEventId);
    await updateDoc(eventRef, { roundPromotions });
    eventData.roundPromotions = roundPromotions;
    renderRoundPromotions();
    alert(`Promotions for ${targetRound} have been reset.`);
  } catch (error) {
    console.error("Error resetting round promotion:", error);
    alert("Failed to reset promotion.");
  }
};

function calculateStudentScoresForRound(roundName) {
  let marksSheetToUse = {};
  if (roundName === "Round 1") {
    marksSheetToUse = (eventData.rounds && eventData.rounds["Round 1"] && eventData.rounds["Round 1"].marksSheet)
      ? eventData.rounds["Round 1"].marksSheet
      : (eventData.marksSheet || {});
  } else if (eventData.rounds && eventData.rounds[roundName]) {
    marksSheetToUse = eventData.rounds[roundName].marksSheet || {};
  } else if (eventData.marksSheet) {
    marksSheetToUse = eventData.marksSheet;
  }

  const resultsList = [];

  registeredStudents.forEach(st => {
    const studentEntry = marksSheetToUse[st.regNo] || {};
    let totalSum = 0;
    let judgeCount = 0;

    if (studentEntry.scores !== undefined && studentEntry.total !== undefined) {
      totalSum += studentEntry.total;
      judgeCount = 1;
    } else {
      Object.keys(studentEntry).forEach(judgeKey => {
        const jVal = studentEntry[judgeKey];
        if (jVal && jVal.total !== undefined) {
          totalSum += jVal.total;
          judgeCount++;
        }
      });
    }

    if (judgeCount > 0) {
      const avgScore = totalSum / judgeCount;
      resultsList.push({
        regNo: st.regNo,
        name: st.name || st.regNo,
        class: st.class || "N/A",
        avgScore: parseFloat(avgScore.toFixed(2))
      });
    }
  });

  return resultsList;
}

// ==========================================
// STUDENT COORDINATORS MANAGEMENT (MAX 2)
// ==========================================

function renderStudentCoordinators() {
  const tableBody = document.getElementById("studentCoordTableBody");
  const countBadge = document.getElementById("studentCoordCountBadge");
  const addBtn = document.getElementById("btnAddStudentCoord");
  if (!tableBody) return;

  const studentCoordinators = eventData.studentCoordinators || [];
  if (countBadge) {
    countBadge.innerText = `Assigned: ${studentCoordinators.length} / 2`;
  }

  if (addBtn) {
    if (studentCoordinators.length >= 2) {
      addBtn.disabled = true;
      addBtn.style.opacity = "0.5";
      addBtn.style.cursor = "not-allowed";
      addBtn.innerText = "LIMIT REACHED (2/2)";
    } else {
      addBtn.disabled = false;
      addBtn.style.opacity = "1";
      addBtn.style.cursor = "pointer";
      addBtn.innerText = "ADD COORDINATOR";
    }
  }

  if (studentCoordinators.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-sub);">No student coordinators assigned yet.</td></tr>`;
    return;
  }

  tableBody.innerHTML = studentCoordinators.map((sc, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td><strong>${sc.name}</strong></td>
      <td><strong style="color: var(--neon-purple);">${sc.rollNo}</strong></td>
      <td><span class="user-badge" style="border-color: var(--neon-cyan); color: var(--neon-cyan);">${sc.studentClass}</span></td>
      <td>📞 ${sc.phone}</td>
      <td style="text-align: center;">
        <button class="cyber-btn cyber-btn-red" style="font-size: 0.75rem; padding: 4px 8px;" onclick="deleteStudentCoordinator('${sc.rollNo}')">Remove</button>
      </td>
    </tr>
  `).join("");
}

window.deleteStudentCoordinator = async function(rollNo) {
  if (!confirm(`Are you sure you want to remove student coordinator with Roll No "${rollNo}"?`)) return;

  try {
    const studentCoordinators = (eventData.studentCoordinators || []).filter(sc => sc.rollNo !== rollNo);
    const eventRef = doc(db, "events", assignedEventId);
    await updateDoc(eventRef, { studentCoordinators });
    eventData.studentCoordinators = studentCoordinators;
    renderStudentCoordinators();
    alert("Student coordinator removed.");
  } catch (error) {
    console.error("Error removing student coordinator:", error);
    alert("Failed to remove student coordinator.");
  }
};

// ==========================================
// ORGANIZER PROMO STUDIO
// ==========================================

let orgPromosList = [];

function getEmbedMediaUrl(url) {
  if (!url) return "";
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
  }
  return url;
}

function setupOrgPromoStudio() {
  const orgBtnTypeVideo = document.getElementById("orgBtnTypeVideo");
  const orgBtnTypeImage = document.getElementById("orgBtnTypeImage");
  const orgPromoContentType = document.getElementById("orgPromoContentType");

  const orgBtnSourceUrl = document.getElementById("orgBtnSourceUrl");
  const orgBtnSourceFile = document.getElementById("orgBtnSourceFile");
  const orgPromoMediaSource = document.getElementById("orgPromoMediaSource");
  const orgSourceUrlGroup = document.getElementById("orgSourceUrlGroup");
  const orgSourceFileGroup = document.getElementById("orgSourceFileGroup");

  if (orgBtnTypeVideo && orgBtnTypeImage) {
    orgBtnTypeVideo.addEventListener("click", () => {
      orgPromoContentType.value = "video";
      orgBtnTypeVideo.style.background = "rgba(168, 85, 247, 0.2)";
      orgBtnTypeVideo.style.borderColor = "var(--neon-purple)";
      orgBtnTypeVideo.style.opacity = "1";
      orgBtnTypeImage.style.background = "";
      orgBtnTypeImage.style.borderColor = "";
      orgBtnTypeImage.style.opacity = "0.6";
    });

    orgBtnTypeImage.addEventListener("click", () => {
      orgPromoContentType.value = "image";
      orgBtnTypeImage.style.background = "rgba(234, 179, 8, 0.2)";
      orgBtnTypeImage.style.borderColor = "#eab308";
      orgBtnTypeImage.style.opacity = "1";
      orgBtnTypeVideo.style.background = "";
      orgBtnTypeVideo.style.borderColor = "";
      orgBtnTypeVideo.style.opacity = "0.6";
    });
  }

  if (orgBtnSourceUrl && orgBtnSourceFile) {
    orgBtnSourceUrl.addEventListener("click", () => {
      orgPromoMediaSource.value = "url";
      orgSourceUrlGroup.style.display = "block";
      orgSourceFileGroup.style.display = "none";
      orgBtnSourceUrl.style.background = "rgba(0, 243, 255, 0.2)";
      orgBtnSourceUrl.style.borderColor = "var(--neon-cyan)";
      orgBtnSourceUrl.style.opacity = "1";
      orgBtnSourceFile.style.background = "";
      orgBtnSourceFile.style.borderColor = "";
      orgBtnSourceFile.style.opacity = "0.6";
    });

    orgBtnSourceFile.addEventListener("click", () => {
      orgPromoMediaSource.value = "file";
      orgSourceUrlGroup.style.display = "none";
      orgSourceFileGroup.style.display = "block";
      orgBtnSourceFile.style.background = "rgba(0, 243, 255, 0.2)";
      orgBtnSourceFile.style.borderColor = "var(--neon-cyan)";
      orgBtnSourceFile.style.opacity = "1";
      orgBtnSourceUrl.style.background = "";
      orgBtnSourceUrl.style.borderColor = "";
      orgBtnSourceUrl.style.opacity = "0.6";
    });
  }

  const orgPromoForm = document.getElementById("orgPromoForm");
  if (orgPromoForm) {
    orgPromoForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("orgPromoTitle").value.trim();
      const description = document.getElementById("orgPromoDescription").value.trim();
      const contentType = document.getElementById("orgPromoContentType").value;
      const mediaSource = document.getElementById("orgPromoMediaSource").value;
      const priority = parseInt(document.getElementById("orgPromoPriority").value) || 1;

      let mediaUrl = "";

      if (mediaSource === "url") {
        mediaUrl = document.getElementById("orgPromoMediaUrl").value.trim();
        if (!mediaUrl) {
          alert("Please enter a valid video or image URL link.");
          return;
        }
      } else {
        const fileInput = document.getElementById("orgPromoFileInput");
        if (!fileInput.files || fileInput.files.length === 0) {
          alert("Please select a file to upload.");
          return;
        }
        const file = fileInput.files[0];
        mediaUrl = await readFileAsDataURL(file);
      }

      const promoId = `promo_${Date.now()}`;
      const newPromo = {
        id: promoId,
        title: title,
        description: description,
        contentType: contentType,
        mediaSource: mediaSource,
        mediaUrl: mediaUrl,
        targetVisibility: "all",
        priority: priority,
        uploadedBy: organizerName || "Organizer",
        eventId: assignedEventId,
        createdAt: new Date().toISOString()
      };

      try {
        const docRef = doc(db, "promos", promoId);
        await setDoc(docRef, newPromo);

        alert(`Promo "${title}" published successfully!`);
        document.getElementById("orgPromoTitle").value = "";
        document.getElementById("orgPromoDescription").value = "";
        document.getElementById("orgPromoMediaUrl").value = "";

        await loadOrgPromosData();
      } catch (err) {
        console.error("Error publishing org promo:", err);
        alert("Failed to publish promo content.");
      }
    });
  }

  const btnOrgReloadPromos = document.getElementById("btnOrgReloadPromos");
  if (btnOrgReloadPromos) {
    btnOrgReloadPromos.addEventListener("click", loadOrgPromosData);
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

async function loadOrgPromosData() {
  try {
    const querySnap = await getDocs(collection(db, "promos"));
    orgPromosList = [];
    querySnap.forEach(snap => {
      const data = snap.data();
      if (data.eventId === assignedEventId || data.uploadedBy === organizerName) {
        orgPromosList.push(data);
      }
    });
    orgPromosList.sort((a, b) => (b.priority || 1) - (a.priority || 1));
    renderOrgPromosLibrary();
  } catch (err) {
    console.error("Error loading org promos:", err);
  }
}

function renderOrgPromosLibrary() {
  const grid = document.getElementById("orgPromoLibraryGrid");
  if (!grid) return;

  if (orgPromosList.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-sub); padding: 40px;">No promo media published for this event yet.</div>`;
    return;
  }

  grid.innerHTML = orgPromosList.map(p => {
    let previewHTML = "";
    if (p.contentType === "video") {
      const embedUrl = getEmbedMediaUrl(p.mediaUrl);
      if (embedUrl.includes("youtube.com/embed")) {
        previewHTML = `<iframe src="${embedUrl}" style="width: 100%; height: 110px; border: none; border-radius: 6px;" allowfullscreen></iframe>`;
      } else {
        previewHTML = `<video src="${p.mediaUrl}" controls style="width: 100%; height: 110px; border-radius: 6px; object-fit: cover; background: #000;"></video>`;
      }
    } else {
      previewHTML = `<img src="${p.mediaUrl}" style="width: 100%; height: 110px; border-radius: 6px; object-fit: cover;" alt="${p.title}">`;
    }

    return `
      <div class="cyber-corners" style="position: relative; background: rgba(10, 15, 30, 0.8); border: 1px solid rgba(0, 243, 255, 0.2); padding: 8px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="margin-bottom: 8px;">
          ${previewHTML}
          <h4 style="font-size: 0.85rem; color: #fff; margin: 8px 0 2px 0; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.title}</h4>
          <p style="font-size: 0.75rem; color: var(--text-sub); margin: 0; line-clamp: 2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${p.description || "No description"}</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; font-size: 0.7rem; color: var(--text-sub);">
          <span>Prio: ${p.priority || 1}</span>
          <button class="cyber-btn cyber-btn-red" style="font-size: 0.65rem; padding: 2px 6px;" onclick="deleteOrgPromo('${p.id}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

window.deleteOrgPromo = async function(promoId) {
  if (!confirm("Are you sure you want to delete this promo item?")) return;
  try {
    await deleteDoc(doc(db, "promos", promoId));
    alert("Promo item deleted.");
    await loadOrgPromosData();
  } catch (err) {
    console.error("Error deleting org promo:", err);
    alert("Failed to delete promo.");
  }
};

// ==========================================
// ORGANIZER CREDENTIALS MANAGEMENT
// ==========================================
function setupCredentialsModal() {
  const btnEditCredentials = document.getElementById("btnEditCredentials");
  const credentialsModal = document.getElementById("credentialsModal");
  const credentialsModalCloseBtn = document.getElementById("credentialsModalCloseBtn");
  const credentialsForm = document.getElementById("credentialsForm");

  const editOrgName = document.getElementById("editOrgName");
  const editOrgUsername = document.getElementById("editOrgUsername");
  const editOrgPassword = document.getElementById("editOrgPassword");
  const btnToggleOrgPassword = document.getElementById("btnToggleOrgPassword");

  if (btnToggleOrgPassword && editOrgPassword) {
    btnToggleOrgPassword.addEventListener("click", () => {
      if (editOrgPassword.type === "password") {
        editOrgPassword.type = "text";
        btnToggleOrgPassword.innerText = "🙈";
      } else {
        editOrgPassword.type = "password";
        btnToggleOrgPassword.innerText = "👁️";
      }
    });
  }

  if (btnEditCredentials && credentialsModal) {
    btnEditCredentials.addEventListener("click", async () => {
      editOrgName.value = organizerName || "";
      editOrgUsername.value = organizerUsername || "";
      
      // Fetch current password from Firestore
      try {
        if (organizerUsername) {
          const orgRef = doc(db, "organizers", organizerUsername);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            editOrgPassword.value = orgSnap.data().password || "";
          } else {
            editOrgPassword.value = "";
          }
        }
      } catch (err) {
        console.error("Error fetching organizer credentials:", err);
      }

      credentialsModal.classList.add("active");
    });
  }

  if (credentialsModalCloseBtn && credentialsModal) {
    credentialsModalCloseBtn.addEventListener("click", () => {
      credentialsModal.classList.remove("active");
    });

    credentialsModal.addEventListener("click", (e) => {
      if (e.target === credentialsModal) {
        credentialsModal.classList.remove("active");
      }
    });
  }

  if (credentialsForm) {
    credentialsForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const newName = editOrgName.value.trim();
      const newUsername = editOrgUsername.value.trim().toLowerCase();
      const newPassword = editOrgPassword.value.trim();

      if (!newName || !newUsername || !newPassword) {
        alert("Please fill in all fields (Name, Username, Password).");
        return;
      }

      const oldUsername = organizerUsername;
      const submitBtn = credentialsForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.innerText = "SAVING...";

      try {
        if (newUsername !== oldUsername) {
          // Verify if new username already exists
          const newOrgRef = doc(db, "organizers", newUsername);
          const newOrgSnap = await getDoc(newOrgRef);
          if (newOrgSnap.exists()) {
            alert(`Username "${newUsername}" is already taken by another coordinator. Please choose a different username.`);
            submitBtn.disabled = false;
            submitBtn.innerText = "SAVE CREDENTIALS";
            return;
          }

          // Read old doc data
          const oldOrgRef = doc(db, "organizers", oldUsername);
          const oldOrgSnap = await getDoc(oldOrgRef);
          const oldData = oldOrgSnap.exists() ? oldOrgSnap.data() : {};

          // Write to new doc
          await setDoc(newOrgRef, {
            ...oldData,
            name: newName,
            username: newUsername,
            password: newPassword,
            assignedEventId: assignedEventId || oldData.assignedEventId || ""
          });

          // Delete old doc
          if (oldOrgSnap.exists()) {
            await deleteDoc(oldOrgRef);
          }
        } else {
          // Update existing doc
          const orgRef = doc(db, "organizers", oldUsername);
          await updateDoc(orgRef, {
            name: newName,
            password: newPassword
          });
        }

        // Update localStorage and in-memory variables
        localStorage.setItem("organizerUsername", newUsername);
        localStorage.setItem("organizerName", newName);
        organizerUsername = newUsername;
        organizerName = newName;

        // Update UI
        if (orgUserBadge) {
          orgUserBadge.innerText = `${newName} (${newUsername})`;
        }

        alert("Credentials updated successfully! You can now log in using your updated username and password.");
        credentialsModal.classList.remove("active");
      } catch (err) {
        console.error("Error updating organizer credentials:", err);
        alert("Failed to update credentials. Please try again.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "SAVE CREDENTIALS";
      }
    });
  }
}

// ==========================================
// CLASS REGISTRATION LIMITS CONTROL
// ==========================================
let tempClassLimits = {};

function setupClassLimitsForm() {
  const classLimitForm = document.getElementById("classLimitForm");
  const maxPerClassInput = document.getElementById("maxPerClassInput");
  const limitClassSelect = document.getElementById("limitClassSelect");
  const customClassLimitInput = document.getElementById("customClassLimitInput");
  const btnAddClassLimit = document.getElementById("btnAddClassLimit");

  if (btnAddClassLimit) {
    btnAddClassLimit.addEventListener("click", () => {
      const cls = limitClassSelect.value;
      const val = parseInt(customClassLimitInput.value);

      if (isNaN(val) || val < 0) {
        alert("Please enter a valid non-negative limit number.");
        return;
      }

      tempClassLimits[cls] = val;
      customClassLimitInput.value = "";
      renderActiveClassLimits();
    });
  }

  if (classLimitForm) {
    classLimitForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!assignedEventId) return;

      const maxVal = parseInt(maxPerClassInput.value) || 0;
      const submitBtn = classLimitForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.innerText = "SAVING...";

      try {
        const eventRef = doc(db, "events", assignedEventId);
        await updateDoc(eventRef, {
          maxPerClass: maxVal,
          classLimits: tempClassLimits
        });

        alert("Class registration limits saved successfully!");
      } catch (err) {
        console.error("Error saving class limits:", err);
        alert("Failed to save class limits.");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "SAVE CLASS LIMITS";
      }
    });
  }
}

function renderActiveClassLimits() {
  const container = document.getElementById("activeClassLimitsList");
  if (!container) return;

  const keys = Object.keys(tempClassLimits);
  if (keys.length === 0) {
    container.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-sub); font-style: italic;">No custom per-class overrides set for this event. Event limit applies to all classes.</span>`;
    return;
  }

  container.innerHTML = keys.map(cls => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0, 243, 255, 0.08); border: 1px solid rgba(0, 243, 255, 0.25); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem;">
      <span style="color: #fff; font-weight: 600;">🏫 ${cls}: <strong style="color: var(--neon-cyan);">${tempClassLimits[cls]} max student(s)</strong></span>
      <button type="button" class="cyber-btn cyber-btn-red" style="padding: 2px 8px; font-size: 0.7rem;" onclick="removeClassLimitOverride('${cls}')">Delete</button>
    </div>
  `).join("");
}

window.removeClassLimitOverride = function(cls) {
  delete tempClassLimits[cls];
  renderActiveClassLimits();
};

// ==========================================
// EVENT ROUNDS MANAGEMENT LOGIC
// ==========================================

let currentEventRounds = [];

function setupEventRoundsHandlers() {
  const btnToggle = document.getElementById("btnToggleAddRoundForm");
  const formPanel = document.getElementById("addRoundFormPanel");
  const btnCancel = document.getElementById("btnCancelRoundForm");
  const form = document.getElementById("orgRoundForm");

  if (btnToggle && formPanel) {
    btnToggle.addEventListener("click", () => {
      document.getElementById("roundFormTitle").innerText = "Add New Event Round";
      document.getElementById("roundEditIndex").value = "-1";
      if (form) form.reset();
      formPanel.style.display = formPanel.style.display === "none" ? "block" : "none";
    });
  }

  if (btnCancel && formPanel) {
    btnCancel.addEventListener("click", () => {
      formPanel.style.display = "none";
      if (form) form.reset();
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!assignedEventId) {
        alert("No event assigned!");
        return;
      }

      const editIdx = parseInt(document.getElementById("roundEditIndex").value);
      const name = document.getElementById("roundNameInput").value.trim();
      const venue = document.getElementById("roundVenueInput").value.trim();
      const time = document.getElementById("roundTimeInput").value.trim();
      const status = document.getElementById("roundStatusSelect").value;
      const desc = document.getElementById("roundDescInput").value.trim();

      if (!name) {
        alert("Please provide a round name!");
        return;
      }

      const roundObj = {
        name,
        venue,
        time,
        status,
        desc,
        updatedAt: new Date().toISOString()
      };

      if (editIdx >= 0 && editIdx < currentEventRounds.length) {
        currentEventRounds[editIdx] = roundObj;
      } else {
        currentEventRounds.push(roundObj);
      }

      try {
        const eventRef = doc(db, "events", assignedEventId);
        await updateDoc(eventRef, {
          rounds: currentEventRounds
        });

        alert("Event rounds updated successfully!");
        form.reset();
        formPanel.style.display = "none";
        renderEventRounds();
      } catch (err) {
        console.error("Error saving event round:", err);
        alert("Failed to save event round.");
      }
    });
  }
}

function renderEventRounds() {
  const container = document.getElementById("eventRoundsList");
  if (!container) return;

  if (!currentEventRounds || currentEventRounds.length === 0) {
    container.innerHTML = `
      <div style="color: var(--text-sub); font-size: 0.85rem; font-style: italic; text-align: center; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px;">
        No rounds created yet for this event. Click '+ Add Round' to configure event rounds.
      </div>
    `;
    return;
  }

  container.innerHTML = currentEventRounds.map((rd, idx) => {
    let statusBadgeColor = "var(--neon-cyan)";
    let statusBg = "rgba(0, 243, 255, 0.1)";

    if (rd.status === "In Progress") {
      statusBadgeColor = "#38bdf8";
      statusBg = "rgba(56, 189, 248, 0.2)";
    } else if (rd.status === "Completed") {
      statusBadgeColor = "#4ade80";
      statusBg = "rgba(74, 222, 128, 0.2)";
    } else if (rd.status === "Upcoming") {
      statusBadgeColor = "#fbbf24";
      statusBg = "rgba(251, 191, 36, 0.2)";
    }

    return `
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; position: relative;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
              <span style="background: var(--neon-cyan); color: #000; font-weight: 800; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">R${idx + 1}</span>
              <strong style="color: #fff; font-size: 0.95rem;">${rd.name}</strong>
              <span style="font-size: 0.72rem; font-weight: bold; color: ${statusBadgeColor}; background: ${statusBg}; border: 1px solid ${statusBadgeColor}; padding: 2px 8px; border-radius: 12px;">${rd.status || 'Upcoming'}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-sub); display: flex; gap: 15px; flex-wrap: wrap;">
              ${rd.venue ? `<span>📍 ${rd.venue}</span>` : ''}
              ${rd.time ? `<span>⏰ ${rd.time}</span>` : ''}
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="cyber-btn" style="padding: 2px 8px; font-size: 0.75rem;" onclick="editEventRound(${idx})">Edit</button>
            <button type="button" class="cyber-btn cyber-btn-red" style="padding: 2px 8px; font-size: 0.75rem;" onclick="deleteEventRound(${idx})">Delete</button>
          </div>
        </div>
        ${rd.desc ? `<div style="font-size: 0.82rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px; border-left: 2px solid var(--neon-cyan); margin-top: 4px;">${rd.desc}</div>` : ''}
      </div>
    `;
  }).join("");
}

window.editEventRound = function(idx) {
  const rd = currentEventRounds[idx];
  if (!rd) return;

  const formPanel = document.getElementById("addRoundFormPanel");
  if (formPanel) formPanel.style.display = "block";

  document.getElementById("roundFormTitle").innerText = `Edit Round ${idx + 1}`;
  document.getElementById("roundEditIndex").value = idx.toString();
  document.getElementById("roundNameInput").value = rd.name || "";
  document.getElementById("roundVenueInput").value = rd.venue || "";
  document.getElementById("roundTimeInput").value = rd.time || "";
  document.getElementById("roundStatusSelect").value = rd.status || "Upcoming";
  document.getElementById("roundDescInput").value = rd.desc || "";
};

window.deleteEventRound = async function(idx) {
  if (!confirm(`Are you sure you want to delete Round ${idx + 1}?`)) return;

  currentEventRounds.splice(idx, 1);
  try {
    const eventRef = doc(db, "events", assignedEventId);
    await updateDoc(eventRef, {
      rounds: currentEventRounds
    });
    renderEventRounds();
  } catch (err) {
    console.error("Error deleting event round:", err);
    alert("Failed to delete event round.");
  }
};

let gamingTeamsList = [];
let currentGamingFilter = "all";

async function loadGamingTeams() {
  const panel = document.getElementById("gamingTeamsPanel");
  if (!panel) return;

  if (assignedEventId !== "gaming") {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";

  try {
    const qSnap = await getDocs(collection(db, "gamingTeams"));
    gamingTeamsList = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderGamingTeams();
    setupGamingTabsAndExport();
  } catch (err) {
    console.error("Error loading gaming teams:", err);
  }
}

function renderGamingTeams() {
  const tableBody = document.getElementById("gamingTeamsTableBody");
  const countAll = document.getElementById("countGamingAll");
  const countFF = document.getElementById("countGamingFF");
  const countBGMI = document.getElementById("countGamingBGMI");

  if (!tableBody) return;

  const totalAll = gamingTeamsList.length;
  const totalFF = gamingTeamsList.filter(t => t.gameVariant === "Free Fire").length;
  const totalBGMI = gamingTeamsList.filter(t => t.gameVariant === "BGMI").length;

  if (countAll) countAll.innerText = totalAll;
  if (countFF) countFF.innerText = totalFF;
  if (countBGMI) countBGMI.innerText = totalBGMI;

  let filtered = gamingTeamsList;
  if (currentGamingFilter !== "all") {
    filtered = gamingTeamsList.filter(t => t.gameVariant === currentGamingFilter);
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-sub);">No gaming squads found for filter "${currentGamingFilter}".</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(t => {
    const members = t.members || [];
    const membersHTML = members.map((m, i) => `
      <div style="font-size: 0.8rem; margin-bottom: 2px;">
        <span style="color: var(--neon-cyan); font-weight: bold;">M${i+1}:</span> ${m} ${i === 0 ? '👑' : ''}
      </div>
    `).join("");

    const badgeColor = t.gameVariant === "Free Fire" ? "#f97316" : "#38bdf8";

    return `
      <tr>
        <td><strong style="color: #fff; font-size: 0.95rem;">${t.teamName || "N/A"}</strong></td>
        <td>
          <span style="background: rgba(15, 23, 42, 0.8); border: 1px solid ${badgeColor}; color: ${badgeColor}; font-weight: bold; font-size: 0.75rem; padding: 3px 8px; border-radius: 6px; display: inline-block;">
            ${t.gameVariant === "Free Fire" ? "🔥 Free Fire" : "🪖 BGMI"}
          </span>
        </td>
        <td><strong>${t.studentClass || "N/A"}</strong></td>
        <td>
          <div style="font-weight: 600; color: #fff;">${t.leaderName || "N/A"}</div>
          <div style="font-size: 0.75rem; color: var(--text-sub);">${t.leaderEmail || "N/A"}</div>
        </td>
        <td>${membersHTML}</td>
        <td style="text-align: center;">
          <button class="btn-action btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="removeGamingTeam('${t.id}', '${(t.teamName || '').replace(/'/g, "\\'")}')">Remove Squad</button>
        </td>
      </tr>
    `;
  }).join("");
}

function setupGamingTabsAndExport() {
  const tabBtns = document.querySelectorAll(".gaming-tab-btn");
  tabBtns.forEach(btn => {
    if (!btn.dataset.bound) {
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentGamingFilter = btn.dataset.game;
        renderGamingTeams();
      });
    }
  });

  const exportBtn = document.getElementById("btnExportGamingTeams");
  if (exportBtn && !exportBtn.dataset.bound) {
    exportBtn.dataset.bound = "true";
    exportBtn.addEventListener("click", () => {
      if (gamingTeamsList.length === 0) {
        alert("No gaming squads registered yet.");
        return;
      }

      let csv = "Team Name,Game Variant,Class,Leader Name,Leader Email,Member 1,Member 2,Member 3,Member 4,Registration Date\n";
      gamingTeamsList.forEach(t => {
        const m = t.members || [];
        csv += `"${t.teamName || ''}","${t.gameVariant || ''}","${t.studentClass || ''}","${t.leaderName || ''}","${t.leaderEmail || ''}","${m[0] || ''}","${m[1] || ''}","${m[2] || ''}","${m[3] || ''}","${t.registeredAt || ''}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Gaming_Squad_Rosters_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    });
  }
}

window.removeGamingTeam = async function(teamId, teamName) {
  if (!confirm(`Are you sure you want to remove the gaming squad "${teamName}"?`)) return;

  try {
    await deleteDoc(doc(db, "gamingTeams", teamId));
    // Also remove gaming from student document
    const studentRef = doc(db, "students", teamId);
    await updateDoc(studentRef, {
      registeredEvents: arrayRemove("gaming")
    });
    alert(`Squad "${teamName}" removed successfully.`);
    await loadGamingTeams();
    await loadRegistrants();
  } catch (err) {
    console.error("Error removing gaming team:", err);
    alert("Could not remove gaming team.");
  }
};

// Boot Dashboard
document.addEventListener("DOMContentLoaded", init);
