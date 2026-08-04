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

  // Handle View Round Select change
  const viewRoundSelect = document.getElementById("viewRoundSelect");
  if (viewRoundSelect) {
    viewRoundSelect.addEventListener("change", renderMarksSheet);
  }

  // Print PDF Marksheet per Round
  if (btnPrintMarksheet) {
    btnPrintMarksheet.addEventListener("click", async () => {
      if (!eventData || !eventData.criteria || eventData.criteria.length === 0) {
        alert("No criteria configured for this event.");
        return;
      }

      const selectedRound = viewRoundSelect ? viewRoundSelect.value : "Round 1";
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
        const criteriaScores = {};
        criteria.forEach(c => criteriaScores[c] = []);
        let totalSum = 0;
        let judgeCount = 0;

        if (studentEntry.scores !== undefined) {
          criteria.forEach(c => criteriaScores[c].push(studentEntry.scores[c] || 0));
          totalSum = studentEntry.total || 0;
          judgeCount = 1;
        } else {
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
        }

        const critVals = criteria.map(c => {
          const vals = criteriaScores[c];
          return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
        });

        const avgTotal = judgeCount > 0 ? parseFloat((totalSum / judgeCount).toFixed(1)) : 0;

        return [idx + 1, st.regNo, st.name || "N/A", st.class || "N/A", ...critVals, `${avgTotal} pts`];
      });

      const orgName = localStorage.getItem("organizerName") || eventData.coordinator || "Unassigned";

      const payload = {
        type: "marksheet",
        title: eventData.title,
        round: selectedRound,
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
        a.download = `marksheet_${eventData.title.toLowerCase().replace(/ /g, "_")}_${selectedRound.toLowerCase().replace(/ /g, "_")}.pdf`;
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

  // Export Excel CSV Sheet per Round
  const btnExportExcel = document.getElementById("btnExportExcel");
  if (btnExportExcel) {
    btnExportExcel.addEventListener("click", () => {
      if (!eventData || !eventData.criteria || eventData.criteria.length === 0) {
        alert("No criteria configured for this event.");
        return;
      }

      const selectedRound = viewRoundSelect ? viewRoundSelect.value : "Round 1";
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
        const criteriaScores = {};
        criteria.forEach(c => criteriaScores[c] = []);
        let totalSum = 0;
        let judgeCount = 0;

        if (studentEntry.scores !== undefined) {
          criteria.forEach(c => criteriaScores[c].push(studentEntry.scores[c] || 0));
          totalSum = studentEntry.total || 0;
          judgeCount = 1;
        } else {
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
        }

        const critVals = criteria.map(c => {
          const vals = criteriaScores[c];
          return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
        });

        const avgTotal = judgeCount > 0 ? parseFloat((totalSum / judgeCount).toFixed(1)) : 0;

        const row = [idx + 1, st.regNo, st.name || "N/A", st.class || "N/A", ...critVals, avgTotal];
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${eventData.title.toLowerCase().replace(/ /g, "_")}_${selectedRound.toLowerCase().replace(/ /g, "_")}_marksheet.csv`);
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
        alert(`Success! Top ${promoted.length} students from ${fromRound} have been promoted to ${toRound}!`);
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

function renderMarksSheet() {
  const viewRoundSelect = document.getElementById("viewRoundSelect");
  const selectedRound = viewRoundSelect ? viewRoundSelect.value : "Round 1";

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

  // 1. Build Header Row matching Excel Grid format (Image 2)
  let headerHTML = `
    <th style="width: 60px; text-align: center;">SL NO</th>
    <th style="width: 120px;">REG NO</th>
    <th>STUDENT NAME</th>
    <th style="width: 110px;">CLASS</th>
    ${criteria.map(c => `<th style="text-align: center;">${c.toUpperCase()}</th>`).join("")}
    <th style="width: 130px; text-align: center; color: var(--neon-cyan);">TOTAL</th>
  `;
  marksTableHeaderRow.innerHTML = headerHTML;

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

  // Determine marksSheet to use for selectedRound
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

    // Calculate average scores per criterion across judges
    const criteriaScores = {};
    criteria.forEach(c => criteriaScores[c] = []);

    let totalSum = 0;
    let judgeCount = 0;

    if (studentEntry.scores !== undefined) {
      // Single legacy judge format
      criteria.forEach(c => {
        const val = studentEntry.scores[c] || 0;
        criteriaScores[c].push(val);
      });
      totalSum = studentEntry.total || 0;
      judgeCount = 1;
    } else {
      Object.keys(studentEntry).forEach(jKey => {
        const entry = studentEntry[jKey];
        if (entry && entry.scores) {
          criteria.forEach(c => {
            if (entry.scores[c] !== undefined) {
              criteriaScores[c].push(entry.scores[c]);
            }
          });
          totalSum += entry.total || 0;
          judgeCount++;
        }
      });
    }

    const criteriaCellsHTML = criteria.map(c => {
      const vals = criteriaScores[c];
      let avg = 0;
      if (vals.length > 0) {
        avg = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
      }
      return `<td style="text-align: center; font-weight: bold; font-family: monospace;">${vals.length > 0 ? avg : "-"}</td>`;
    }).join("");

    const avgTotal = judgeCount > 0 ? parseFloat((totalSum / judgeCount).toFixed(1)) : 0;

    return `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong style="color: var(--neon-purple);">${st.regNo}</strong></td>
        <td>${st.name || "N/A"}</td>
        <td>${st.class || "N/A"}</td>
        ${criteriaCellsHTML}
        <td style="text-align: center; font-weight: bold; color: var(--neon-cyan); font-family: monospace; font-size: 1.05rem;">
          ${avgTotal}
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
    const promotedDetails = promo.promotedDetails || [];
    const promotedNames = promotedDetails.map(d => `${d.name} (${d.regNo})`).join(", ");

    return `
      <tr>
        <td><strong style="color: var(--neon-purple);">${targetRound}</strong> <span style="font-size: 0.75rem; color: var(--text-sub);">(From ${promo.fromRound})</span></td>
        <td style="text-align: center;"><strong style="color: var(--neon-green); font-size: 1.1rem;">${promo.promotedStudents.length} Students</strong></td>
        <td>
          <div style="max-height: 80px; overflow-y: auto; font-size: 0.85rem; color: #ddd;">
            ${promotedNames || promo.promotedStudents.join(", ")}
          </div>
        </td>
        <td>
          <button class="cyber-btn cyber-btn-red" style="font-size: 0.75rem; padding: 4px 8px;" onclick="clearRoundPromotion('${targetRound}')">Reset Promotion</button>
        </td>
      </tr>
    `;
  }).join("");
}

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

// Boot Dashboard
document.addEventListener("DOMContentLoaded", init);
