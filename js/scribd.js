$(document).ready(function () {
    // ==========================================
    // Constants and Global Variables
    // ==========================================
    const validDomains = {
        scribd: /^https:\/\/(?:[a-z]{2,3}\.)?scribd\.com\/(?:document|doc)\/(\d+)\/([^\/]+)$/,
        slideshare: /^(?:https?:\/\/)?(?:www\.)?slideshare\.net\/([^\/]+)\/([^\/]+)/
    };

    let state = {
        downloadUrl: '',
        currentService: '',
        slideshareDocInfo: null
    };

    // ==========================================
    // UI Elements
    // ==========================================
    const elements = {
        errorMessage: $('.error-message'),
        downloadBtn: $('#downloadBtn'),
        switchContainer: $('.switch-container'),
        switchContainer2: $('.switch-container-2'),
        scribdLink: $('#scribdLink'),
        finalDownloadBtn: $('#finalDownloadBtn'),
        sliderToggle: $('#sliderToggle'),
        sliderToggleFormat: $('#sliderToggleFormat')
    };

    // Initialize UI
    elements.switchContainer.hide();
    elements.switchContainer2.hide();

    // ==========================================
    // Utility Functions
    // ==========================================
    function sanitizeFileName(fileName) {
        try {
            // First properly decode the URI component to handle UTF-8 characters
            const decodedName = decodeURIComponent(fileName);
            return decodedName
                .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid filename chars
                .replace(/\s+/g, '_')           // Replace spaces with underscores
                .replace(/_{2,}/g, '_')         // Remove multiple consecutive underscores
                .replace(/^_+|_+$/g, '')        // Trim leading/trailing underscores
                .trim();
        } catch (e) {
            // If decoding fails, try a different approach for non-Latin characters
            return fileName
                .replace(/[<>:"/\\|?*]/g, '_')
                .replace(/\s+/g, '_')
                .replace(/_{2,}/g, '_')
                .replace(/^_+|_+$/g, '')
                .trim();
        }
    }

    function parseSlideShareUrl(url) {
        const match = url.match(validDomains.slideshare);
        if (!match) return null;

        const [, username, docName] = match;
        const cleanDocName = docName.split('/')[0];

        return {
            username,
            documentName: cleanDocName,
            cleanName: cleanDocName
                .replace(/-/g, ' ')
                .replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '') // Allow Cyrillic chars range
                .trim()
        };
    }

    // ==========================================
    // UI State Management
    // ==========================================
    function setLoadingState() {
        elements.downloadBtn
            .addClass('loading-state')
            .html('<i class="bi bi-arrow-repeat rotating-icon me-2"></i>Processing...');
    }

    function resetLoadingState() {
        elements.downloadBtn
            .removeClass('loading-state')
            .html('<i class="bi bi-download me-2"></i>Download');
    }

    function setFinalDownloadLoadingState(button) {
        button
            .prop('disabled', true)
            .html('<i class="bi bi-arrow-repeat rotating-icon me-2"></i>Downloading...');
    }

    function resetFinalDownloadLoadingState(button) {
        button
            .prop('disabled', false)
            .html('<i class="bi bi-download me-2"></i>Download');
    }

    function showError(message) {
        elements.errorMessage.show().html(`<i class="bi bi-exclamation-octagon me-2"></i>${message}`);
    }

    function hideError() {
        elements.errorMessage.hide();
    }

    function showConfirmationModal(fileName, fileType) {
        $('#fileName').text(fileName);
        $('#fileType').text(fileType);
        $('#downloadButtonText').text(`Download as ${fileType}`);
        $('#confirmationModal').modal('show');
    }

    // ==========================================
    // Core Download Logic
    // ==========================================
    async function downloadFile(url, fileName) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to download file');
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    }

    async function processSlideShare(url) {
        const hdEnabled = elements.sliderToggle.prop('checked');
        const encodedUrl = encodeURIComponent(url);
        const getUrl = `${URLS.slideshareApi.getImages}?url=${encodedUrl}&hd=${hdEnabled}`;
        
        const getResponse = await $.get(getUrl);
        if (!getResponse?.images?.length) {
            throw new Error('No images found');
        }

        const postPayload = {
            hd: hdEnabled,
            images: getResponse.images,
            type: elements.sliderToggleFormat.prop('checked') ? "pptx" : "pdf"
        };

        const postResponse = await $.ajax({
            url: URLS.slideshareApi.getSlide,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(postPayload)
        });

        if (!postResponse?.url) {
            throw new Error('Invalid server response');
        }

        return `${URLS.slideshareApi.download}?${new URLSearchParams(postResponse).toString()}`;
    }

    async function handleScribdDownload() {
        try {
            const response = await fetch(state.downloadUrl);
            if (!response.ok) throw new Error(`Failed to fetch document: ${response.status}`);
            
            // Get response as text since it's HTML, not JSON
            const htmlText = await response.text();
            
            // Extract the iframe src attribute with a specific pattern matching this site's format
            const iframeMatch = htmlText.match(/<iframe src="([^"]+)"/i);
            
            if (!iframeMatch) {
                throw new Error('Document iframe not found in HTML response');
            }
            
            // Extract the file URL from the iframe src
            const iframeSrc = iframeMatch[1];
            const fileUrlParam = iframeSrc.split('?file=')[1];
            
            if (!fileUrlParam) {
                throw new Error('File URL parameter not found in iframe src');
            }
            
            // Get the actual file URL (remove zoom and handle URL encoding)
            const fileUrl = decodeURIComponent(fileUrlParam.split('#')[0]);
            
            const scribdUrl = elements.scribdLink.val().trim();
            const match = scribdUrl.match(validDomains.scribd);
            
            if (!match || match.length < 3) {
                throw new Error('Invalid Scribd URL format');
            }
            
            const [, docId, docName] = match;
            
            // Properly handle the docName for international characters
            try {
                const decodedDocName = decodeURIComponent(docName);
                const fileName = `${sanitizeFileName(decodedDocName)}.pdf`;
                await downloadFile(`${URLS.proxyEndpoint}${fileUrl}`, fileName);
            } catch (e) {
                // Fallback if decoding fails
                const fileName = `${sanitizeFileName(docName)}.pdf`;
                await downloadFile(`${URLS.proxyEndpoint}${fileUrl}`, fileName);
            }
            
        } catch (error) {
            console.error('Detailed error:', error);
            throw error;
        }
    }

    async function handleSlideShareDownload() {
        if (!state.slideshareDocInfo) throw new Error('No SlideShare document info');
        
        const fileExt = elements.sliderToggleFormat.prop('checked') ? 'pptx' : 'pdf';
        const fileName = `${sanitizeFileName(state.slideshareDocInfo.documentName)}.${fileExt}`;
        await downloadFile(state.downloadUrl, fileName);
    }

    // ==========================================
    // Event Handlers
    // ==========================================
    elements.scribdLink.on('input', function () {
        const val = $(this).val().trim();
        hideError();
        const isSlideShare = parseSlideShareUrl(val) !== null;
        elements.switchContainer.toggle(isSlideShare);
        elements.switchContainer2.toggle(isSlideShare);
    });

    $('#downloadForm').on('submit', async function (e) {
        e.preventDefault();
        const input = elements.scribdLink.val().trim();

        if (!input) {
            this.reportValidity();
            hideError();
            return;
        }

        const isScribd = validDomains.scribd.test(input);
        state.slideshareDocInfo = parseSlideShareUrl(input);
        const isSlideshare = state.slideshareDocInfo !== null;

        if (!isScribd && !isSlideshare) {
            showError('Please insert a valid Scribd or SlideShare link!');
            return;
        }

        setLoadingState();
        hideError();
        state.currentService = isScribd ? 'scribd' : 'slideshare';

        try {
            if (isScribd) {
                const match = input.match(validDomains.scribd);
                if (!match || match.length < 3) {
                    throw new Error('Invalid Scribd URL format');
                }
                
                const [, docId, docName] = match;
                
                // Use a more flexible approach for encoding the URL
                let safeName;
                try {
                    // Try to decode first in case it's already URL-encoded
                    const decodedName = decodeURIComponent(docName);
                    // Then re-encode properly
                    safeName = encodeURIComponent(decodedName);
                } catch (e) {
                    // If decoding fails, use as is but ensure it's encoded
                    safeName = encodeURIComponent(docName);
                }
                
                state.downloadUrl = `${URLS.corsProxy}${encodeURIComponent(`${URLS.scribdDownload}${docId}/${safeName}`)}`;
                
                // Show a properly decoded name in the confirmation modal
                let displayName;
                try {
                    displayName = decodeURIComponent(docName).replace(/-/g, ' ');
                } catch (e) {
                    displayName = docName.replace(/-/g, ' ');
                }
                
                showConfirmationModal(displayName, 'PDF');
            } else {
                state.downloadUrl = await processSlideShare(input);
                showConfirmationModal(
                    state.slideshareDocInfo.documentName.replace(/-/g, ' '),
                    elements.sliderToggleFormat.prop('checked') ? 'PPTX' : 'PDF'
                );
            }
        } catch (error) {
            console.error('Processing error:', error);
            showError('Processing failed. Please try again!');
        } finally {
            resetLoadingState();
        }
    });

    elements.finalDownloadBtn.on('click', async function (e) {
        e.preventDefault();
        if (!state.downloadUrl) {
            $('#confirmationModal').modal('hide');
            return;
        }

        const button = $(this);
        setFinalDownloadLoadingState(button);

        try {
            if (state.currentService === 'scribd') {
                await handleScribdDownload();
            } else {
                await handleSlideShareDownload();
            }
        } catch (error) {
            console.error('Download error:', error);
            showError(error.message.includes('Failed to') ? error.message : 'Download failed. Please try again.');
        } finally {
            resetFinalDownloadLoadingState(button);
            $('#confirmationModal').modal('hide');
        }
    });
});
