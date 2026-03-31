const API_BASE_URL = 'http://api.aladhan.com/v1/timings';

// Add this at the top of the file with other global variables
let countdownInterval = null;

function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    document.getElementById('current-time').textContent = timeString;
}

function formatCountdown(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function getPrayerTimes(latitude, longitude) {
    try {
        const response = await fetch(`${API_BASE_URL}/${Math.floor(Date.now()/1000)}?latitude=${latitude}&longitude=${longitude}&method=2`);
        if (!response.ok) {
            throw new Error('Failed to fetch prayer times');
        }
        const data = await response.json();
        if (!data.data || !data.data.timings) {
            throw new Error('Invalid prayer times data received');
        }
        return data.data.timings;
    } catch (error) {
        console.error('Error fetching prayer times:', error);
        throw error;
    }
}

function updatePrayerCountdown(prayerTimes) {
    const now = new Date();
    let nextPrayer = null;
    let nextPrayerTime = null;
    let prevPrayerTime = null;
    let activePrayer = null;

    const prayers = {
        'Fajr': convertToDate(prayerTimes.Fajr),
        'Dhuhr': convertToDate(prayerTimes.Dhuhr),
        'Asr': convertToDate(prayerTimes.Asr),
        'Maghrib': convertToDate(prayerTimes.Maghrib),
        'Isha': convertToDate(prayerTimes.Isha)
    };

    // Reset all prayer time styles
    document.querySelectorAll('#prayer-table tr').forEach(row => {
        row.classList.remove('prayer-active', 'prayer-passed', 'prayer-next', 'prayer-upcoming');
    });

    // Find active and next prayer
    let foundNext = false;
    let previousPrayer = null;
    for (const [prayer, time] of Object.entries(prayers)) {
        const row = document.querySelector(`#${prayer.toLowerCase()}-time`).parentElement;
        
        if (!foundNext && time > now) {
            nextPrayer = prayer;
            nextPrayerTime = time;
            prevPrayerTime = previousPrayer ? prayers[previousPrayer] : convertToDate(prayerTimes.Isha, true);
            foundNext = true;
            row.classList.add('prayer-next');
        } else if (foundNext) {
            row.classList.add('prayer-upcoming');
        } else {
            // If this is the last prayer that passed, it's active until the next one
            if (!nextPrayer) {
                const nextTime = new Date(time);
                nextTime.setMinutes(time.getMinutes() + 20); // Prayer is considered active for 20 minutes
                if (now < nextTime) {
                    row.classList.add('prayer-active');
                    activePrayer = prayer;
                } else {
                    row.classList.add('prayer-passed');
                }
            } else {
                row.classList.add('prayer-passed');
            }
        }
        previousPrayer = prayer;
    }

    // If no next prayer found today, use first prayer of next day
    if (!nextPrayer) {
        nextPrayer = 'Fajr';
        nextPrayerTime = convertToDate(prayerTimes.Fajr);
        nextPrayerTime.setDate(nextPrayerTime.getDate() + 1);
        prevPrayerTime = prayers.Isha;
        
        // Mark Fajr as next
        document.querySelector('#fajr-time').parentElement.classList.add('prayer-next');
    }

    // Calculate time difference
    const diff = nextPrayerTime - now;
    
    // Update countdown display
    document.getElementById('prayer-countdown').textContent = `${formatCountdown(diff)} to ${nextPrayer}`;
    
    // Update progress bar
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        const totalInterval = nextPrayerTime - prevPrayerTime;
        const elapsed = now - prevPrayerTime;
        const progress = Math.min(Math.max(elapsed / totalInterval, 0), 1);
        progressBar.style.transform = `scaleX(${progress})`;
    }
}

async function setBackground() {
    try {
        const timestamp = new Date().getTime();
        const bingUrl = `https://bingw.jasonzeng.dev/?index=random&t=${timestamp}`;
        
        // Create an image element to preload
        const img = new Image();
        
        const imagePromise = new Promise((resolve, reject) => {
            img.onload = () => resolve(bingUrl);
            img.onerror = () => reject(new Error('Failed to load Bing image'));
            img.src = bingUrl;
        });

        // Race between image loading and timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Bing image load timeout')), 5000)
        );

        // Try to load Bing image first
        try {
            const url = await Promise.race([imagePromise, timeoutPromise]);
            document.body.style.backgroundImage = `url(${url})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed';
        } catch (error) {
            console.warn('Falling back to Unsplash:', error.message);
            // If Bing image fails, use Unsplash
            const unsplashUrl = `https://source.unsplash.com/random/1920x1080/?nature,landscape&t=${timestamp}`;
            document.body.style.backgroundImage = `url(${unsplashUrl})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed';
        }
    } catch (error) {
        console.error('Error setting background:', error);
        // Final fallback
        const fallbackUrl = 'https://source.unsplash.com/random/1920x1080/?nature,landscape';
        document.body.style.backgroundImage = `url(${fallbackUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
    }
}

// Call setBackground immediately and set up retry mechanism
setBackground().catch((error) => {
    console.warn('Initial background load failed, retrying:', error);
    // If initial load fails, retry once after 2 seconds
    setTimeout(() => {
        setBackground().catch(error => {
            console.error('Background retry failed:', error);
        });
    }, 2000);
});

async function loadProverb() {
    const response = await fetch('Islamic_Proverbs_365.txt');
    const text = await response.text();
    const proverbs = text.split('\n');
    const randomProverb = proverbs[Math.floor(Math.random() * proverbs.length)];
    document.getElementById('proverb').textContent = randomProverb;
}

function createTodoItem(todoData = { text: '', checked: false }) {
    const todoItem = document.createElement('div');
    todoItem.className = 'todo-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `check${Date.now()}`;
    checkbox.checked = todoData.checked;
    
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Add task...';
    textInput.value = todoData.text;
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-todo';
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Delete task';
    
    // Add event listeners
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            textInput.style.textDecoration = 'line-through';
            textInput.style.opacity = '0.7';
            // Move to bottom
            const todoContainer = document.getElementById('todo-container');
            todoContainer.appendChild(todoItem);
        } else {
            textInput.style.textDecoration = 'none';
            textInput.style.opacity = '1';
            // Move back to proper position
            const todoContainer = document.getElementById('todo-container');
            const todos = Array.from(todoContainer.children);
            const uncheckedTodos = todos.filter(todo => 
                !todo.querySelector('input[type="checkbox"]').checked
            );
            if (uncheckedTodos.length > 0) {
                todoContainer.insertBefore(todoItem, uncheckedTodos[uncheckedTodos.length - 1].nextSibling);
            } else {
                todoContainer.insertBefore(todoItem, todoContainer.firstChild);
            }
        }
        saveTodoList();
    });
    
    textInput.addEventListener('input', saveTodoList);
    
    deleteButton.addEventListener('click', () => {
        todoItem.classList.add('deleting');
        setTimeout(() => {
            todoItem.remove();
            saveTodoList();
        }, 500); // Match this with the animation duration
    });
    
    todoItem.appendChild(checkbox);
    todoItem.appendChild(textInput);
    todoItem.appendChild(deleteButton);
    
    // Apply initial styles if checked
    if (todoData.checked) {
        textInput.style.textDecoration = 'line-through';
        textInput.style.opacity = '0.7';
    }
    
    return todoItem;
}

function loadTodoList() {
    chrome.storage.sync.get(['todos'], function(result) {
        const todoContainer = document.getElementById('todo-container');
        if (!todoContainer) {
            console.warn('Todo container not found');
            return;
        }
        
        todoContainer.innerHTML = ''; // Clear existing todos
        
        try {
            if (result.todos && Array.isArray(result.todos) && result.todos.length > 0) {
                // Sort todos: unchecked first, then checked
                const sortedTodos = result.todos.sort((a, b) => {
                    if (a.checked === b.checked) return 0;
                    return a.checked ? 1 : -1;
                });
                
                sortedTodos.forEach(todo => {
                    if (todo && typeof todo === 'object') {
                        const todoItem = createTodoItem(todo);
                        todoContainer.appendChild(todoItem);
                    }
                });
            }
            
            // Always ensure there's at least one empty todo item at the top
            const emptyTodo = createTodoItem();
            const firstTodo = todoContainer.firstChild;
            if (firstTodo) {
                todoContainer.insertBefore(emptyTodo, firstTodo);
            } else {
                todoContainer.appendChild(emptyTodo);
            }
        } catch (error) {
            console.error('Error loading todos:', error);
            // Ensure there's at least one empty todo item on error
            todoContainer.innerHTML = '';
            todoContainer.appendChild(createTodoItem());
        }
    });
}

function saveTodoList() {
    try {
        const todos = [];
        document.querySelectorAll('.todo-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const textInput = item.querySelector('input[type="text"]');
            
            if (checkbox && textInput) {
                // Save todos that have text or are checked
                if (textInput.value.trim() || checkbox.checked) {
                    todos.push({
                        text: textInput.value,
                        checked: checkbox.checked
                    });
                }
            }
        });
        
        chrome.storage.sync.set({ todos }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error saving todos:', chrome.runtime.lastError);
            }
        });
    } catch (error) {
        console.error('Error saving todo list:', error);
    }
}

function initTodoList() {
    try {
        // Load existing todos
        loadTodoList();
        
        // Add event listener for the add todo button
        const addTodoButton = document.getElementById('add-todo-button');
        if (addTodoButton) {
            addTodoButton.addEventListener('click', () => {
                const todoContainer = document.getElementById('todo-container');
                if (todoContainer) {
                    const newTodoItem = createTodoItem();
                    todoContainer.appendChild(newTodoItem);
                    const textInput = newTodoItem.querySelector('input[type="text"]');
                    if (textInput) {
                        textInput.focus();
                    }
                    saveTodoList();
                }
            });
        } else {
            console.warn('Add todo button not found');
        }
    } catch (error) {
        console.error('Error initializing todo list:', error);
    }
}

function isLastFriday() {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const lastFriday = new Date(lastDay);
    lastFriday.setDate(lastFriday.getDate() - (lastFriday.getDay() + 2) % 7);
    return today.getDate() === lastFriday.getDate() && today.getDay() === 5;
}

function setupDonationButton() {
    chrome.storage.local.get(['lastDonationClick'], function(result) {
        const lastClick = result.lastDonationClick;
        const today = new Date().toDateString();
        
        if (isLastFriday() && lastClick !== today) {
            const donationContainer = document.getElementById('donation-container');
            donationContainer.innerHTML = `
                <a href="https://buymeacoffee.com/suluhadi" target="_blank" class="donation-button">
                    Support the Developer ☕
                </a>
            `;
            
            donationContainer.querySelector('a').addEventListener('click', () => {
                chrome.storage.local.set({ lastDonationClick: today });
                donationContainer.style.display = 'none';
            });
        }
    });
}

// New function to check if location needs refresh
function shouldRefreshLocation() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['lastLocationUpdate'], function(result) {
            const lastUpdate = result.lastLocationUpdate;
            const now = new Date().getTime();
            
            // If no last update or it's been more than 24 hours
            if (!lastUpdate || (now - lastUpdate) > 24 * 60 * 60 * 1000) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

// New function to save location data
function saveLocationData(locationData) {
    chrome.storage.local.set({
        lastLocationUpdate: new Date().getTime(),
        cachedLocation: locationData
    });
}

// New function to get location data
async function getLocationData() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['cachedLocation'], function(result) {
            resolve(result.cachedLocation);
        });
    });
}

function updatePrayerTimeStyles(prayerTimes) {
    // No color coding needed - all times are white by default
}

function convertToDate(timeString, nextDay = false) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    if (nextDay) {
        date.setDate(date.getDate() + 1);
    }
    date.setHours(parseInt(hours), parseInt(minutes), 0);
    return date;
}

async function updateLocation() {
    const locationElement = document.getElementById('location');
    const originalText = locationElement.textContent;
    
    try {
        locationElement.textContent = 'Updating location...';
        locationElement.style.opacity = '0.7';
        
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                (error) => {
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            reject(new Error('Location access denied'));
                            break;
                        case error.POSITION_UNAVAILABLE:
                            reject(new Error('Location unavailable'));
                            break;
                        case error.TIMEOUT:
                            reject(new Error('Request timed out'));
                            break;
                        default:
                            reject(new Error('Location error'));
                    }
                },
                {
                    timeout: 10000,
                    maximumAge: 0,
                    enableHighAccuracy: true
                }
            );
        });
        
        const { latitude, longitude } = position.coords;
        
        const [prayerTimes, geoData] = await Promise.all([
            getPrayerTimes(latitude, longitude),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Location lookup failed');
                    }
                    return response.json();
                })
        ]);
        
        const locationData = {
            latitude,
            longitude,
            prayerTimes,
            cityName: geoData.address.city || geoData.address.town || geoData.address.state || 'Unknown Location',
            timestamp: new Date().getTime()
        };
        
        // Save the new location data
        saveLocationData(locationData);
        
        // Update UI
        locationElement.textContent = locationData.cityName;
        locationElement.style.opacity = '1';
        document.getElementById('fajr-time').textContent = locationData.prayerTimes.Fajr;
        document.getElementById('dhuhr-time').textContent = locationData.prayerTimes.Dhuhr;
        document.getElementById('asr-time').textContent = locationData.prayerTimes.Asr;
        document.getElementById('maghrib-time').textContent = locationData.prayerTimes.Maghrib;
        document.getElementById('isha-time').textContent = locationData.prayerTimes.Isha;
        
        updatePrayerCountdown(locationData.prayerTimes);
        
        // Clear existing interval if any
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        // Set up new countdown interval
        countdownInterval = setInterval(() => updatePrayerCountdown(locationData.prayerTimes), 1000);
        
    } catch (error) {
        console.error('Error updating location:', error);
        locationElement.textContent = `Error: ${error.message}`;
        locationElement.style.opacity = '1';
        
        // Restore original text after error
        setTimeout(() => {
            locationElement.textContent = originalText;
        }, 3000);
        
        // Use cached data if available
        const cachedData = await getLocationData();
        if (cachedData) {
            locationElement.textContent = `${cachedData.cityName} (Cached)`;
            document.getElementById('fajr-time').textContent = cachedData.prayerTimes.Fajr;
            document.getElementById('dhuhr-time').textContent = cachedData.prayerTimes.Dhuhr;
            document.getElementById('asr-time').textContent = cachedData.prayerTimes.Asr;
            document.getElementById('maghrib-time').textContent = cachedData.prayerTimes.Maghrib;
            document.getElementById('isha-time').textContent = cachedData.prayerTimes.Isha;
            updatePrayerCountdown(cachedData.prayerTimes);
            
            // Clear existing interval if any
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            // Set up new countdown interval for cached data
            countdownInterval = setInterval(() => updatePrayerCountdown(cachedData.prayerTimes), 1000);
        }
    }
}

// Initialize location data
async function initLocationData() {
    try {
        // First try to get cached location data
        let locationData = await getLocationData();
        const locationElement = document.getElementById('location');
        
        // Make location text clickable
        locationElement.style.cursor = 'pointer';
        locationElement.title = 'Click to update location';
        locationElement.addEventListener('click', async () => {
            try {
                const originalText = locationElement.textContent;
                locationElement.textContent = 'Updating location...';
                locationElement.style.opacity = '0.7';
                await updateLocation();
                locationElement.style.opacity = '1';
            } catch (error) {
                locationElement.textContent = 'Error updating location';
                locationElement.style.opacity = '1';
                setTimeout(() => {
                    locationElement.textContent = originalText;
                }, 2000);
            }
        });
        
        // If no cached data or needs refresh, update location
        if (!locationData || await shouldRefreshLocation()) {
            await updateLocation();
        } else {
            // Use cached data
            locationElement.textContent = locationData.cityName;
            document.getElementById('fajr-time').textContent = locationData.prayerTimes.Fajr;
            document.getElementById('dhuhr-time').textContent = locationData.prayerTimes.Dhuhr;
            document.getElementById('asr-time').textContent = locationData.prayerTimes.Asr;
            document.getElementById('maghrib-time').textContent = locationData.prayerTimes.Maghrib;
            document.getElementById('isha-time').textContent = locationData.prayerTimes.Isha;
            updatePrayerCountdown(locationData.prayerTimes);
            
            // Clear existing interval if any
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            // Set up new countdown interval
            countdownInterval = setInterval(() => updatePrayerCountdown(locationData.prayerTimes), 1000);
        }
    } catch (error) {
        console.error('Error initializing location data:', error);
        document.getElementById('location').textContent = 'Error loading prayer times';
    }
}

async function addToGoogleCalendar(prayerTimes, location) {
    try {
        // Remove all cached tokens first
        await new Promise((resolve) => {
            chrome.identity.clearAllCachedAuthTokens(resolve);
        });

        // Get a fresh auth token with interactive prompt and all required scopes
        let token = await new Promise((resolve, reject) => {
            const manifest = chrome.runtime.getManifest();
            const scopes = manifest.oauth2.scopes;
            
            chrome.identity.getAuthToken({ 
                interactive: true,
                scopes: scopes
            }, function(token) {
                if (chrome.runtime.lastError) {
                    console.error('Auth Error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (!token) {
                    reject(new Error('Failed to obtain authorization token'));
                    return;
                }
                resolve(token);
            });
        });

        // Test the token with proper error handling
        const testResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        if (!testResponse.ok) {
            await new Promise((resolve) => {
                chrome.identity.removeCachedAuthToken({ token }, resolve);
            });

            token = await new Promise((resolve, reject) => {
                chrome.identity.getAuthToken({ 
                    interactive: true,
                    scopes: [
                        "https://www.googleapis.com/auth/calendar",
                        "https://www.googleapis.com/auth/calendar.events"
                    ]
                }, function(newToken) {
                    if (!newToken) {
                        reject(new Error('Could not obtain new authorization token'));
                        return;
                    }
                    resolve(newToken);
                });
            });
        }

        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // Search for existing events with more specific time range
        const searchResponse = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
            `timeMin=${dateStr}T00:00:00Z&` +
            `timeMax=${dateStr}T23:59:59Z&` +
            `q=Prayer&singleEvents=true`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            }
        );
        
        if (!searchResponse.ok) {
            const errorData = await searchResponse.json();
            throw new Error(`Failed to search events: ${errorData.error?.message || 'Unknown error'}`);
        }

        const searchData = await searchResponse.json();
        const existingEvents = searchData.items || [];
        
        // Create a map of existing prayer events
        const existingPrayerEvents = new Map();
        existingEvents.forEach(event => {
            if (event.summary && event.summary.includes('Prayer')) {
                const eventTime = new Date(event.start.dateTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                existingPrayerEvents.set(eventTime, event.id);
            }
        });

        // Add new prayer events, avoiding duplicates
        const prayers = {
            'Fajr': prayerTimes.Fajr,
            'Dhuhr': prayerTimes.Dhuhr,
            'Asr': prayerTimes.Asr,
            'Maghrib': prayerTimes.Maghrib,
            'Isha': prayerTimes.Isha
        };

        for (const [prayer, time] of Object.entries(prayers)) {
            // Check if prayer event already exists at this time
            if (existingPrayerEvents.has(time)) {
                console.log(`Prayer event for ${prayer} at ${time} already exists, skipping...`);
                continue;
            }

            const [hours, minutes] = time.split(':');
            const startTime = new Date(today);
            startTime.setHours(parseInt(hours), parseInt(minutes), 0);
            
            const endTime = new Date(startTime);
            endTime.setMinutes(endTime.getMinutes() + 30);

            const event = {
                summary: `${prayer} Prayer`,
                description: `Daily prayer time for ${prayer}`,
                location: location,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'popup', minutes: 0 }
                    ]
                },
                // Add a unique identifier to help identify our events
                extendedProperties: {
                    private: {
                        'prayer-app-id': 'prayer-time-extension',
                        'prayer-type': prayer,
                        'prayer-date': dateStr
                    }
                }
            };

            const response = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(event),
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to add ${prayer} prayer event: ${errorData.error?.message || 'Unknown error'}`);
            }
        }

        return true;

    } catch (error) {
        console.error('Calendar Error:', error);
        if (error.message.includes('third-party')) {
            throw new Error('Please enable third-party cookies for Google Calendar integration');
        }
        throw error;
    }
}

function setupCalendarIntegration() {
    const prayerHeading = document.querySelector('.prayer-column h1');
    if (prayerHeading) {
        prayerHeading.style.cursor = 'pointer';
        prayerHeading.title = 'Click to add prayer times to Google Calendar';
        
        prayerHeading.addEventListener('click', async () => {
            try {
                const locationData = await getLocationData();
                if (!locationData) {
                    throw new Error('No location data available');
                }

                const originalText = prayerHeading.textContent;
                prayerHeading.textContent = 'Adding to calendar...';
                prayerHeading.style.opacity = '0.7';
                
                await addToGoogleCalendar(locationData.prayerTimes, locationData.cityName);
                
                prayerHeading.textContent = 'Added to calendar!';
                setTimeout(() => {
                    prayerHeading.textContent = originalText;
                    prayerHeading.style.opacity = '1';
                }, 2000);
            } catch (error) {
                console.error('Failed to add to calendar:', error);
                prayerHeading.textContent = 'Failed to add to calendar';
                
                // Show a more user-friendly error message
                if (error.message.includes('Invalid token')) {
                    prayerHeading.textContent = 'Please authorize and try again';
                } else {
                    prayerHeading.textContent = 'Failed to add to calendar';
                }
                
                setTimeout(() => {
                    prayerHeading.textContent = 'Prayer Time';
                    prayerHeading.style.opacity = '1';
                }, 3000);
            }
        });
    }
}

// Update the init() function to include calendar setup
async function init() {
    try {
        // Check if this is the first time loading the app
        chrome.storage.local.get(['hasSeenWelcome'], function(result) {
            if (!result.hasSeenWelcome) {
                // Show welcome page
                window.open(chrome.runtime.getURL('welcome.html'), '_blank');
                // Mark that user has seen welcome page
                chrome.storage.local.set({ hasSeenWelcome: true });
            }
        });

        await initLocationData();
        await setBackground();
        
        // Initialize clock
        updateClock();
        setInterval(updateClock, 1000);
        
        // Load random proverb
        await loadProverb();
        
        // Initialize todo list
        initTodoList();
        
        // Setup calendar integration
        setupCalendarIntegration();
        
        // Setup donation button if it's last Friday
        if (isLastFriday()) {
            setupDonationButton();
        }
        
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);
