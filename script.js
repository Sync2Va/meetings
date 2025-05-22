document.addEventListener('DOMContentLoaded', () => {
    // Prevent right-click context menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    // Prevent keyboard shortcuts for dev tools
    document.addEventListener('keydown', (e) => {
        // Prevent F12
        if (e.key === 'F12') {
            e.preventDefault();
        }
        // Prevent Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'U')) {
            console.log('Prevented:', e.key);
            e.preventDefault();
        }
       
    });

    // Get all control buttons
    const audioBtn = document.getElementById('audio-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const screenShareBtn = document.getElementById('screen-share-btn');
    const participantsBtn = document.getElementById('participants-btn');
    const chatBtn = document.getElementById('chat-btn');
    const endMeetingBtn = document.getElementById('end-meeting-btn');
    const muteBtn = document.getElementById('mute-btn');
    const videoBtn = document.getElementById('video-btn');
    const shareBtn = document.getElementById('share-btn');
    const mainVideo = document.getElementById('main-video');
    const joinOverlay = document.getElementById('join-overlay');
    const joinBtn = document.getElementById('join-btn');
    const bufferingOverlay = document.getElementById('buffering-overlay');
    const passcodeInput = document.getElementById('passcode-input');
    const passcodeError = document.getElementById('passcode-error');
    const participantCount = document.querySelector('.participant-count');

    // State variables
    let isMuted = false;
    let isVideoOff = false;
    let isScreenSharing = false;
    let isBuffering = false;
    let meetingPrompts = []; // Store meeting prompts
    let promptCheckInterval; // Store interval for checking prompts
    const CORRECT_PASSCODE = 'sync2va';
    const HOUR_NOW = new Date().getHours();
    let MEETING_START_TIME = '08:00:00';
    let isAuthenticated = false; // Track authentication state
    let unreadAdminMessages = 0; // Track unread admin messages
    
    // Participant simulation variables
    let participantInterval;
    let currentParticipants = Math.floor(Math.random() * 11) + 25; // Initial count 25-35
    let isParticipantSimulationRunning = false;
    let maxParticipants = Math.floor(Math.random() * (380 - 350 + 1)) + 350; // Random max between 350-380

    // Add these variables at the top with other state variables
    let currentPasscode = '';
    let replyCheckInterval = null;
    let replyCheckTimeout = null;

    // Set initial participant count
    participantCount.textContent = currentParticipants;

    // Meeting timer functionality
    const timerElement = document.getElementById('meeting-timer');

    function updateTimer() {
        const now = new Date();
        const [hours, minutes, seconds] = MEETING_START_TIME.split(':').map(Number);
        const meetingDateTime = new Date();
        meetingDateTime.setHours(hours, minutes, seconds, 0);
        
        const diff = now - meetingDateTime;
        const totalMinutes = Math.floor(diff / (1000 * 60));
        
        // Format meeting time for display
        const meetingTime = meetingDateTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });

        if (diff < 0) {
            // Meeting hasn't started yet
            timerElement.textContent = `The meeting will start at ${meetingTime}`;
            passcodeInput.style.display = 'none';
            joinBtn.style.display = 'none';
        } else if (totalMinutes > 120) { // More than 2 hours have passed
            timerElement.textContent = 'This meeting has ended';
            passcodeInput.style.display = 'none';
            joinBtn.style.display = 'none';
        } else {
            // Meeting is active (within 2 hours)
            passcodeInput.style.display = 'block';
            joinBtn.style.display = 'flex';
            
            if (totalMinutes < 60) {
                timerElement.textContent = `(Meeting started ${totalMinutes} minutes ago)`;
            } else {
                const hours = Math.floor(totalMinutes / 60);
                const remainingMinutes = totalMinutes % 60;
                timerElement.textContent = `(Meeting started ${hours}hr ${remainingMinutes}min ago)`;
            }
        }
    }

    // Update timer every minute
    setInterval(updateTimer, 60000);
    updateTimer(); // Initial call to show time immediately

    // Function to calculate time difference in seconds
    function calculateTimeDifference() {
        // Get current date and time
        const currentTime = new Date();
        
        // Create meeting time for today
        const meetingDateTime = new Date();
        const [hours, minutes, seconds] = MEETING_START_TIME.split(':');
        meetingDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
        
        // Calculate time difference in seconds
        let timeDiff = Math.floor((currentTime - meetingDateTime) / 1000);
        
        // If the difference is negative (current time is before meeting time)
        // or more than 24 hours, adjust the meeting time to the next day
        if (timeDiff < 0 || timeDiff > 86400) { // 86400 seconds = 24 hours
            meetingDateTime.setDate(meetingDateTime.getDate() - 1);
            timeDiff = Math.floor((currentTime - meetingDateTime) / 1000);
        }

        console.log('Meeting Time:', meetingDateTime);
        console.log('Current Time:', currentTime);
        console.log('Time Difference (seconds):', timeDiff);
        
        // If meeting hasn't started yet, return 0
        return Math.max(0, timeDiff);
    }

    // Function to simulate participant count changes
    function simulateParticipants() {
        if (!isParticipantSimulationRunning) return;

        // Calculate elapsed time since MEETING_START_TIME
        const now = new Date();
        const [hours, minutes, seconds] = MEETING_START_TIME.split(':');
        const meetingDateTime = new Date();
        meetingDateTime.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds), 0);
        const elapsedMinutes = Math.floor((now - meetingDateTime) / (1000 * 60));
        
        // Set initial count based on elapsed time
        if (elapsedMinutes >= 20) {
            currentParticipants = Math.floor(Math.random() * (150 - 100 + 1)) + 100; // 100-150
        } else if (elapsedMinutes >= 10) {
            currentParticipants = Math.floor(Math.random() * (80 - 50 + 1)) + 50; // 50-80
        } else {
            currentParticipants = Math.floor(Math.random() * (40 - 20 + 1)) + 20; // 20-40
        }
        participantCount.textContent = currentParticipants;
        
        // Clear any existing interval
        if (participantInterval) {
            clearInterval(participantInterval);
        }
        
        // Set update interval based on elapsed time
        let updateInterval;
        let maxParticipantsToAdd;
        
        if (elapsedMinutes < 10) {
            updateInterval = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000; // 5-10 seconds
            maxParticipantsToAdd = Math.floor(Math.random() * (12 - 5 + 1)) + 5; // 5-12 participants
        } else if (elapsedMinutes < 20) {
            updateInterval = Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000; // 5-10 seconds
            maxParticipantsToAdd = Math.floor(Math.random() * (5 - 1 + 1)) + 1; // 1-5 participants
        } else {
            updateInterval = 20000; // 20 seconds
            maxParticipantsToAdd = Math.floor(Math.random() * (3 - 1 + 1)) + 1; // 1-3 participants
        }
        
        // Start the interval with the appropriate timing
        participantInterval = setInterval(() => {
            const randomAction = Math.random();
            let newParticipants;
            
            // Check if we've reached the maximum limit
            if (currentParticipants >= maxParticipants) {
                // When at max, occasionally fluctuate up and down
                if (randomAction < 0.3) { // 30% chance to reduce
                    newParticipants = -Math.floor(Math.random() * 5) - 1; // Reduce by 1-5
                } else if (randomAction < 0.6) { // 30% chance to increase
                    newParticipants = Math.floor(Math.random() * 5) + 1; // Increase by 1-5
                } else { // 40% chance no change
                    newParticipants = 0;
                }
            } else if (elapsedMinutes >= 15) {
                // For 15+ minutes, apply the full probability distribution
                if (randomAction < 0.2) { // 20% chance someone leaves
                    newParticipants = -1;
                } else if (randomAction < 0.6) { // 40% chance someone joins
                    newParticipants = maxParticipantsToAdd;
                } else { // 40% chance no change
                    newParticipants = 0;
                }
            } else {
                // For less than 15 minutes, only allow joining or no change
                if (randomAction < 0.6) { // 60% chance someone joins
                    newParticipants = maxParticipantsToAdd;
                } else { // 40% chance no change
                    newParticipants = 0;
                }
            }
            
            // Update participant count with maximum limit
            currentParticipants = Math.min(maxParticipants, Math.max(0, currentParticipants + newParticipants));
            participantCount.textContent = currentParticipants;
        }, updateInterval);
    }

    // Function to convert timeframe string to seconds
    function timeframeToSeconds(timeframe) {
        const [hours, minutes, seconds] = timeframe.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    // Function to calculate elapsed seconds since meeting start
    function getElapsedSeconds() {
        const now = new Date();
        const [hours, minutes, seconds] = MEETING_START_TIME.split(':').map(Number);
        const meetingDateTime = new Date();
        meetingDateTime.setHours(hours, minutes, seconds, 0);
        const elapsed = Math.floor((now - meetingDateTime) / 1000);
        return Math.max(0, elapsed);
    }

    // Function to check and send prompts
    function checkAndSendPrompts() {
        const elapsedSeconds = getElapsedSeconds();
        meetingPrompts.forEach(prompt => {
            const promptTime = timeframeToSeconds(prompt.timeframe);
            // Check if we're within 1 second of the prompt time
            if (Math.abs(elapsedSeconds - promptTime) < 1 && !prompt.sent) {
                // Send the prompt as an admin message
                addMessage(prompt.content, false, true);
                prompt.sent = true; // Mark as sent to prevent duplicate messages
            }
        });
    }

    // Security measures
    const originalJoinOverlay = joinOverlay.cloneNode(true);
    const originalPasscodeInput = passcodeInput.cloneNode(true);
    const originalJoinBtn = joinBtn.cloneNode(true);
    const originalPasscodeError = passcodeError.cloneNode(true);

    // Function to restore elements if they're removed
    function restoreElements() {
        if (!document.getElementById('join-overlay')) {
            document.body.appendChild(originalJoinOverlay.cloneNode(true));
        }
        if (!document.getElementById('passcode-input')) {
            const newInput = originalPasscodeInput.cloneNode(true);
            document.querySelector('.passcode-input').appendChild(newInput);
        }
        if (!document.getElementById('join-btn')) {
            const newBtn = originalJoinBtn.cloneNode(true);
            document.querySelector('.join-content').appendChild(newBtn);
        }
        if (!document.getElementById('passcode-error')) {
            const newError = originalPasscodeError.cloneNode(true);
            document.querySelector('.passcode-input').appendChild(newError);
        }
    }

    // Set up MutationObserver to watch for changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // Check if any of our security elements were removed
                if (!isAuthenticated) {
                    restoreElements();
                    // Reattach event listeners
                    attachJoinEventListeners();
                }
            }
        });
    });

    // Start observing the document body for changes
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Function to attach join event listeners
    function attachJoinEventListeners() {
        const newJoinBtn = document.getElementById('join-btn');
        const newPasscodeInput = document.getElementById('passcode-input');
        const newPasscodeError = document.getElementById('passcode-error');

        if (newJoinBtn) {
            newJoinBtn.addEventListener('click', handleJoinMeeting);
        }
        if (newPasscodeInput) {
            newPasscodeInput.addEventListener('input', () => {
                newPasscodeError.classList.remove('show');
            });
            newPasscodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    newJoinBtn.click();
                }
            });
        }
    }

    // Function to store passcode
    function storePasscode(passcode) {
        currentPasscode = passcode;
        // You could also store in sessionStorage as backup
        sessionStorage.setItem('sync2va_passcode', passcode);
    }

    // Function to get stored passcode
    function getStoredPasscode() {
        return currentPasscode || sessionStorage.getItem('sync2va_passcode');
    }

    // Function to send message to API
    async function sendMessageToApi(message) {
        try {
            const passcode = getStoredPasscode();
            if (!passcode) {
                console.error('No passcode found');
                return false;
            }

            const response = await fetch('https://dashboard.sync2va.site/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    passcode: passcode,
                    message: message
                })
            });

            const data = await response.json();
            return data.chat ? true : false;
        } catch (error) {
            console.error('Error sending message:', error);
            return false;
        }
    }

    // Function to check for reply
    async function checkForReply() {
        try {
            const passcode = getStoredPasscode();
            if (!passcode) {
                console.error('No passcode found');
                return null;
            }

            const response = await fetch(`https://dashboard.sync2va.site/api/chat/reply/${passcode}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            return data.chat?.reply_message || null;
        } catch (error) {
            console.error('Error checking reply:', error);
            return null;
        }
    }

    // Function to start monitoring for replies
    function startReplyMonitoring() {
        // Clear any existing intervals/timeouts
        if (replyCheckInterval) clearInterval(replyCheckInterval);
        if (replyCheckTimeout) clearTimeout(replyCheckTimeout);

        // Set up 10-minute timeout
        replyCheckTimeout = setTimeout(() => {
            if (replyCheckInterval) {
                clearInterval(replyCheckInterval);
                replyCheckInterval = null;
            }
        }, 10 * 60 * 1000); // 10 minutes

        // Check every 10 seconds
        replyCheckInterval = setInterval(async () => {
            const reply = await checkForReply();
            if (reply) {
                // Add the reply message to chat
                addMessage(reply, false, true);
                
                // Stop monitoring after receiving reply
                clearInterval(replyCheckInterval);
                clearTimeout(replyCheckTimeout);
                replyCheckInterval = null;
                replyCheckTimeout = null;
            }
        }, 10000); // 10 seconds
    }

    // Modify the updatePasscodeStatus function
    async function updatePasscodeStatus(passcode, status) {
        try {
            const response = await fetch(`https://dashboard.sync2va.site/api/passcode/${passcode}/${status}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();
            console.log(`Passcode status updated to ${status}:`, data);
            return true;
        } catch (error) {
            console.error(`Error updating passcode status to ${status}:`, error);
            return false;
        }
    }

    // Modify handleJoinMeeting function to include status update
    async function handleJoinMeeting() {
        const enteredPasscode = passcodeInput.value.trim();
        
        // Show loading state
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validating...';
        
        try {
            const response = await fetch(`https://dashboard.sync2va.site/api/meeting/${enteredPasscode}`);
            const data = await response.json();
            
            if (data.error) {
                // Show error message
                passcodeError.textContent = data.message || "Invalid passcode. Please try again.";
                passcodeError.classList.add('show');
                passcodeInput.value = '';
                passcodeInput.focus();
            } else {
                isAuthenticated = true;
                // Store meeting prompts
                meetingPrompts = data.meeting.prompts.map(prompt => ({
                    ...prompt,
                    sent: false
                }));

                // Store the passcode and update status
                storePasscode(enteredPasscode);
                await updatePasscodeStatus(enteredPasscode, 'join');

                // Set meeting start time from API response (using only the time portion)
                const meetingStartDateTime = new Date(data.meeting.start);
                const meetingStartTimeStr = meetingStartDateTime.toTimeString().split(' ')[0]; // Get HH:MM:SS
                MEETING_START_TIME = meetingStartTimeStr;
                
                console.log('Meeting start time:', MEETING_START_TIME);
                console.log('Prompts:', meetingPrompts);

                // Send any prompts that should have already been sent
                const currentElapsedSeconds = getElapsedSeconds();
                meetingPrompts.forEach(prompt => {
                    const promptTime = timeframeToSeconds(prompt.timeframe);
                    if (currentElapsedSeconds >= promptTime && !prompt.sent) {
                        addMessage(prompt.content, false, true);
                        prompt.sent = true;
                    }
                });

                // Start checking for prompts
                if (promptCheckInterval) {
                    clearInterval(promptCheckInterval);
                }
                promptCheckInterval = setInterval(() => {
                    checkAndSendPrompts();
                }, 1000); // Check every second

                // Valid passcode
                // Update video URL while preserving parameters
                const currentSrc = mainVideo.src;
                const params = new URLSearchParams(currentSrc.split('?')[1]);
                const newVideoUrl = `${data.meeting.video_url}?${params.toString()}`;
                mainVideo.src = newVideoUrl;
                
                // Hide the overlay
                joinOverlay.style.display = 'none';
                
                // Show announcement overlay
                const announcementOverlay = document.querySelector('.announcement-overlay');
                announcementOverlay.classList.add('show');
                
                // Hide announcement after 5 seconds
                setTimeout(() => {
                    announcementOverlay.classList.remove('show');
                }, 5000);
                
                // Show buffering overlay
                bufferingOverlay.classList.add('active');
                isBuffering = true;
                
                // Calculate elapsed time since meeting start
                const elapsedMinutes = Math.floor(getElapsedSeconds() / 60);
                
                // Set initial participant count based on elapsed time
                if (elapsedMinutes >= 20) {
                    currentParticipants = Math.floor(Math.random() * (150 - 100 + 1)) + 100; // 100-150
                } else if (elapsedMinutes >= 10) {
                    currentParticipants = Math.floor(Math.random() * (80 - 50 + 1)) + 50; // 50-80
                } else {
                    currentParticipants = Math.floor(Math.random() * (40 - 20 + 1)) + 20; // 20-40
                }
                participantCount.textContent = currentParticipants;
                
                // Start participant simulation
                isParticipantSimulationRunning = true;
                simulateParticipants();
                
                // Calculate time difference and start video at correct timestamp
                const timeDiff = getElapsedSeconds();
                const baseUrl = newVideoUrl.split('?')[0];
                const newParams = new URLSearchParams(newVideoUrl.split('?')[1]);
                
                // Update parameters
                newParams.set('autoplay', '1');
                newParams.set('start', timeDiff);
                
                // Set new video source with timestamp
                mainVideo.src = `${baseUrl}?${newParams.toString()}`;

                // Listen for the video to start playing
                const checkVideoState = setInterval(() => {
                    try {
                        // This is a workaround since we can't directly access YouTube iframe events
                        if (mainVideo.contentWindow.document.readyState === 'complete') {
                            clearInterval(checkVideoState);
                            bufferingOverlay.classList.remove('active');
                            isBuffering = false;
                        }
                    } catch (e) {
                        // Cross-origin error, but we can assume the video is loaded
                        clearInterval(checkVideoState);
                        bufferingOverlay.classList.remove('active');
                        isBuffering = false;
                    }
                }, 1000);
            }
        } catch (error) {
            // Handle network or other errors
            passcodeError.textContent = "Network error. Please try again.";
            passcodeError.classList.add('show');
        } finally {
            // Reset button state
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join Meeting';
        }
    }

    // Audio control
    audioBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        // Note: Muting a YouTube iframe is not directly possible due to security restrictions
        audioBtn.innerHTML = `<i class="fas fa-microphone${isMuted ? '-slash' : ''}"></i>`;
    });

    // Video control
    cameraBtn.addEventListener('click', async () => {
        const userVideo = document.getElementById('user-video');
        const cameraFeed = document.querySelector('.user-camera-feed');
        
        if (!isVideoOff) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true,
                    audio: false
                });
                userVideo.srcObject = stream;
                cameraFeed.classList.add('active');
                isVideoOff = true;
                cameraBtn.innerHTML = `<i class="fas fa-video"></i>`;

                // Initialize drag functionality after camera is active
                initDragAndDrop(cameraFeed);
            } catch (err) {
                console.error('Error accessing camera:', err);
                alert('Unable to access camera. Please make sure you have granted camera permissions.');
            }
        } else {
            const stream = userVideo.srcObject;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            userVideo.srcObject = null;
            cameraFeed.classList.remove('active');
            isVideoOff = false;
            cameraBtn.innerHTML = `<i class="fas fa-video-slash"></i>`;
        }
    });

    // Drag and Drop functionality
    function initDragAndDrop(element) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        function dragStart(e) {
            if (e.type === "touchstart") {
                initialX = e.touches[0].clientX - xOffset;
                initialY = e.touches[0].clientY - yOffset;
            } else {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }

            if (e.target === element) {
                isDragging = true;
            }
        }

        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();

                if (e.type === "touchmove") {
                    currentX = e.touches[0].clientX - initialX;
                    currentY = e.touches[0].clientY - initialY;
                } else {
                    currentX = e.clientX - initialX;
                    currentY = e.clientY - initialY;
                }

                xOffset = currentX;
                yOffset = currentY;

                // Get container boundaries
                const container = element.parentElement;
                const containerRect = container.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();

                // Calculate boundaries
                const maxX = containerRect.width - elementRect.width;
                const maxY = containerRect.height - elementRect.height;

                // Constrain movement within container
                currentX = Math.min(Math.max(0, currentX), maxX);
                currentY = Math.min(Math.max(0, currentY), maxY);

                setTranslate(currentX, currentY, element);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }

        // Add event listeners
        element.addEventListener("touchstart", dragStart, false);
        element.addEventListener("touchend", dragEnd, false);
        element.addEventListener("touchmove", drag, false);

        element.addEventListener("mousedown", dragStart, false);
        element.addEventListener("mouseup", dragEnd, false);
        element.addEventListener("mousemove", drag, false);
    }

    // Screen share control
    screenShareBtn.addEventListener('click', () => {
        isScreenSharing = !isScreenSharing;
        screenShareBtn.style.backgroundColor = isScreenSharing ? '#3d3d3d' : '';
    });

    // Participants list toggle
    participantsBtn.addEventListener('click', () => {
        console.log('Participants list toggled');
    });

    // Chat functionality
    const chatSidebar = document.getElementById('chat-sidebar');
    const closeChat = document.getElementById('close-chat');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessageBtn = document.getElementById('send-message');

    // Toggle chat sidebar
    chatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        chatSidebar.classList.add('open');
        // Reset unread count when chat is opened
        unreadAdminMessages = 0;
        updateMessageBadge();
    });

    closeChat.addEventListener('click', () => {
        chatSidebar.classList.remove('open');
    });

    // Close chat when clicking outside
    document.addEventListener('click', (e) => {
        if (chatSidebar.classList.contains('open') && 
            !chatSidebar.contains(e.target) && 
            e.target !== chatBtn) {
            chatSidebar.classList.remove('open');
        }
    });

    // Function to add a message to the chat
    function addMessage(message, isSent = false, isAdmin = false) {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message-container ${isSent ? 'sent' : 'received'}`;
        
        const userIcon = document.createElement('div');
        userIcon.className = 'user-icon';
        if (isAdmin) {
            userIcon.innerHTML = `<i class="fas fa-user-shield"></i>`;
            userIcon.style.backgroundColor = '#4CAF50'; // Green color for admin
        } else {
            userIcon.innerHTML = `<i class="fas fa-user"></i>`;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        if (isAdmin) {
            messageDiv.style.backgroundColor = '#4CAF50'; // Green background for admin messages
        }

        // Convert URLs to clickable links
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
        const linkedMessage = message.replace(urlRegex, (url) => {
            // Add https:// if it's a www link
            const href = url.startsWith('www.') ? `https://${url}` : url;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
        
        messageDiv.innerHTML = linkedMessage;
        
        messageContainer.appendChild(userIcon);
        messageContainer.appendChild(messageDiv);
        chatMessages.appendChild(messageContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Update unread count for admin messages
        if (isAdmin && !chatSidebar.classList.contains('open')) {
            unreadAdminMessages++;
            updateMessageBadge();
        }
    }

    // Function to update message badge
    function updateMessageBadge() {
        const badge = document.getElementById('message-badge');
        if (unreadAdminMessages > 0) {
            badge.textContent = unreadAdminMessages;
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    }

    // Function to show typing indicator
    function showTypingIndicator() {
        const typingContainer = document.createElement('div');
        typingContainer.className = 'message-container received';
        
        const userIcon = document.createElement('div');
        userIcon.className = 'user-icon';
        userIcon.innerHTML = `<i class="fas fa-user"></i>`;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';
        
        typingContainer.appendChild(userIcon);
        typingContainer.appendChild(typingDiv);
        chatMessages.appendChild(typingContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return typingContainer;
    }

    // Function to remove typing indicator
    function removeTypingIndicator(container) {
        container.remove();
    }

    // Modify the existing sendMessage function
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            // Add message to chat UI
            addMessage(message, true);
            
            // Send message to API
            sendMessageToApi(message).then(success => {
                if (success) {
                    // Start monitoring for replies
                    startReplyMonitoring();
                }
            });
            
            chatInput.value = '';
        }
    }

    // Send message on button click
    sendMessageBtn.addEventListener('click', sendMessage);

    // Send message on Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Add some initial messages
    addMessage('Welcome to Sync2VA Message Center! Feel free to send a message.');

    // End meeting
    endMeetingBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to end the meeting?')) {
            const passcode = getStoredPasscode();
            if (passcode) {
                await updatePasscodeStatus(passcode, 'leave');
            }

            // Clear intervals and reset state
            clearInterval(participantInterval);
            isParticipantSimulationRunning = false;
            currentParticipants = 0;
            participantCount.textContent = '0';
            mainVideo.style.opacity = '0';
            
            // Reset the video to non-autoplay state
            const currentSrc = mainVideo.src;
            mainVideo.src = currentSrc.replace('autoplay=1', 'autoplay=0');
            
            // Show the join overlay again
            joinOverlay.style.display = 'flex';
            
            // Hide buffering overlay
            bufferingOverlay.classList.remove('active');
            isBuffering = false;
            
            // Clear stored passcode
            sessionStorage.removeItem('sync2va_passcode');
            currentPasscode = '';
            
            console.log('Meeting ended');
        }
    });

    // Add window unload handler to update status when user leaves unexpectedly
    window.addEventListener('beforeunload', async (event) => {
        const passcode = getStoredPasscode();
        if (passcode) {
            // We need to use synchronous code here due to beforeunload constraints
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `https://dashboard.sync2va.site/api/passcode/${passcode}/leave`, false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            try {
                xhr.send();
            } catch (error) {
                console.error('Error updating passcode status on page unload:', error);
            }
        }
    });

    // Reaction functionality
    const reactionBtn = document.getElementById('reaction-btn');
    const reactionEffects = document.querySelector('.reaction-effects');
    
    // Create reaction panel
    const reactionPanel = document.createElement('div');
    reactionPanel.className = 'reaction-panel';
    
    // Define reactions
    const reactions = [
        { emoji: '👍', label: 'Thumbs Up' },
        { emoji: '👏', label: 'Clap' },
        { emoji: '❤️', label: 'Heart' },
        { emoji: '😂', label: 'Laugh' },
        { emoji: '😮', label: 'Surprise' }
    ];
    
    // Add reaction options to panel
    reactions.forEach(reaction => {
        const option = document.createElement('div');
        option.className = 'reaction-option';
        option.innerHTML = reaction.emoji;
        option.title = reaction.label;
        option.addEventListener('click', () => {
            showReaction(reaction.emoji);
            reactionPanel.classList.remove('show');
        });
        reactionPanel.appendChild(option);
    });
    
    // Add panel to document
    document.body.appendChild(reactionPanel);
    
    // Toggle reaction panel
    reactionBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        reactionPanel.classList.toggle('show');
    });
    
    // Close reaction panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!reactionPanel.contains(e.target) && e.target !== reactionBtn) {
            reactionPanel.classList.remove('show');
        }
    });
    
    // Function to show reaction effect
    function showReaction(emoji) {
        const reaction = document.createElement('div');
        reaction.className = 'reaction-emoji';
        reaction.innerHTML = emoji;
        reaction.style.left = '50%';
        reaction.style.top = '50%';
        reactionEffects.appendChild(reaction);
        
        // Remove reaction after animation
        setTimeout(() => {
            reaction.remove();
        }, 3000);
    }

    // Orientation detection and handling
    const controlsMenu = document.getElementById('controls-menu');
    const menuBtn = document.getElementById('menu-btn');
    const bottomControls = document.querySelector('.bottom-controls');

    function handleOrientation() {
        const isLandscape = window.matchMedia("(orientation: landscape)").matches;
        const isMobile = window.innerWidth <= 768;
        
        if (isLandscape && isMobile) {
            // In landscape mode on mobile
            bottomControls.classList.add('landscape-mode');
            controlsMenu.classList.remove('show');
        } else {
            // In portrait mode or desktop
            bottomControls.classList.remove('landscape-mode');
        }
    }

    // Initial check
    handleOrientation();

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientation);
    window.addEventListener('resize', handleOrientation);

    // Menu toggle functionality
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        controlsMenu.classList.toggle('show');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!controlsMenu.contains(e.target) && e.target !== menuBtn) {
            controlsMenu.classList.remove('show');
        }
    });
}); 