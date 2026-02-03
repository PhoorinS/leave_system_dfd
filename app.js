/*
 * App.js - Leave Management System Logic
 * Integration: Google Sheets via Apps Script
 */

const API_URL = 'https://script.google.com/macros/s/AKfycbxaS-33Brha-5ZdmSf7ff_G_4AUK6zOu7WB5eeVr6I4BiQrWm-dJPOpHtO14yeX1u4e/exec';
let cachedData = [];

// --- Initialization ---
async function init() {
    // Show loading state if possible
    if (document.getElementById('recentRequests')) {
        document.getElementById('recentRequests').innerHTML = '<li class="request-item" style="justify-content: center;">กำลังโหลดข้อมูล...</li>';
    }

    await fetchData();

    // Page Router
    if (document.getElementById('calendarBody')) {
        renderCalendar();
        renderRecentRequests();
        renderMonthlyStats();
    }

    if (document.getElementById('pendingList')) {
        renderAdminList();
    }
}

// --- Data Access ---
async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        cachedData = data;
        return data; // Array of objects
    } catch (error) {
        console.error("Error fetching data:", error);
        // Fallback or empty
        cachedData = [];
        return [];
    }
}

function getData() {
    return cachedData;
}

// --- Calendar Logic ---
function renderCalendar() {
    const calendarBody = document.getElementById('calendarBody');
    const monthLabel = document.getElementById('currentMonthYear');
    if (!calendarBody) return;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    monthLabel.innerText = `${monthNames[currentMonth]} ${currentYear + 543}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    calendarBody.innerHTML = '';

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        calendarBody.innerHTML += `<div class="calendar-day disabled"></div>`;
    }

    const leaves = getData();

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        let dayHtml = `<div class="calendar-day ${d === today.getDate() ? 'today' : ''}">
            <span class="date-num">${d}</span>`;

        // Check for events
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        leaves.forEach(leave => {
            // Note: Date comparison relies on string format YYYY-MM-DD
            // If API returns different format, need parsing. Assuming API returns same format as sent.
            // When reading from Sheet, date might be ISO string. safely handle this:
            let start = leave.start; // assume string YYYY-MM-DD from mock, but Sheet might format it.
            let end = leave.end;

            // Simple string check for now (assuming users input via this app)
            if (start && end) {
                // Convert to YYYY-MM-DD for comparison if needed, but let's try direct compare first
                if (dateStr >= start.substring(0, 10) && dateStr <= end.substring(0, 10) && leave.status !== 'rejected') {
                    const statusClass = leave.status === 'approved' ? 'event-approved' : 'event-pending';
                    dayHtml += `<div class="calendar-event ${statusClass}" title="${leave.name}">
                        ${leave.name}
                    </div>`;
                }
            }
        });

        dayHtml += `</div>`;
        calendarBody.innerHTML += dayHtml;
    }
}

function renderRecentRequests() {
    const list = document.getElementById('recentRequests');
    if (!list) return;

    const leaves = getData();

    if (leaves.length === 0) {
        list.innerHTML = `<li class="request-item" style="justify-content: center; color: #999;">ยังไม่มีรายการ</li>`;
        return;
    }

    list.innerHTML = '';
    // Show last 5
    leaves.slice().reverse().slice(0, 5).forEach(leave => {
        let badgeClass = 'status-pending';
        let statusText = 'รออนุมัติ';
        if (leave.status === 'approved') { badgeClass = 'status-approved'; statusText = 'อนุมัติแล้ว'; }
        if (leave.status === 'rejected') { badgeClass = 'status-rejected'; statusText = 'ไม่อนุมัติ'; }

        list.innerHTML += `
            <li class="request-item">
                <div class="request-info">
                    <h4>${leave.name}</h4>
                    <p>${leave.type} (${leave.start})</p>
                </div>
                <span class="status-badge ${badgeClass}">${statusText}</span>
            </li>
        `;
    });
}

function renderMonthlyStats() {
    const statsContainer = document.getElementById('monthlyStats');
    if (!statsContainer) return;

    const leaves = getData();
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Filter leaves for current month
    const monthlyLeaves = leaves.filter(leave => {
        if (!leave.start) return false;
        const leaveDate = new Date(leave.start);
        return leaveDate.getMonth() === currentMonth && leaveDate.getFullYear() === currentYear;
    });

    // Count by type
    const stats = {
        'sick': 0,
        'personal': 0,
        'work': 0,
        'other': 0
    };

    monthlyLeaves.forEach(leave => {
        const type = leave.type || '';
        if (stats.hasOwnProperty(type)) {
            stats[type]++;
        }
    });

    // Type labels in Thai
    const typeLabels = {
        'sick': 'ลาป่วย',
        'personal': 'ลากิจ',
        'work': 'ลาปฏิบัติราชการ',
        'other': 'ลาระหว่างชั่วโมงการศึกษา'
    };

    // Render stats
    statsContainer.innerHTML = '';
    Object.keys(stats).forEach(type => {
        statsContainer.innerHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>${typeLabels[type]}:</span>
                <span style="font-weight: 600;">${stats[type]} ครั้ง</span>
            </div>
        `;
    });

    if (monthlyLeaves.length === 0) {
        statsContainer.innerHTML = '<p style="text-align: center; color: #999;">ยังไม่มีข้อมูลการลาในเดือนนี้</p>';
    }
}

// --- Form Logic ---
function submitLeave(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = 'กำลังบันทึก...';
    submitBtn.disabled = true;

    const formData = {
        id: Date.now().toString(), // Ensure ID is string for safe keeping
        employeeId: document.getElementById('employeeId').value,
        name: document.getElementById('fullName').value,
        position: document.getElementById('position').value,
        department: document.getElementById('department').value,
        type: document.getElementById('leaveType').value,
        reason: document.getElementById('reason').value,
        start: '',
        end: '',
        contact: document.getElementById('contactAddress').value,
        status: 'pending'
    };

    // Check if it's hourly leave type (other)
    const leaveType = document.getElementById('leaveType').value;
    if (leaveType === 'other') {
        // Use datetime inputs for hourly leave
        formData.start = document.getElementById('startDateTime').value;
        formData.end = document.getElementById('endDateTime').value;
    } else {
        // Use date inputs for regular leave
        formData.start = document.getElementById('startDate').value;
        formData.end = document.getElementById('endDate').value;
    }

    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(formData)
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                alert('บันทึกข้อมูลเรียบร้อยแล้ว');
                window.location.href = 'index.html';
            } else {
                alert('เกิดข้อผิดพลาด: ' + JSON.stringify(result));
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
        });
}

// --- Admin Logic ---
function renderAdminList() {
    const list = document.getElementById('pendingList');
    if (!list) return;

    const leaves = getData();
    const pending = leaves.filter(l => l.status === 'pending');

    if (pending.length === 0) {
        list.innerHTML = `<p style="text-align: center; color: #999; padding: 20px;">ไม่มีรายการรออนุมัติ</p>`;
        return;
    }

    list.innerHTML = '';
    pending.forEach(leave => {
        const div = document.createElement('div');
        div.className = 'request-item';
        div.innerHTML = `
            <div class="request-info">
                <h4>${leave.name} (${leave.position})</h4>
                <p><strong>${leave.type}</strong>: ${leave.start} ถึง ${leave.end} (${leave.reason})</p>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn btn-sm btn-success" onclick="updateStatus('${leave.id}', 'approved')"><i class="fas fa-check"></i> อนุมัติ</button>
                <button class="btn btn-sm btn-danger" onclick="updateStatus('${leave.id}', 'rejected')"><i class="fas fa-times"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

function updateStatus(id, newStatus) {
    if (!confirm('ยืนยันผลการพิจารณา?')) return;

    // Send update request to backend
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateStatus',
            id: id,
            status: newStatus
        })
    })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                // Refresh data and re-render
                fetchData().then(() => {
                    renderAdminList();
                    alert('อัพเดทสถานะเรียบร้อยแล้ว');
                });
            } else {
                alert('เกิดข้อผิดพลาด: ' + (result.message || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error updating status:', error);
            alert('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
        });
}

// Run init
init();
