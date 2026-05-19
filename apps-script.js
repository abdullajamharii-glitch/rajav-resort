/**
 * RAJAV RESORT BOOKING - GOOGLE APPS SCRIPT
 * 
 * Instructions:
 * 1. Open your Google Sheet where bookings are stored.
 * 2. Go to Extensions > Apps Script.
 * 3. Replace all existing code in Code.gs with this code.
 * 4. Save the file.
 * 5. Click "Deploy" > "Manage deployments".
 * 6. Edit the active deployment, change version to "New".
 * 7. Make sure "Execute as" is set to "Me" and "Who has access" is set to "Anyone".
 * 8. Click Deploy.
 */

// Define room capacities (must match frontend)
const ROOM_CAPACITIES = {
  "Premium Jacuzzi Bathtub Room": 1,
  "Premium Beach View Room": 1,
  "Medium Balcony Room": 2,
  "Economy Room": 2,
  "total": 6
};

/**
 * Handles GET requests (checks availability)
 */
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Bookings") || SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indexes
    let checkInIdx = -1;
    let roomTypeIdx = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toString().toLowerCase().trim();
      if (header.includes("check-in") || header.includes("checkin")) {
        checkInIdx = i;
      } else if (header.includes("room type") || header.includes("roomtype") || header.includes("room")) {
        roomTypeIdx = i;
      }
    }
    
    let dateCounts = {};
    
    if (checkInIdx !== -1 && roomTypeIdx !== -1) {
      for (let i = 1; i < data.length; i++) {
        let dateVal = data[i][checkInIdx];
        let roomVal = data[i][roomTypeIdx];
        
        if (!dateVal || !roomVal) continue;
        
        let formattedDate = "";
        if (dateVal instanceof Date) {
          formattedDate = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
        } else {
          formattedDate = dateVal.toString().split('T')[0];
        }
        
        if (!dateCounts[formattedDate]) {
          dateCounts[formattedDate] = { "total": 0 };
        }
        
        dateCounts[formattedDate][roomVal] = (dateCounts[formattedDate][roomVal] || 0) + 1;
        dateCounts[formattedDate]["total"]++;
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(dateCounts))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handles POST requests (processes new bookings/contacts)
 */
function doPost(e) {
  // Use LockService to prevent race conditions
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // Wait up to 10 seconds for other processes to finish
  
  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    
    // Handle Newsletter or Contact form separately
    if (e.parameter.type === "newsletter" || e.parameter.type === "contact") {
      let sheetName = e.parameter.type === "newsletter" ? "Newsletter" : "Contact";
      let sheet = doc.getSheetByName(sheetName) || doc.getSheets()[0];
      appendDataToSheet(sheet, e.parameter);
      
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "status": "SAVED" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // ----------------------------------------------------
    // BOOKING FORM LOGIC (With race-condition prevention)
    // ----------------------------------------------------
    const sheet = doc.getSheetByName("Bookings") || doc.getSheets()[0];
    const checkInDate = e.parameter.checkIn;
    const requestedRoom = e.parameter.roomType;
    
    // 1. Re-check availability BEFORE writing
    if (checkInDate && requestedRoom) {
      const isAvailable = checkAvailabilityStrict(sheet, checkInDate, requestedRoom);
      
      if (!isAvailable) {
        // Reject the booking because it's full!
        return ContentService.createTextOutput(JSON.stringify({ 
          "result": "success", 
          "status": "BOOKING_FULL" 
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // 2. Room is available! Write the booking.
    appendDataToSheet(sheet, e.parameter);
    
    return ContentService.createTextOutput(JSON.stringify({ 
      "result": "success", 
      "status": "BOOKING_CONFIRMED" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    // ALWAYS release the lock
    lock.releaseLock();
  }
}

/**
 * Helper to check availability accurately
 */
function checkAvailabilityStrict(sheet, targetDate, targetRoom) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let checkInIdx = -1;
  let roomTypeIdx = -1;
  
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toString().toLowerCase().trim();
    if (header.includes("check-in") || header.includes("checkin")) checkInIdx = i;
    else if (header.includes("room type") || header.includes("roomtype") || header.includes("room")) roomTypeIdx = i;
  }
  
  if (checkInIdx === -1 || roomTypeIdx === -1) return true; // Can't validate
  
  let bookedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    let rowDate = data[i][checkInIdx];
    let rowRoom = data[i][roomTypeIdx];
    
    if (!rowDate || !rowRoom) continue;
    
    let formattedDate = "";
    if (rowDate instanceof Date) {
      formattedDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      formattedDate = rowDate.toString().split('T')[0];
    }
    
    if (formattedDate === targetDate && rowRoom === targetRoom) {
      bookedCount++;
    }
  }
  
  const capacity = ROOM_CAPACITIES[targetRoom] || 1;
  return bookedCount < capacity;
}

/**
 * Helper to dynamically append data based on sheet headers
 */
function appendDataToSheet(sheet, parameters) {
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  const rowData = [];
  
  if (headers.length === 0 || headers[0] === "") {
    const newHeaders = ["Timestamp"];
    for (let key in parameters) {
      if (key !== "type") newHeaders.push(key);
    }
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    
    rowData.push(new Date());
    for (let i = 1; i < newHeaders.length; i++) {
      rowData.push(parameters[newHeaders[i]] || "");
    }
  } else {
    for (let i = 0; i < headers.length; i++) {
      let header = headers[i].toString().trim();
      let headerLower = header.toLowerCase();
      
      if (headerLower === "timestamp" || headerLower === "date") {
        rowData.push(new Date());
      } else if (parameters[header]) {
        rowData.push(parameters[header]);
      } else {
        let headerClean = headerLower.replace(/[\s\-_]/g, '').replace('date', '');
        let found = false;
        
        // Explicit known mappings for common column names
        const knownMappings = {
          'checkin': parameters.checkIn,
          'checkout': parameters.checkOut,
          'room': parameters.roomType,
          'roomtype': parameters.roomType,
          'guest': parameters.guests,
          'guests': parameters.guests,
          'specialrequests': parameters.requests,
          'requests': parameters.requests,
          'firstname': parameters.firstName,
          'lastname': parameters.lastName,
          'email': parameters.email,
          'emailaddress': parameters.email,
          'phone': parameters.phone,
          'phonenumber': parameters.phone
        };
        
        if (knownMappings[headerClean] !== undefined) {
          rowData.push(knownMappings[headerClean]);
          found = true;
        } else {
          // Dynamic fuzzy matching
          for (let key in parameters) {
            let keyClean = key.toLowerCase().replace(/[\s\-_]/g, '');
            if (keyClean === headerClean || keyClean === headerClean.replace('date', '')) {
              rowData.push(parameters[key]);
              found = true;
              break;
            }
          }
        }
        
        if (!found) rowData.push("");
      }
    }
  }
  
  sheet.appendRow(rowData);
}
