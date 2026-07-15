import { db } from "./firebase-config.js?v=2.12";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Session check
if (localStorage.getItem("adminUser") !== "admin") {
  window.location.href = "login.html";
}

// Navigation & Tabs
const tabBtnOverview = document.getElementById("tabBtnOverview");
const tabBtnEvents = document.getElementById("tabBtnEvents");
const tabBtnStudents = document.getElementById("tabBtnStudents");
const tabBtnOrganizers = document.getElementById("tabBtnOrganizers");
const tabBtnRegistrations = document.getElementById("tabBtnRegistrations");
const tabBtnJudges = document.getElementById("tabBtnJudges");

const panelOverview = document.getElementById("panelOverview");
const panelEvents = document.getElementById("panelEvents");
const panelStudents = document.getElementById("panelStudents");
const panelOrganizers = document.getElementById("panelOrganizers");
const panelRegistrations = document.getElementById("panelRegistrations");
const panelJudges = document.getElementById("panelJudges");

const panels = [panelOverview, panelEvents, panelStudents, panelOrganizers, panelRegistrations, panelJudges];
const tabButtons = [tabBtnOverview, tabBtnEvents, tabBtnStudents, tabBtnOrganizers, tabBtnRegistrations, tabBtnJudges];

// Overview Stats Elements
const statTotalEvents = document.getElementById("statTotalEvents");
const statTotalStudents = document.getElementById("statTotalStudents");
const statTotalRegistrations = document.getElementById("statTotalRegistrations");
const overviewEventsTable = document.getElementById("overviewEventsTable");

// Events Form & Table Elements
const eventForm = document.getElementById("eventForm");
const eventFormMode = document.getElementById("eventFormMode");
const eventFormTitle = document.getElementById("eventFormTitle");
const eventIdInput = document.getElementById("eventId");
const eventTitleInput = document.getElementById("eventTitle");
const eventDescriptionInput = document.getElementById("eventDescription");
const eventDateInput = document.getElementById("eventDate");
const eventTimeInput = document.getElementById("eventTime");
const eventVenueInput = document.getElementById("eventVenue");
const eventCoordinatorInput = document.getElementById("eventCoordinator");
const eventRulesInput = document.getElementById("eventRules");
const btnSubmitEvent = document.getElementById("btnSubmitEvent");
const btnCancelEditEvent = document.getElementById("btnCancelEditEvent");
const eventsListTable = document.getElementById("eventsListTable");

// Students Form & Table Elements
const studentForm = document.getElementById("studentForm");
const studentRegNoInput = document.getElementById("studentRegNo");
const studentNameInput = document.getElementById("studentName");
const studentDOBInput = document.getElementById("studentDOB");
const studentsListTable = document.getElementById("studentsListTable");
const studentSearchInput = document.getElementById("studentSearchInput");

// Organizers Form & Table Elements
const organizerForm = document.getElementById("organizerForm");
const orgUsernameInput = document.getElementById("orgUsername");
const orgNameInput = document.getElementById("orgName");
const orgPasswordInput = document.getElementById("orgPassword");
const orgEventSelect = document.getElementById("orgEvent");
const organizersListTable = document.getElementById("organizersListTable");

// Registrations Filter & Table Elements
const regEventFilter = document.getElementById("regEventFilter");
const registrationsListTable = document.getElementById("registrationsListTable");
const btnPrintRegistrations = document.getElementById("btnPrintRegistrations");
const printEventTitle = document.getElementById("printEventTitle");

// Judges Elements
const judgesEventsTableBody = document.getElementById("judgesEventsTableBody");
const judgingModal = document.getElementById("judgingModal");
const judgingModalCloseBtn = document.getElementById("judgingModalCloseBtn");
const judgingForm = document.getElementById("judgingForm");
const judgingEventIdInput = document.getElementById("judgingEventId");
const judgingEventTitleInput = document.getElementById("judgingEventTitle");
const judgingAllottedJudgesInput = document.getElementById("judgingAllottedJudges");
const judgingCriteriaInput = document.getElementById("judgingCriteria");



// Global states
let allEvents = [];
let allStudents = [];
let allOrganizers = [];

// Initialize Page
async function init() {
  setupTabs();
  setupLogout();
  await loadAllData();
  setupEventForm();
  setupStudentForm();
  setupOrganizerForm();
  setupRegistrationsTab();
  setupJudgingForm();
}

// Switch between panels
function switchTab(targetBtn, targetPanel) {
  tabButtons.forEach(btn => btn.classList.remove("active"));
  panels.forEach(p => p.classList.remove("active"));
  
  targetBtn.classList.add("active");
  targetPanel.classList.add("active");
}

function setupTabs() {
  tabBtnOverview.addEventListener("click", () => {
    switchTab(tabBtnOverview, panelOverview);
    renderOverview();
  });
  tabBtnEvents.addEventListener("click", () => {
    switchTab(tabBtnEvents, panelEvents);
    renderEvents();
  });
  tabBtnStudents.addEventListener("click", () => {
    switchTab(tabBtnStudents, panelStudents);
    renderStudents();
  });
  tabBtnOrganizers.addEventListener("click", () => {
    switchTab(tabBtnOrganizers, panelOrganizers);
    renderOrganizers();
  });
  tabBtnRegistrations.addEventListener("click", () => {
    switchTab(tabBtnRegistrations, panelRegistrations);
    populateDropdowns();
  });
  tabBtnJudges.addEventListener("click", () => {
    switchTab(tabBtnJudges, panelJudges);
    renderJudges();
  });
}

function setupLogout() {
  document.getElementById("btnLogout").addEventListener("click", () => {
    localStorage.removeItem("adminUser");
    window.location.href = "login.html";
  });
}

// Fetch all database records
async function loadAllData() {
  try {
    // 1. Fetch Events
    const eventsSnap = await getDocs(collection(db, "events"));
    allEvents = [];
    eventsSnap.forEach(s => allEvents.push(s.data()));

    // 2. Fetch Students
    const studentsSnap = await getDocs(collection(db, "students"));
    allStudents = [];
    studentsSnap.forEach(s => {
      const data = s.data();
      allStudents.push({ regNo: s.id, ...data });
    });

    // 3. Fetch Organizers
    const orgsSnap = await getDocs(collection(db, "organizers"));
    allOrganizers = [];
    orgsSnap.forEach(s => {
      const data = s.data();
      allOrganizers.push({ username: s.id, ...data });
    });

    renderOverview();
    populateDropdowns();
  } catch (error) {
    console.error("Error loading admin data:", error);
  }
}

// ----------------- OVERVIEW SECTION -----------------
function renderOverview() {
  statTotalEvents.innerText = allEvents.length;
  statTotalStudents.innerText = allStudents.length;

  let totalRegs = 0;
  allStudents.forEach(st => {
    if (st.registeredEvents) {
      totalRegs += st.registeredEvents.length;
    }
  });
  statTotalRegistrations.innerText = totalRegs;

  if (allEvents.length === 0) {
    overviewEventsTable.innerHTML = `<tr><td colspan="5" style="text-align: center;">No events registered yet.</td></tr>`;
    return;
  }

  overviewEventsTable.innerHTML = allEvents.map(ev => {
    const org = allOrganizers.find(o => o.assignedEventId === ev.id);
    const orgName = org ? org.name : "Unassigned";
    return `
      <tr>
        <td><strong>${ev.title}</strong></td>
        <td>📅 ${ev.date} at ${ev.time}</td>
        <td>📍 ${ev.venue}</td>
        <td>👤 ${ev.coordinator}</td>
        <td><span class="user-badge" style="border-color: var(--neon-purple); color: var(--neon-purple);">${orgName}</span></td>
      </tr>
    `;
  }).join("");
}

// ----------------- EVENTS MANAGEMENT -----------------
function renderEvents() {
  if (allEvents.length === 0) {
    eventsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center;">No events in database.</td></tr>`;
    return;
  }

  eventsListTable.innerHTML = allEvents.map(ev => `
    <tr>
      <td><strong>${ev.title}</strong></td>
      <td>📅 ${ev.date} | 🕒 ${ev.time}</td>
      <td>📍 ${ev.venue}</td>
      <td>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-action btn-success" onclick="editEvent('${ev.id}')">Edit</button>
          <button class="btn-action btn-danger" onclick="deleteEvent('${ev.id}')">Delete</button>
          <button class="btn-action" onclick="window.location.href='explore.html?event=${ev.id}'" style="background: var(--neon-purple); border-color: var(--neon-purple); color: #fff;">Media</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function setupEventForm() {
  eventForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const id = eventIdInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!id) {
      alert("Please enter a valid alphanumeric Event ID.");
      return;
    }

    const eventData = {
      id: id,
      title: eventTitleInput.value.trim(),
      description: eventDescriptionInput.value.trim(),
      date: eventDateInput.value,
      registrationCloseDate: document.getElementById("eventRegCloseDate").value,
      time: eventTimeInput.value.trim(),
      venue: eventVenueInput.value.trim(),
      coordinator: eventCoordinatorInput.value.trim(),
      rules: eventRulesInput.value.trim(),
      results: {
        first: document.getElementById("winnerFirst").value.trim(),
        second: document.getElementById("winnerSecond").value.trim(),
        third: document.getElementById("winnerThird").value.trim()
      }
    };

    try {
      const mode = eventFormMode.value;
      if (mode === "create") {
        // Check if event already exists
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          alert("Event with this ID already exists. Use edit or a different ID.");
          return;
        }
        await setDoc(docRef, eventData);
        alert("Event created successfully!");
      } else {
        const docRef = doc(db, "events", id);
        await setDoc(docRef, eventData, { merge: true });
        alert("Event updated successfully!");
      }

      resetEventForm();
      await loadAllData();
      renderEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. See console for error.");
    }
  });

  btnCancelEditEvent.addEventListener("click", resetEventForm);
}

window.editEvent = function(id) {
  const ev = allEvents.find(e => e.id === id);
  if (!ev) return;

  eventFormMode.value = "edit";
  eventFormTitle.innerText = "Edit Event: " + ev.title;
  
  eventIdInput.value = ev.id;
  eventIdInput.disabled = true; // Cannot change ID of existing document
  
  eventTitleInput.value = ev.title;
  eventDescriptionInput.value = ev.description;
  eventDateInput.value = ev.date;
  document.getElementById("eventRegCloseDate").value = ev.registrationCloseDate || "";
  eventTimeInput.value = ev.time;
  eventVenueInput.value = ev.venue;
  eventCoordinatorInput.value = ev.coordinator;
  eventRulesInput.value = ev.rules || "";

  const findOptionVal = (savedVal) => {
    if (!savedVal) return "";
    const match = allStudents.find(st => st.regNo === savedVal || `${st.name} (${st.regNo})` === savedVal);
    return match ? `${match.name} (${match.regNo})` : savedVal;
  };

  document.getElementById("winnerFirst").value = findOptionVal(ev.results ? ev.results.first : "");
  document.getElementById("winnerSecond").value = findOptionVal(ev.results ? ev.results.second : "");
  document.getElementById("winnerThird").value = findOptionVal(ev.results ? ev.results.third : "");

  btnCancelEditEvent.style.display = "block";
  btnSubmitEvent.innerText = "Update Event Details";
  
  // Scroll to form
  eventForm.scrollIntoView({ behavior: "smooth" });
};

window.deleteEvent = async function(id) {
  if (!confirm("Are you sure you want to delete this event? This will remove the event structure. Registrations for this event in student profiles will remain but reference a deleted event ID.")) return;

  try {
    await deleteDoc(doc(db, "events", id));
    alert("Event deleted successfully.");
    await loadAllData();
    renderEvents();
  } catch (error) {
    console.error("Error deleting event:", error);
    alert("Failed to delete event.");
  }
};

function resetEventForm() {
  eventFormMode.value = "create";
  eventFormTitle.innerText = "Add New Event";
  
  eventIdInput.value = "";
  eventIdInput.disabled = false;
  
  eventTitleInput.value = "";
  eventDescriptionInput.value = "";
  eventDateInput.value = "";
  document.getElementById("eventRegCloseDate").value = "";
  eventTimeInput.value = "";
  eventVenueInput.value = "";
  eventCoordinatorInput.value = "";
  eventRulesInput.value = "";

  document.getElementById("winnerFirst").value = "";
  document.getElementById("winnerSecond").value = "";
  document.getElementById("winnerThird").value = "";

  btnCancelEditEvent.style.display = "none";
  btnSubmitEvent.innerText = "Save Event";
}

// ----------------- STUDENTS MANAGEMENT -----------------
function renderStudents() {
  let queryText = studentSearchInput.value.toLowerCase().trim();
  let filtered = allStudents.filter(st => 
    st.regNo.toLowerCase().includes(queryText) || 
    (st.name || "").toLowerCase().includes(queryText)
  );

  if (filtered.length === 0) {
    studentsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center;">No students found.</td></tr>`;
    return;
  }
  studentsListTable.innerHTML = filtered.map(st => `
    <tr>
      <td><strong>${st.regNo}</strong></td>
      <td>${st.name || "N/A"}</td>
      <td>${st.class || "N/A"}</td>
      <td>🔑 ${st.dob || "N/A"}</td>
      <td>
        <button class="btn-action btn-danger" onclick="deleteStudent('${st.regNo}')">Delete Record</button>
      </td>
    </tr>
  `).join("");
}

function setupStudentForm() {
  studentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const regNo = studentRegNoInput.value.trim().toUpperCase();
    const name = studentNameInput.value.trim();
    const classVal = document.getElementById("studentClass").value.trim();
    const dob = studentDOBInput.value.trim();

    // Verify DOB matches format
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
      alert("DOB must be in DD-MM-YYYY format (e.g. 15-08-2004).");
      return;
    }

    try {
      const docRef = doc(db, "students", regNo);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        alert(`Student with registration number ${regNo} already exists!`);
        return;
      }

      await setDoc(docRef, {
        name: name,
        dob: dob,
        class: classVal,
        registeredEvents: []
      });

      alert("Student added successfully!");
      studentRegNoInput.value = "";
      studentNameInput.value = "";
      document.getElementById("studentClass").value = "";
      studentDOBInput.value = "";

      await loadAllData();
      renderStudents();
    } catch (error) {
      console.error("Error creating student:", error);
      alert("Failed to create student record.");
    }
  });

  studentSearchInput.addEventListener("input", renderStudents);
}

window.deleteStudent = async function(regNo) {
  if (!confirm(`Are you sure you want to delete student ${regNo}? This action is permanent.`)) return;

  try {
    await deleteDoc(doc(db, "students", regNo));
    alert("Student record deleted.");
    await loadAllData();
    renderStudents();
  } catch (error) {
    console.error("Error deleting student:", error);
    alert("Failed to delete student.");
  }
};

// ----------------- ORGANIZERS MANAGEMENT -----------------
function renderOrganizers() {
  if (allOrganizers.length === 0) {
    organizersListTable.innerHTML = `<tr><td colspan="4" style="text-align: center;">No organizers registered.</td></tr>`;
    return;
  }

  organizersListTable.innerHTML = allOrganizers.map(org => {
    const ev = allEvents.find(e => e.id === org.assignedEventId);
    const eventName = ev ? ev.title : `Unmapped (${org.assignedEventId})`;
    return `
      <tr>
        <td><strong>${org.username}</strong></td>
        <td>${org.name}</td>
        <td>${eventName}</td>
        <td>
          <button class="btn-action btn-danger" onclick="deleteOrganizer('${org.username}')">Remove Access</button>
        </td>
      </tr>
    `;
  }).join("");
}

function setupOrganizerForm() {
  organizerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = orgUsernameInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const name = orgNameInput.value.trim();
    const password = orgPasswordInput.value.trim();
    const assignedEventId = orgEventSelect.value;

    if (!username) {
      alert("Please enter a valid alphanumeric username.");
      return;
    }

    try {
      const docRef = doc(db, "organizers", username);
      await setDoc(docRef, {
        name: name,
        password: password,
        assignedEventId: assignedEventId
      });

      alert("Organizer registered successfully!");
      orgUsernameInput.value = "";
      orgNameInput.value = "";
      orgPasswordInput.value = "";
      orgEventSelect.value = "";

      await loadAllData();
      renderOrganizers();
    } catch (error) {
      console.error("Error registering organizer:", error);
      alert("Failed to register organizer.");
    }
  });
}

window.deleteOrganizer = async function(username) {
  if (!confirm(`Are you sure you want to remove organizer credentials for ${username}?`)) return;

  try {
    await deleteDoc(doc(db, "organizers", username));
    alert("Organizer removed.");
    await loadAllData();
    renderOrganizers();
  } catch (error) {
    console.error("Error removing organizer:", error);
    alert("Failed to delete organizer.");
  }
};

// Populate Event Dropdowns across forms
function populateDropdowns() {
  // 1. Organizer Registration Form Dropdown
  const prevVal1 = orgEventSelect.value;
  orgEventSelect.innerHTML = `<option value="">-- Select Event --</option>` + 
    allEvents.map(e => `<option value="${e.id}">${e.title}</option>`).join("");
  orgEventSelect.value = prevVal1;

  // 2. Registrations Tab Dropdown
  const prevVal2 = regEventFilter.value;
  regEventFilter.innerHTML = `<option value="">-- Select Event --</option>` + 
    allEvents.map(e => `<option value="${e.id}">${e.title}</option>`).join("");
  regEventFilter.value = prevVal2;
}

// ----------------- REGISTRATIONS LISTING -----------------
function setupRegistrationsTab() {
  regEventFilter.addEventListener("change", async () => {
    const eventId = regEventFilter.value;
    if (!eventId) {
      registrationsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-sub);">Select an event from the filter to view registrations.</td></tr>`;
      return;
    }

    registrationsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center;">Querying database registrations...</td></tr>`;

    try {
      const q = query(collection(db, "students"), where("registeredEvents", "array-contains", eventId));
      const querySnap = await getDocs(q);
      
      const registrants = [];
      querySnap.forEach(s => {
        registrants.push({ regNo: s.id, ...s.data() });
      });

      if (registrants.length === 0) {
        registrationsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-sub);">No students registered for this event yet.</td></tr>`;
        return;
      }

      registrationsListTable.innerHTML = registrants.map(st => `
        <tr>
          <td><strong>${st.regNo}</strong></td>
          <td>${st.name || "N/A"}</td>
          <td>${st.class || "N/A"}</td>
          <td>${st.email || '<span style="opacity: 0.5;">No email provided</span>'}</td>
        </tr>
      `).join("");

    } catch (error) {
      console.error("Error loading event registrations:", error);
      registrationsListTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--neon-red);">Failed to load registrations.</td></tr>`;
    }
  });
  btnPrintRegistrations.addEventListener("click", () => {
    const eventId = regEventFilter.value;
    if (!eventId) {
      alert("Please select an event first.");
      return;
    }

    const ev = allEvents.find(e => e.id === eventId);
    if (!ev) return;

    printEventTitle.innerText = "Registration Directory for " + ev.title.toUpperCase();

    // Resolve coordinator/organizer name
    const org = allOrganizers.find(o => o.assignedEventId === ev.id);
    const orgName = org ? org.name : (ev.coordinator || "Unassigned");

    // Prepare stylesheet overrides for print layout (black and white, clean table borders)
    const printWindow = window.open('', '_blank');
    const tableHTML = document.getElementById("printableArea").innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Registrations - ${ev.title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #000; background: #fff; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .cyber-table { border: 1px solid #000; }
            h2, h3 { margin: 0; text-align: center; }
            h2 { font-size: 20px; }
            h3 { font-size: 16px; margin-top: 5px; margin-bottom: 20px; font-weight: normal; }
            .info-table td { border: none !important; padding: 4px 0 !important; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2>TECH MANTHAN 6.0</h2>
          <h3>Registration Directory for ${ev.title.toUpperCase()}</h3>
          
          <div style="margin: 20px 0; border: 1px solid #ddd; padding: 15px; border-radius: 6px; background-color: #fafafa; font-size: 14px; line-height: 1.6; text-align: left;">
            <div style="font-weight: bold; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 10px;">Event Parameters & Coordinator</div>
            <table class="info-table" style="width: 100%; border: none; margin-top: 0; margin-bottom: 0;">
              <tr style="border: none;">
                <td style="border: none; padding: 4px 0; width: 50%;"><strong>📅 Date:</strong> ${ev.date || "N/A"}</td>
                <td style="border: none; padding: 4px 0; width: 50%;"><strong>🕒 Time:</strong> ${ev.time || "N/A"}</td>
              </tr>
              <tr style="border: none;">
                <td style="border: none; padding: 4px 0; width: 50%;"><strong>📍 Venue:</strong> ${ev.venue || "N/A"}</td>
                <td style="border: none; padding: 4px 0; width: 50%;"><strong>👤 Coordinator:</strong> ${orgName}</td>
              </tr>
            </table>
            ${ev.description ? `<div style="margin-top: 8px; border-top: 1px dashed #eee; padding-top: 8px;"><strong>Description:</strong> ${ev.description}</div>` : ""}
          </div>

          ${tableHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
  });
}

function renderJudges() {
  if (allEvents.length === 0) {
    judgesEventsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-sub);">No active events.</td></tr>`;
    return;
  }

  judgesEventsTableBody.innerHTML = allEvents.map(ev => {
    const judgesStr = ev.judges && ev.judges.length > 0 ? ev.judges.join(", ") : "<em>None</em>";
    const criteriaStr = ev.criteria && ev.criteria.length > 0 ? ev.criteria.join(", ") : "<em>None</em>";
    
    return `
      <tr>
        <td><strong>${ev.id}</strong></td>
        <td>${ev.title}</td>
        <td>${judgesStr}</td>
        <td>${criteriaStr}</td>
        <td style="text-align: center;">
          <button class="cyber-btn cyber-btn-cyan" style="font-size: 0.8rem; padding: 4px 10px;" onclick="openJudgingModal('${ev.id}')">Allot</button>
        </td>
      </tr>
    `;
  }).join("");
}

window.openJudgingModal = function(eventId) {
  const ev = allEvents.find(e => e.id === eventId);
  if (!ev) return;

  judgingEventIdInput.value = ev.id;
  judgingEventTitleInput.value = ev.title;
  judgingAllottedJudgesInput.value = ev.judges ? ev.judges.join(", ") : "";
  judgingCriteriaInput.value = ev.criteria ? ev.criteria.join(", ") : "";

  judgingModal.classList.add("active");
};

function setupJudgingForm() {
  judgingModalCloseBtn.addEventListener("click", () => {
    judgingModal.classList.remove("active");
  });

  judgingModal.addEventListener("click", (e) => {
    if (e.target === judgingModal) {
      judgingModal.classList.remove("active");
    }
  });

  judgingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const eventId = judgingEventIdInput.value;
    const judgesList = judgingAllottedJudgesInput.value
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const criteriaList = judgingCriteriaInput.value
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        judges: judgesList,
        criteria: criteriaList
      });

      alert("Judging parameters updated successfully!");
      judgingModal.classList.remove("active");
      
      await loadAllData();
      renderJudges();
    } catch (error) {
      console.error("Error updating judging info:", error);
      alert("Failed to save judging parameters.");
    }
  });
}

// Run initial configurations
document.addEventListener("DOMContentLoaded", init);
