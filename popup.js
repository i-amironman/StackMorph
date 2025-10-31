document.addEventListener('DOMContentLoaded', () => {
    // Views
    const idleView = document.getElementById('idle-view');
    const loadingView = document.getElementById('loading-view');
    const successView = document.getElementById('success-view');
    const API_URL = "http://localhost:8080";

    // Idle View Elements
    const uploadForm = document.getElementById('upload-form');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name');
    const techStackSelect = document.getElementById('tech-stack');
    const convertBtn = document.getElementById('convert-btn');
    const errorMessage = document.getElementById('error-message');

    // Loading View Elements
    const loadingTitle = document.getElementById('loading-title');
    const loadingText = document.getElementById('loading-text');
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.getElementById('progress-bar');

    // Success View Elements
    const downloadLink = document.getElementById('download-link');
    const resetBtn = document.getElementById('reset-btn');

    let currentFile = null;
    let countdownInterval = null; // --- MODIFICATION: Added timer variable ---

    // --- Utility Functions ---

    function showView(view) {
        [idleView, loadingView, successView].forEach(v => v.classList.remove('active'));
        view.classList.add('active');
    }

    function displayError(message) {
        errorMessage.textContent = message;
    }

    function updateConvertButtonState() {
        convertBtn.disabled = !(currentFile && techStackSelect.value);
    }

    // --- MODIFICATION: Clear timer on reset ---
    function resetToIdle() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        currentFile = null;
        fileInput.value = '';
        techStackSelect.value = '';
        fileNameDisplay.textContent = '';
        dropZone.classList.remove('has-file');
        displayError('');
        updateConvertButtonState();

        // Reset loading view elements for next time
        progressBar.style.width = '0%';
        progressContainer.style.display = 'none';
        loadingTitle.textContent = 'Morphing your stack...';
        loadingText.textContent = 'This may take a few moments.';
        
        showView(idleView);
    }

    // --- Event Handlers ---

    function handleFileSelect(file) {
        if (!file) return;

        if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
            displayError('Invalid file type. Please upload a .zip file.');
            currentFile = null;
            fileNameDisplay.textContent = '';
            dropZone.classList.remove('has-file');
        } else {
            currentFile = file;
            fileNameDisplay.textContent = file.name;
            dropZone.classList.add('has-file');
            displayError('');
        }
        updateConvertButtonState();
    }

    fileInput.addEventListener('change', () => {
        handleFileSelect(fileInput.files[0]);
    });

    techStackSelect.addEventListener('change', updateConvertButtonState);

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    });

    // Form Submission
    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (convertBtn.disabled) return;
        
        showView(loadingView);
        progressContainer.style.display = 'block'; // Show progress bar for upload
        loadingTitle.textContent = 'Uploading...'; // Set text to Uploading
        loadingText.textContent = currentFile.name;

        const formData = new FormData();
        formData.append('sourceCode', currentFile);
        formData.append('targetStack', techStackSelect.value);
        
        const xhr = new XMLHttpRequest();

        // This event handles upload progress
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.style.width = percentComplete + '%';
                loadingText.textContent = `${currentFile.name} (${percentComplete}%)`;
            }
        });

        // ---
        // MODIFICATION: This event now starts the 60s countdown
        // ---
        xhr.upload.addEventListener('load', () => {
            progressContainer.style.display = 'none';
            loadingText.textContent = 'This may take a few moments.';

            let seconds = 60;
            loadingTitle.textContent = `Converting... ${seconds}s`;

            // Clear any old interval
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
            
            countdownInterval = setInterval(() => {
                seconds--;
                if (seconds > 0) {
                    loadingTitle.textContent = `Converting... ${seconds}s`;
                } else {
                    // When timer hits 0, stop the interval and show the generic message
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    loadingTitle.textContent = 'Converting...';
                    loadingText.textContent = 'Finalizing conversion...';
                }
            }, 1000);
        });

        // This event fires when the server *responds*
        xhr.addEventListener('load', () => {
            // --- MODIFICATION: Stop the timer as soon as we get a response ---
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }

            if (xhr.status === 200) {
                const blob = xhr.response;
                const downloadUrl = URL.createObjectURL(blob);

                downloadLink.href = downloadUrl;
                downloadLink.download = `${techStackSelect.value}-${currentFile.name}`;
                showView(successView);
            } else {
                let errorMsg = `Conversion failed (status: ${xhr.status}). Please try again.`;
                 try {
                    const errorJson = JSON.parse(xhr.responseText);
                    errorMsg = errorJson.error || errorMsg;
                } catch (e) {
                    // Ignore parsing error, use default message
                }
                displayError(errorMsg);
                showView(idleView);
            }
        });
        
        xhr.addEventListener('error', () => {
            // --- MODIFICATION: Stop the timer on error ---
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            showView(idleView);
            displayError('Upload failed. Check your network connection.');
        });
        
        xhr.open('POST', `${API_URL}/convert`);
        xhr.responseType = 'blob';
        xhr.send(formData);
    });
    
    // Reset button
    resetBtn.addEventListener('click', resetToIdle);
    
    // Initial State
    resetToIdle();
});