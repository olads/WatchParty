// --- DOM Elements ---
const videoFileInput = document.getElementById('videoFile');
const uploadButton = document.getElementById('uploadButton');
const uploadMessage = document.getElementById('uploadMessage');
const videoList = document.getElementById('videoList');
const loadingSpinner = document.getElementById('loadingSpinner');
const noVideosMessage = document.getElementById('noVideosMessage');
const uploadSection = document.getElementById('upload-section');
const videoListSection = document.getElementById('video-list-section');

const videoPlayerSection = document.getElementById('video-player-section');
const videoPlayerElement = document.getElementById('videoPlayer'); // The raw <video> tag
let plyrPlayerInstance = null; // Will hold the Plyr player instance
const currentVideoTitle = document.getElementById('currentVideoTitle');
const backToVideosButton = document.getElementById('backToVideosButton');
var seekFromMe = false;

var videoLink = "";
// --- WebSocket Variables ---
let stompClient = null;

var currentControlType = String;
let isWebSocketConnected = false; // Internal flag to track WebSocket connection status
// Removed direct references to connectionStatus, sendPlayButton, etc. from HTML

// --- Helper Functions ---

/**
 * Displays a message to the user for a short duration in the upload section.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error' to apply appropriate styling.
 */
function showUploadMessage(message, type) {
    uploadMessage.textContent = message;
    if (type === 'success') {
        uploadMessage.className = 'mt-4 text-center text-sm font-medium text-green-600';
    } else if (type === 'error') {
        uploadMessage.className = 'mt-4 text-center text-sm font-medium text-red-600';
    } else {
        uploadMessage.className = 'mt-4 text-center text-sm font-medium text-gray-700';
    }
    setTimeout(() => {
        uploadMessage.textContent = '';
        uploadMessage.className = 'mt-4 text-center text-sm font-medium'; // Reset class
    }, 5000); // Message disappears after 5 seconds
}

// --- Video Management Functions ---

/**
 * Fetches the list of uploaded videos from the backend.
 */
async function fetchVideos() {
    videoList.innerHTML = ''; // Clear existing list
    loadingSpinner.classList.remove('hidden'); // Show loading spinner
    noVideosMessage.classList.add('hidden'); // Hide no videos message

    try {
        const response = await fetch('/videos');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const videos = await response.json();

        if (videos.length === 0) {
            noVideosMessage.classList.remove('hidden'); // Show no videos message
        } else {
            videos.forEach(videoUrl => {
                console.log(videoUrl)
                // Extract filename from URL for display
                const filename = videoUrl.substring(videoUrl.lastIndexOf('/') + 1);
                console.log("/file/" + filename)
                videoLink = "/file/" + filename
                const listItem = document.createElement('li');
                listItem.className = 'p-4 bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer flex items-center justify-between group';
                listItem.innerHTML = `
                    <span class="text-gray-800 font-semibold truncate flex-grow mr-4">${decodeURIComponent(filename)}</span>
                    <svg class="w-6 h-6 text-blue-500 group-hover:text-blue-700 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                `;
                listItem.dataset.videoUrl = videoLink; // Store the full URL
                listItem.addEventListener('click', () => playVideo(videoLink, filename));
                videoList.appendChild(listItem);
                console.log(videoLink)
            });
        }
    } catch (error) {
        console.error('Error fetching videos:', error);
        noVideosMessage.textContent = 'Failed to load videos. Please try again later.';
        noVideosMessage.classList.remove('hidden');
        showUploadMessage('Failed to load videos.', 'error');
    } finally {
        loadingSpinner.classList.add('hidden'); // Hide loading spinner
    }
}

/**
 * Initializes Plyr and plays the selected video.
 * Connects to WebSocket automatically when video is loaded.
 * @param {string} videoUrl - The URL of the video to play.
 * @param {string} videoName - The name of the video for the title.
 */
function playVideo(videoUrl, videoName) {
    // Destroy existing Plyr instance if any to avoid multiple players
    if (plyrPlayerInstance) {
        plyrPlayerInstance.destroy();
    }

    // Set the video source on the raw video element
    document.getElementById("player").src = videoUrl;

    // Initialize Plyr on the video element
    plyrPlayerInstance = new Plyr(videoPlayerElement, {
        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
        autoplay: true, // Allow Plyr to handle autoplay initially
        seekTime: 10 // Default seek time for Plyr's rewind/fast-forward buttons
    });

    currentVideoTitle.textContent = `Now Playing: ${decodeURIComponent(videoName)}`;

    uploadSection.classList.add('hidden'); // Hide upload section
    videoListSection.classList.add('hidden'); // Hide video list section
    videoPlayerSection.classList.remove('hidden'); // Show video player section

    // Set up event listeners for the new Plyr instance
    setupPlyrEventListeners();

    // Connect to WebSocket immediately when video is loaded/selected
    connectWebSocket();
}

/**
 * Sets up event listeners for the Plyr instance to synchronize with WebSocket.
 * These events are triggered by user interaction with Plyr's UI or internal player state changes.
 */
function setupPlyrEventListeners() {
   // seekFromMe = true;
    if (!plyrPlayerInstance) return; // Ensure Plyr is initialized

    // Send PLAY control when video starts playing
    plyrPlayerInstance.on('play', () => {
        if (isWebSocketConnected) {
            sendControl('PLAY', plyrPlayerInstance.currentTime);
        }
    });

    // Send PAUSE control when video pauses
    plyrPlayerInstance.on('pause', () => {
        if (isWebSocketConnected) {
            sendControl('PAUSE', plyrPlayerInstance.currentTime);
        }
    });

    // Send SEEK control when user finishes seeking via Plyr's built-in progress bar
    plyrPlayerInstance.on('seeked', () => {
        if (isWebSocketConnected) {
          //  seekFromMe = true;
            sendControl('SEEK', plyrPlayerInstance.currentTime);

        }
    });

    // Listen for Plyr's 'ready' event to confirm the player is fully initialized
    plyrPlayerInstance.on('ready', () => {
        // No console log as per request
    });

    // Listen for custom hotkeys for forward/backward
    document.addEventListener('keydown', handleGlobalHotkeys);
}

/**
 * Handles global keyboard events for media controls.
 * @param {KeyboardEvent} event
 */
function handleGlobalHotkeys(event) {
    // Only active if player is shown and WebSocket connected
    if (!plyrPlayerInstance || !isWebSocketConnected || videoPlayerSection.classList.contains('hidden')) {
        return;
    }

    // Check if the event target is within the Plyr controls to avoid conflicts
    const isInsidePlyrControls = event.target.closest('.plyr');

    // Only respond to hotkeys if not interacting with Plyr's internal elements (e.g., text inputs)
    if (isInsidePlyrControls && ['Space', 'Enter'].includes(event.code)) {
        // Let Plyr handle its own play/pause via Space/Enter if interacting with controls
        return;
    }

 //   if (!seekFromMe) {


        switch (event.key) {
            case 'ArrowRight':
                if (event.shiftKey) { // Shift + Right Arrow for fast forward (e.g., 60s)
                    sendControl('FORWARD', 60);
                } else { // Standard Right Arrow for Plyr's default seekTime (10s)
                    sendControl('FORWARD', plyrPlayerInstance.config.seekTime);
                }
                event.preventDefault(); // Prevent default browser action (e.g., scrolling)
                break;
            case 'ArrowLeft':
                if (event.shiftKey) { // Shift + Left Arrow for fast backward (e.g., 60s)
                    sendControl('BACKWARD', 60);
                } else { // Standard Left Arrow for Plyr's default seekTime (10s)
                    sendControl('BACKWARD', plyrPlayerInstance.config.seekTime);
                }
                event.preventDefault(); // Prevent default browser action
                break;
            case ' ': // Spacebar for Play/Pause
            case 'k': // YouTube-style play/pause
                if (plyrPlayerInstance.paused) {
                    sendControl('PLAY', plyrPlayerInstance.currentTime);
                } else {
                    sendControl('PAUSE', plyrPlayerInstance.currentTime);
                }
                event.preventDefault(); // Prevent default browser action (e.g., scrolling)
                break;
            case 'm': // Mute/Unmute
                if (plyrPlayerInstance.muted) {
                    plyrPlayerInstance.muted = false;
                } else {
                    plyrPlayerInstance.muted = true;
                }
                // Mute/unmute state doesn't need to be synced as it's client-side preference
                break;
            case 'Home': // Jump
                // to beginning
                sendControl('SEEK', 0);
                event.preventDefault();
                break;
            case 'End': // Jump to end
                if (!seekFromMe) {

                    sendControl('SEEK', plyrPlayerInstance.duration);
                    event.preventDefault();
                }

                break;
            // Add more hotkeys as desired, e.g., for volume:
            case 'ArrowUp':
                plyrPlayerInstance.increaseVolume(0.05); // Increase volume by 5%
                event.preventDefault();
                break;
            case 'ArrowDown':
                plyrPlayerInstance.decreaseVolume(0.05); // Decrease volume by 5%
                event.preventDefault();
                break;
        }
        seekFromMe = true;
  //  }
}

/**
 * Returns to the video list from the player, pausing video and resetting UI.
 * Disconnects WebSocket if connected.
 */
backToVideosButton.addEventListener('click', () => {
    if (plyrPlayerInstance) {
        plyrPlayerInstance.pause();
        plyrPlayerInstance.destroy(); // Clean up Plyr instance
        plyrPlayerInstance = null;
    }
    videoPlayerElement.src = ''; // Clear video source

    videoPlayerSection.classList.add('hidden'); // Hide video player section
    uploadSection.classList.remove('hidden'); // Show upload section
    videoListSection.classList.remove('hidden'); // Show video list section
    fetchVideos(); // Refresh the list
    disconnectWebSocket(); // Disconnect WebSocket when leaving the player

    // Remove global hotkey listener to prevent interference when not on player screen
    document.removeEventListener('keydown', handleGlobalHotkeys);
});

/**
 * Handles the video file upload.
 */
uploadButton.addEventListener('click', async () => {
    const file = videoFileInput.files[0];
    if (!file) {
        showUploadMessage('Please select a file to upload.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    uploadButton.disabled = true; // Disable button during upload
    uploadButton.textContent = 'Uploading...';
    uploadButton.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        const result = await response.text();

        if (response.ok && result === 'Success') {
            showUploadMessage('Video uploaded successfully!', 'success');
            videoFileInput.value = ''; // Clear the file input
            fetchVideos(); // Refresh the video list after upload
        } else {
            throw new Error(`Upload failed: ${result}`);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showUploadMessage(`Error: ${error.message}`, 'error');
    } finally {
        uploadButton.disabled = false; // Re-enable button
        uploadButton.textContent = 'Upload Video';
        uploadButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
});

// --- WebSocket Functions ---

/**
 * Connects to the WebSocket server using StompJs.Client.
 * This function is called automatically when a video is selected.
 */
function connectWebSocket() {
    if (stompClient && stompClient.connected) {
        return; // Already connected, do nothing
    }

    // Initialize StompJs.Client
    stompClient = new StompJs.Client({
        brokerURL: 'ws://localhost:8080/ws', // Your WebSocket endpoint
        webSocketFactory: () => new SockJS('/ws') // Use SockJS for compatibility
    });

    // Set up event handlers for the STOMP client
    stompClient.onConnect = (frame) => {
        isWebSocketConnected = true;

        // Subscribe to the /control topic to receive messages
        stompClient.subscribe('/control', (message) => {
            const receivedControl = JSON.parse(message.body);

            console.log( receivedControl.value)
            currentControlType = receivedControl.controls
            console.log(currentControlType);
            // Apply control to the Plyr video player if it's active and ready
            if (plyrPlayerInstance) {
                console.log("ready to match")
                // readyState >= 1 means metadata is loaded
                switch (receivedControl.controls) {
                    case 'PLAY':
                        if (typeof receivedControl.value === 'number' && !isNaN(receivedControl.value)) {
                            console.log("in the play area")
                            // Only set currentTime if it's significantly different to avoid unnecessary seeking
                            if (Math.abs(plyrPlayerInstance.currentTime - receivedControl.value) > 0.5) { // 0.5 seconds tolerance
                                plyrPlayerInstance.currentTime = receivedControl.value;
                            }
                        }
                        plyrPlayerInstance.play();
                        break;
                    case 'PAUSE':
                        console.log("in the pause area")
                        if (typeof receivedControl.value === 'number' && !isNaN(receivedControl.value)) {


                            if (Math.abs(plyrPlayerInstance.currentTime - receivedControl.value) > 0.5) { // 0.5 seconds tolerance
                                plyrPlayerInstance.currentTime = receivedControl.value;
                            }
                        }
                        plyrPlayerInstance.pause();
                        break;
                    case 'SEEK':
                        const seekValue = receivedControl.value;
                        if (typeof seekValue === 'number' && !isNaN(seekValue) ) {

                            console.log("in the seek area")
                            plyrPlayerInstance.currentTime = seekValue;

                        }
                        break;
                    case 'STOP':
                        console.log("in the stop area")
                        plyrPlayerInstance.stop(); // Plyr has a .stop() method
                        break;
                    case 'FORWARD':
                        if (typeof receivedControl.value === 'number' && !isNaN(receivedControl.value)) {
                            plyrPlayerInstance.forward(receivedControl.value); // Use Plyr's .forward() method
                        }
                        break;
                    case 'BACKWARD':
                        if (typeof receivedControl.value === 'number' && !isNaN(receivedControl.value)) {
                            plyrPlayerInstance.rewind(receivedControl.value); // Use Plyr's .rewind() method
                        }
                        break;
                    default:
                        console.warn('Unknown control type received:', receivedControl.controls);
                }
            }
        });
    };

    stompClient.onWebSocketError = (error) => {
        console.error('WebSocket connection error:', error);
        isWebSocketConnected = false;
    };

    stompClient.onStompError = (frame) => {
        console.error('STOMP error from broker: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        isWebSocketConnected = false;
    };

    stompClient.onDisconnect = () => {
        isWebSocketConnected = false;
    };

    // Activate the STOMP client to initiate connection
    stompClient.activate();
}

/**
 * Disconnects from the WebSocket server using StompJs.Client.
 */
function disconnectWebSocket() {
    if (stompClient !== null && stompClient.connected) {
        stompClient.deactivate(); // Deactivates the client and closes connection
    }
}

/**
 * Sends a control message to the backend via WebSocket.
 * This function is called internally by Plyr event listeners and custom hotkeys.
 * @param {string} controlType - The control type (e.g., "PLAY", "PAUSE", "SEEK", "STOP", "FORWARD", "BACKWARD").
 * @param {number} [value] - Optional value (e.g., current time for play/pause, seek position, forward/backward amount).
 */
function sendControl(controlType, value = 0) {
console.log(currentControlType , controlType, "comparison"+ currentControlType === "")
    if(currentControlType === controlType){
        controlType = "";

        return;
    }
    if (stompClient && stompClient.connected) {
        const controlMessage = {
            controls: controlType,
            value: value
        };
        stompClient.publish({
            destination: "/input/control", // Your MessageMapping destination in Spring Boot
            body: JSON.stringify(controlMessage)
        });
    } else {
        // WebSocket not connected, but no explicit UI warning as per design.
        // Console warning is sufficient for debugging.
        console.warn("Attempted to send control, but WebSocket is not connected.");
    }
    currentControlType = "";
}

// --- Initial Setup on Page Load ---
document.addEventListener('DOMContentLoaded', () => {
    fetchVideos(); // Load video list when the page loads
    // WebSocket connection will be initiated automatically when a video is played.
});
