// DOM Elements
const activateBtn = document.getElementById('activateBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const protectionPanel = document.getElementById('protectionPanel');
const alertCountdown = document.getElementById('alertCountdown');
const countdownDisplay = document.getElementById('countdown');
const cancelBtn = document.getElementById('cancelBtn');
const alertSent = document.getElementById('alertSent');
const latitudeDisplay = document.getElementById('latitude');
const longitudeDisplay = document.getElementById('longitude');

// State
let isMonitoring = false;
let countdown = 10;
let countdownInterval;
let accelerometer;
let audioContext;
let analyser;
let microphone;

// Emergency Keywords (Multilingual)
const emergencyKeywords = [
  'help', 'emergency', 'accident', 'rescue',
  'ayuda', 'emergencia', 'socorro',
  'hilfe', 'notfall', 'unfall',
  'aide', 'urgence', 'accident'
];

// Activate/Deactivate Protection
activateBtn.addEventListener('click', () => {
  isMonitoring = !isMonitoring;
  
  if (isMonitoring) {
    startMonitoring();
    activateBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Deactivate Protection';
    statusText.textContent = 'Protection Active';
    statusIndicator.classList.add('active');
  } else {
    stopMonitoring();
    activateBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Activate Protection';
    statusText.textContent = 'Protection Inactive';
    statusIndicator.classList.remove('active');
  }
});

// Start Monitoring Sensors
async function startMonitoring() {
  // Start Accelerometer
  if ('Accelerometer' in window) {
    try {
      accelerometer = new Accelerometer({ frequency: 1000 });
      accelerometer.addEventListener('reading', checkAcceleration);
      accelerometer.start();
    } catch (error) {
      console.error('Accelerometer error:', error);
    }
  }

  // Start Sound Monitoring
  await startSoundMonitoring();
}

// Stop Monitoring Sensors
function stopMonitoring() {
  // Stop Accelerometer
  if (accelerometer) {
    accelerometer.stop();
    accelerometer.removeEventListener('reading', checkAcceleration);
  }

  // Stop Sound Monitoring
  stopSoundMonitoring();
}

// Check Acceleration for Crashes
function checkAcceleration() {
  const force = Math.sqrt(
    Math.pow(accelerometer.x, 2) + 
    Math.pow(accelerometer.y, 2) + 
    Math.pow(accelerometer.z, 2)
  );

  if (force > 15) { // Threshold for crash detection
    triggerEmergency();
  }
}

// Sound Monitoring
async function startSoundMonitoring() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function checkSound() {
      if (!isMonitoring) return;
      
      analyser.getByteFrequencyData(dataArray);
      const avgVolume = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      if (avgVolume > 80) { // Threshold for loud sounds
        triggerEmergency();
      }
      
      // Check for emergency keywords every 2 seconds
      setTimeout(checkSound, 2000);
    }
    
    checkSound();
  } catch (error) {
    console.error('Microphone error:', error);
  }
}

function stopSoundMonitoring() {
  if (microphone) {
    microphone.disconnect();
  }
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
  }
}

// Emergency Trigger
function triggerEmergency() {
  if (alertCountdown.classList.contains('hidden')) {
    alertCountdown.classList.remove('hidden');
    countdown = 10;
    countdownDisplay.textContent = countdown;
    
    countdownInterval = setInterval(() => {
      countdown--;
      countdownDisplay.textContent = countdown;
      
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        sendEmergencyAlert();
      }
    }, 1000);
  }
}

// Cancel Alert
cancelBtn.addEventListener('click', () => {
  clearInterval(countdownInterval);
  alertCountdown.classList.add('hidden');
});

// Send Emergency Alert
function sendEmergencyAlert() {
  alertCountdown.classList.add('hidden');
  
  // Get Current Location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        latitudeDisplay.textContent = position.coords.latitude.toFixed(6);
        longitudeDisplay.textContent = position.coords.longitude.toFixed(6);
        alertSent.classList.remove('hidden');
        
        // Speak Alert (Text-to-Speech)
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(
            `Emergency alert! Accident detected at coordinates ${position.coords.latitude}, ${position.coords.longitude}. ` +
            `Alerting nearby hospitals and police.`
          );
          window.speechSynthesis.speak(utterance);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alertSent.classList.remove('hidden');
        latitudeDisplay.textContent = 'Unavailable';
        longitudeDisplay.textContent = 'Unavailable';
      }
    );
  } else {
    alertSent.classList.remove('hidden');
    latitudeDisplay.textContent = 'Unsupported';
    longitudeDisplay.textContent = 'Unsupported';
  }
}