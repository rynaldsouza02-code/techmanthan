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
const btnAutomateWinners = document.getElementById("btnAutomateWinners");
const marksTableHeaderRow = document.getElementById("marksTableHeaderRow");
const marksTableBody = document.getElementById("marksTableBody");

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
    registrantsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-sub);">No students registered for this event.</td></tr>`;
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
        if (!confirm(`Are you sure you want to stop the event "${eventData.title}"? This will revert its status and allow you to start it again.`)) {
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
        if (!confirm(`Are you sure you want to start the event "${eventData.title}"? This will update the event status to Live and notify all registered students via email.`)) {
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
    btnDownloadAttendance.addEventListener("click", () => {
      if (!eventData) return;
      
      const printWindow = window.open('', '_blank');
      
      // Build registrations table for print preview
      let rowsHTML = "";
      if (registeredStudents.length === 0) {
        rowsHTML = `<tr><td colspan="7" style="text-align: center; color: #555;">No students registered for this event.</td></tr>`;
      } else {
        rowsHTML = registeredStudents.map((st, index) => {
          const isCheckedIn = checkedInStudentIds.includes(st.regNo);
          const statusText = isCheckedIn ? "Present (Checked-in)" : "Absent";
          const statusColor = isCheckedIn ? "#16a34a" : "#dc2626";
          
          return `
            <tr>
              <td style="text-align: center;">${index + 1}</td>
              <td><strong>${st.regNo}</strong></td>
              <td>${st.name || "N/A"}</td>
              <td>${st.class || "N/A"}</td>
              <td>${st.email || '<span style="opacity: 0.5; font-size: 11px;">No email</span>'}</td>
              <td style="text-align: center; font-weight: bold; color: ${statusColor};">${statusText}</td>
              <td style="width: 150px; text-align: center; font-size: 11px; color: #888;">[ &nbsp; ] Present &nbsp; [ &nbsp; ] Absent</td>
            </tr>
          `;
        }).join("");
      }

      const orgName = localStorage.getItem("organizerName") || eventData.coordinator || "Unassigned";

      printWindow.document.write(`
        <html>
          <head>
            <title>Attendance - ${eventData.title}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #000; background: #fff; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
              th { background-color: #f2f2f2; font-weight: bold; }
              h2, h3 { margin: 0; text-align: center; }
              h2 { font-size: 20px; font-weight: bold; letter-spacing: 0.5px; }
              h3 { font-size: 15px; margin-top: 5px; margin-bottom: 20px; font-weight: normal; color: #333; }
              .info-table td { border: none !important; padding: 4px 0 !important; }
              .footer { margin-top: 40px; font-size: 12px; text-align: right; font-style: italic; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px;">
              <img src="${window.location.origin}/Dr%20BBHC.png?v=2" style="height: 60px; width: auto; object-fit: contain;">
              <div style="text-align: left;">
                <h2 style="margin: 0; font-size: 18px; font-weight: bold; text-align: left;">DR. B.B HEGDE FIRST GRADE COLLEGE, KUNDAPURA</h2>
                <h3 style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold; color: #111; text-align: left;">TECH MANTHAN 6.0</h3>
                <h3 style="margin: 2px 0 0 0; font-size: 13px; font-weight: normal; color: #444; text-align: left;">Registrants Directory & Attendance Sheet</h3>
              </div>
            </div>
            
            <div style="margin: 20px 0; border: 1px solid #ddd; padding: 15px; border-radius: 6px; background-color: #fafafa; font-size: 13px; line-height: 1.6;">
              <table class="info-table" style="width: 100%; border: none; margin-top: 0; margin-bottom: 0;">
                <tr style="border: none;">
                  <td style="border: none; padding: 4px 0; width: 50%;"><strong>🏆 Event Name:</strong> ${eventData.title}</td>
                  <td style="border: none; padding: 4px 0; width: 50%;"><strong>👤 Coordinator Name:</strong> ${orgName}</td>
                </tr>
                <tr style="border: none;">
                  <td style="border: none; padding: 4px 0; width: 50%;"><strong>📅 Event Date:</strong> ${eventData.date || "N/A"}</td>
                  <td style="border: none; padding: 4px 0; width: 50%;"><strong>🕒 Event Time:</strong> ${eventData.time || "N/A"}</td>
                </tr>
                <tr style="border: none;">
                  <td style="border: none; padding: 4px 0; width: 50%;"><strong>📍 Venue:</strong> ${eventData.venue || "N/A"}</td>
                  <td style="border: none; padding: 4px 0; width: 50%;"><strong>📈 Total Registrations:</strong> ${registeredStudents.length}</td>
                </tr>
              </table>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 50px; text-align: center;">Sl No</th>
                  <th style="width: 120px;">Reg No</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Email Address</th>
                  <th style="width: 150px; text-align: center;">App Check-in Status</th>
                  <th style="width: 180px; text-align: center;">Manual Attendance Signature</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHTML}
              </tbody>
            </table>

            <div class="footer">
              <p>Generated on ${new Date().toLocaleString()} | Coordinator Signature: _______________________</p>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
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
      const shareUrl = `${window.location.origin}/judge.html?event=${assignedEventId}`;
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
      registeredStudents.forEach(st => {
        const scores = {};
        let total = 0;
        const inputs = document.querySelectorAll(`input.marks-input[data-reg="${st.regNo}"]`);
        inputs.forEach(input => {
          const score = parseFloat(input.value) || 0;
          scores[input.dataset.criteria] = score;
          total += score;
        });
        marksSheet[st.regNo] = { scores, total };
      });

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

      // Calculate totals for all registered students currently entered
      const leaderboard = registeredStudents.map(st => {
        let total = 0;
        const inputs = document.querySelectorAll(`input.marks-input[data-reg="${st.regNo}"]`);
        inputs.forEach(input => {
          total += parseFloat(input.value) || 0;
        });
        return {
          regNo: st.regNo,
          name: st.name || "N/A",
          total: total
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

      if (!confirm(msg)) return;

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

      if (!confirm(`Are you sure you want to broadcast this announcement email to ${emails.length} registered students?`)) {
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
}

function renderMarksSheet() {
  if (!eventData || !eventData.criteria || eventData.criteria.length === 0) {
    marksTableHeaderRow.innerHTML = `
      <th style="width: 80px; text-align: center;">Sl No</th>
      <th style="width: 150px;">Reg No</th>
      <th>Student Name</th>
      <th style="width: 150px; text-align: center;">Total Score</th>
    `;
    marksTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-sub); padding: 20px;">
          Judging criteria and judges have not been configured by the administrator for this event. Please contact the administrator.
        </td>
      </tr>
    `;
    return;
  }

  // 1. Build Header Row with criteria columns
  const criteria = eventData.criteria;
  let headerHTML = `
    <th style="width: 80px; text-align: center;">Sl No</th>
    <th style="width: 150px;">Reg No</th>
    <th>Student Name</th>
  `;
  criteria.forEach(c => {
    headerHTML += `<th style="text-align: center; min-width: 100px;">${c}</th>`;
  });
  headerHTML += `<th style="width: 150px; text-align: center;">Total Score</th>`;
  marksTableHeaderRow.innerHTML = headerHTML;

  // 2. Build Body Rows
  if (registeredStudents.length === 0) {
    marksTableBody.innerHTML = `
      <tr>
        <td colspan="${4 + criteria.length}" style="text-align: center; color: var(--text-sub); padding: 20px;">
          No students registered for this event.
        </td>
      </tr>
    `;
    return;
  }

  const savedMarksSheet = eventData.marksSheet || {};

  marksTableBody.innerHTML = registeredStudents.map((st, index) => {
    const studentSaved = savedMarksSheet[st.regNo] || {};
    const scores = studentSaved.scores || {};
    const total = studentSaved.total || 0;

    let rowHTML = `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td><strong>${st.regNo}</strong></td>
        <td>${st.name || "N/A"}</td>
    `;

    criteria.forEach(c => {
      const scoreVal = scores[c] !== undefined ? scores[c] : "";
      rowHTML += `
        <td style="text-align: center;">
          <input type="number" class="marks-input" 
            style="width: 80px; text-align: center; padding: 6px; border: 1px solid rgba(0, 243, 255, 0.2); background: rgba(0, 0, 0, 0.3); color: #fff; font-family: monospace; border-radius: 4px;"
            min="0" max="100" step="any" value="${scoreVal}" 
            data-reg="${st.regNo}" data-criteria="${c}">
        </td>
      `;
    });

    rowHTML += `
        <td style="text-align: center; font-weight: bold; color: var(--neon-cyan); font-family: monospace; font-size: 1.05rem;" id="total-${st.regNo}">
          ${total}
        </td>
      </tr>
    `;
    return rowHTML;
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

// Boot Dashboard
document.addEventListener("DOMContentLoaded", init);
