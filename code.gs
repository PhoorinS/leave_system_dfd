/* 
 * Google Apps Script (code.gs)
 * Copy this content to your Google Apps Script project.
 */

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  
  // Check if this is a status update request
  if (data.action === 'updateStatus') {
    return updateLeaveStatus(data.id, data.status);
  }
  
  // Otherwise, it's a new leave submission
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leaves");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("Leaves");
    sheet.appendRow(["Timestamp", "ID", "EmployeeID", "Name", "Position", "Department", "Type", "Reason", "Start", "End", "Contact", "Status"]);
  }
  
  sheet.appendRow([
    new Date(),
    data.id,
    data.employeeId,
    data.name,
    data.position,
    data.department,
    data.type,
    data.reason,
    data.start,
    data.end,
    data.contact,
    data.status
  ]);

  return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
}

function updateLeaveStatus(leaveId, newStatus) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leaves");
    
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({"status": "error", "message": "Sheet not found"})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var idColumnIndex = headers.indexOf("ID");
    var statusColumnIndex = headers.indexOf("Status");
    
    if (idColumnIndex === -1 || statusColumnIndex === -1) {
      return ContentService.createTextOutput(
        JSON.stringify({"status": "error", "message": "Required columns not found"})
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Find the row with matching ID
    for (var i = 1; i < data.length; i++) {
      if (data[i][idColumnIndex].toString() === leaveId.toString()) {
        // Update the status in that row
        sheet.getRange(i + 1, statusColumnIndex + 1).setValue(newStatus);
        
        return ContentService.createTextOutput(
          JSON.stringify({"status": "success", "message": "Status updated"})
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ID not found
    return ContentService.createTextOutput(
      JSON.stringify({"status": "error", "message": "Leave request not found"})
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({"status": "error", "message": error.toString()})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Check if this is an employee lookup request
  if (e.parameter.action === 'getEmployee' && e.parameter.id) {
    return getEmployeeById(e.parameter.id);
  }
  
  // Otherwise, return leave data
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leaves");
    
    // If sheet doesn't exist or is empty, return empty array
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = sheet.getDataRange().getValues();
    
    // If only headers or empty, return empty array
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var rows = data.slice(1);
    
    var result = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(header, i) {
        obj[header.toLowerCase()] = row[i];
      });
      return obj;
    });
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // Return empty array on error
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
}

function getEmployeeById(employeeId) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("name");
    
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({
          "success": false, 
          "message": "Sheet 'name' not found"
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = sheet.getDataRange().getValues();
    
    // Assuming first row is headers: ID, Name, Position, Department
    // Adjust column indices if your sheet structure is different
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toString() === employeeId.toString()) {
        return ContentService.createTextOutput(
          JSON.stringify({
            "success": true,
            "employee": {
              "id": data[i][0],
              "name": data[i][1],
              "position": data[i][2],
              "department": data[i][3]
            }
          })
        ).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Employee not found
    return ContentService.createTextOutput(
      JSON.stringify({
        "success": false,
        "message": "Employee not found"
      })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        "success": false,
        "message": error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
