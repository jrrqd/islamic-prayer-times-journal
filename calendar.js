// Calendar and Journal functionality
let currentDate = new Date();
let selectedDate = new Date();
let currentPage = 1;

// Initialize calendar and journal
function initCalendarAndJournal() {
    setupCalendar();
    setupJournal();
    setupPageNavigation();
    loadJournalEntry(selectedDate);
    updateJournalStats(); // Add initial stats update
}

// Page Navigation
function setupPageNavigation() {
    const nextPageBtn = document.getElementById('next-page');
    const prevPageBtn = document.getElementById('prev-page');
    const dots = document.querySelectorAll('.page-dot');
    
    // Initially hide the prev button since we start on page 1
    prevPageBtn.style.display = 'none';
    
    function navigateToPage(pageNumber) {
        const page1 = document.querySelector('.page-1');
        const page2 = document.querySelector('.page-2');
        
        if (pageNumber === 2 && currentPage === 1) {
            // Moving from page 1 to 2
            page1.classList.add('slide-left');
            page2.style.transform = 'translateX(0)';
            prevPageBtn.style.display = 'flex';
            nextPageBtn.style.display = 'none';
            currentPage = 2;
            // Flash the left arrow button
            flashNavigationButton(prevPageBtn);
        } else if (pageNumber === 1 && currentPage === 2) {
            // Moving from page 2 to 1
            page1.classList.remove('slide-left');
            page2.style.transform = 'translateX(100%)';
            prevPageBtn.style.display = 'none';
            nextPageBtn.style.display = 'flex';
            currentPage = 1;
            // Flash the right arrow button
            flashNavigationButton(nextPageBtn);
        }
        
        // Update dots
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index + 1 === pageNumber);
        });
    }
    
    function flashNavigationButton(button) {
        button.style.transition = 'background-color 0.2s ease';
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        setTimeout(() => {
            button.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        }, 200);
    }
    
    // Event listeners for arrows
    nextPageBtn.addEventListener('click', () => navigateToPage(2));
    prevPageBtn.addEventListener('click', () => navigateToPage(1));
    
    // Event listeners for dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => navigateToPage(index + 1));
    });

    // Enhanced keyboard navigation
    document.addEventListener('keydown', (event) => {
        // Only handle keys if no input elements are focused
        if (document.activeElement.tagName !== 'INPUT' && 
            document.activeElement.tagName !== 'TEXTAREA') {
            
            switch(event.key) {
                case 'ArrowRight':
                    if (currentPage === 1) {
                        navigateToPage(2);
                        event.preventDefault();
                    }
                    break;
                case 'ArrowLeft':
                    if (currentPage === 2) {
                        navigateToPage(1);
                        event.preventDefault();
                    }
                    break;
                case '1':
                    if (currentPage !== 1) {
                        navigateToPage(1);
                        event.preventDefault();
                    }
                    break;
                case '2':
                    if (currentPage !== 2) {
                        navigateToPage(2);
                        event.preventDefault();
                    }
                    break;
            }
        }
    });
}

// Calendar functions
function setupCalendar() {
    updateCalendar();
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });
    
    document.getElementById('jump-date').addEventListener('click', showJumpDateModal);
    document.getElementById('jump-date-button').addEventListener('click', handleJumpDate);
    document.getElementById('close-modal').addEventListener('click', hideJumpDateModal);
    document.getElementById('modal-overlay').addEventListener('click', hideJumpDateModal);
}

function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('current-month').textContent = 
        new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const calendarGrid = document.querySelector('.calendar-grid');
    const weekdayHeaders = document.querySelectorAll('.weekday-header');
    const headerHtml = Array.from(weekdayHeaders).map(header => header.outerHTML).join('');
    calendarGrid.innerHTML = headerHtml;
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
        const prevMonthDay = new Date(year, month, -startingDay + i + 1);
        const dayElement = createDayElement(prevMonthDay.getDate(), true);
        calendarGrid.appendChild(dayElement);
    }
    
    // Add days of the current month
    for (let day = 1; day <= totalDays; day++) {
        const date = new Date(year, month, day);
        const dayElement = createDayElement(day, false, date);
        calendarGrid.appendChild(dayElement);
    }
    
    // Add empty cells for days after the last day of the month
    const remainingCells = 42 - (startingDay + totalDays); // 42 = 6 rows × 7 days
    for (let i = 1; i <= remainingCells; i++) {
        const nextMonthDay = new Date(year, month + 1, i);
        const dayElement = createDayElement(nextMonthDay.getDate(), true);
        calendarGrid.appendChild(dayElement);
    }
}

function createDayElement(day, isOtherMonth, date) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;
    
    if (isOtherMonth) {
        dayElement.classList.add('other-month');
    } else if (date) {
        if (isSameDay(date, new Date())) {
            dayElement.classList.add('today');
        }
        if (isSameDay(date, selectedDate)) {
            dayElement.classList.add('selected');
        }
        
        dayElement.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayElement.classList.add('selected');
            selectedDate = date;
            updateJournalDate();
            loadJournalEntry(date);
        });
    }
    
    return dayElement;
}

// Journal functions
function setupJournal() {
    const textarea = document.querySelector('.journal-textarea');
    let saveTimeout;
    
    textarea.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveJournalEntry(selectedDate, textarea.value);
        }, 500);
    });
    
    updateJournalDate();
}

async function saveJournalEntry(date, content) {
    const dateKey = date.toISOString().split('T')[0];
    const month = dateKey.substring(0, 7); // Gets YYYY-MM format
    
    try {
        // Get the month's journal entries
        const result = await chrome.storage.local.get([`journal_${month}`]);
        const monthEntries = result[`journal_${month}`] || {};
        
        // Update or add the entry for this date
        if (content.trim() === '') {
            // If content is empty, remove the entry
            delete monthEntries[dateKey];
        } else {
            monthEntries[dateKey] = {
                content: content,
                lastModified: new Date().toISOString()
            };
        }
        
        // Save back to storage
        if (Object.keys(monthEntries).length === 0) {
            // If no entries for this month, remove the month entry
            await chrome.storage.local.remove([`journal_${month}`]);
        } else {
            await chrome.storage.local.set({ [`journal_${month}`]: monthEntries });
        }
        
        // Update the journal stats
        updateJournalStats();
    } catch (error) {
        console.error('Error saving journal entry:', error);
        // You might want to show this error to the user
        showNotification('Error saving journal entry. Please try again.');
    }
}

async function loadJournalEntry(date) {
    const dateKey = date.toISOString().split('T')[0];
    const month = dateKey.substring(0, 7);
    
    try {
        const result = await chrome.storage.local.get([`journal_${month}`]);
        const monthEntries = result[`journal_${month}`] || {};
        const entry = monthEntries[dateKey];
        
        document.querySelector('.journal-textarea').value = entry ? entry.content : '';
        
        // Update last modified info if entry exists
        if (entry && entry.lastModified) {
            updateLastModifiedInfo(entry.lastModified);
        } else {
            hideLastModifiedInfo();
        }
        
        // Update journal stats when loading entries
        updateJournalStats();
    } catch (error) {
        console.error('Error loading journal entry:', error);
        document.querySelector('.journal-textarea').value = '';
        showNotification('Error loading journal entry.');
    }
}

async function updateJournalStats() {
    try {
        // Get all keys that start with 'journal_'
        const result = await chrome.storage.local.get(null);
        const journalKeys = Object.keys(result).filter(key => key.startsWith('journal_'));
        
        let totalEntries = 0;
        let oldestEntry = null;
        let newestEntry = null;
        
        for (const key of journalKeys) {
            const monthEntries = result[key];
            const entries = Object.values(monthEntries);
            
            totalEntries += entries.length;
            
            entries.forEach(entry => {
                const entryDate = new Date(entry.lastModified);
                if (!oldestEntry || entryDate < oldestEntry) {
                    oldestEntry = entryDate;
                }
                if (!newestEntry || entryDate > newestEntry) {
                    newestEntry = entryDate;
                }
            });
        }
        
        // Update stats in the UI
        updateJournalStatsUI(totalEntries, oldestEntry, newestEntry);
    } catch (error) {
        console.error('Error updating journal stats:', error);
    }
}

function updateJournalStatsUI(totalEntries, oldestEntry, newestEntry) {
    const statsContainer = document.querySelector('.journal-stats');
    if (!statsContainer) {
        return;
    }
    
    if (totalEntries === 0) {
        statsContainer.textContent = 'No entries yet';
        return;
    }
    
    const oldestDate = oldestEntry ? oldestEntry.toLocaleDateString() : 'N/A';
    const newestDate = newestEntry ? newestEntry.toLocaleDateString() : 'N/A';
    
    statsContainer.textContent = 
        `${totalEntries} entries • First: ${oldestDate} • Latest: ${newestDate}`;
}

function updateLastModifiedInfo(lastModified) {
    const lastModifiedElement = document.querySelector('.journal-last-modified');
    if (!lastModifiedElement) {
        return;
    }
    
    const date = new Date(lastModified);
    lastModifiedElement.textContent = `Last modified: ${date.toLocaleString()}`;
    lastModifiedElement.style.display = 'block';
}

function hideLastModifiedInfo() {
    const lastModifiedElement = document.querySelector('.journal-last-modified');
    if (lastModifiedElement) {
        lastModifiedElement.style.display = 'none';
    }
}

function showNotification(message) {
    // You can implement this to show error messages to the user
    console.log(message);
}

function updateJournalDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.querySelector('.journal-date').textContent = 
        `Journal Entry - ${selectedDate.toLocaleDateString('en-US', options)}`;
}

// Date Modal functions
function showJumpDateModal() {
    document.getElementById('modal-overlay').classList.add('active');
    document.getElementById('jump-date-modal').classList.add('active');
    document.getElementById('jump-date-input').valueAsDate = selectedDate;
}

function hideJumpDateModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.getElementById('jump-date-modal').classList.remove('active');
}

function handleJumpDate() {
    const input = document.getElementById('jump-date-input');
    const newDate = new Date(input.value);
    
    if (!isNaN(newDate.getTime())) {
        currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        selectedDate = newDate;
        updateCalendar();
        updateJournalDate();
        loadJournalEntry(selectedDate);
        hideJumpDateModal();
    }
}

// Utility functions
function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initCalendarAndJournal); 