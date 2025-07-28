class AudioPlayer {
    constructor(container) {
        this.container = container;
        this.youtubeUrl = container.dataset.youtubeUrl;
        this.customTitle = container.dataset.trackTitle;
        this.player = null;
        this.isPlaying = false;
        this.duration = 0;
        this.currentTime = 0;
        this.updateInterval = null;
        this.isMobileExpanded = false;
        
        this.initializeElements();
        this.bindEvents();
        this.setupPlayThemeButton();
    }
    
    initializeElements() {
        // Get UI elements for both mobile and desktop states
        this.playPauseBtns = this.container.querySelectorAll('.play-pause-btn');
        this.playIcons = this.container.querySelectorAll('.play-icon');
        this.pauseIcons = this.container.querySelectorAll('.pause-icon');
        this.trackTitles = this.container.querySelectorAll('.track-title');
        this.currentTimeEls = this.container.querySelectorAll('.current-time');
        this.durationEls = this.container.querySelectorAll('.duration');
        this.progressBars = this.container.querySelectorAll('.progress-bar');
        this.seekBars = this.container.querySelectorAll('.seek-bar');
        this.volumeControls = this.container.querySelectorAll('.volume-control');
        this.bufferFills = this.container.querySelectorAll('.buffer-fill');
        this.youtubeLinkBtns = this.container.querySelectorAll('.youtube-link-btn');
        this.mobileExpandBtn = this.container.querySelector('.mobile-expand-btn');
        this.expandIcon = this.container.querySelector('.expand-icon');
        this.collapseIcon = this.container.querySelector('.collapse-icon');
        this.loadingState = this.container.querySelector('.loading-state');
        this.errorState = this.container.querySelector('.error-state');
        
        // Initially hide the player
        this.hidePlayer();
    }
    
    bindEvents() {
        // Bind events to all play/pause buttons (mobile and desktop)
        this.playPauseBtns.forEach(btn => {
            btn.addEventListener('click', () => this.togglePlayPause());
        });
        
        // Bind events to all seek bars
        this.seekBars.forEach(bar => {
            bar.addEventListener('input', (e) => this.seek(e.target.value));
        });
        
        // Bind events to all volume controls
        this.volumeControls.forEach(control => {
            control.addEventListener('input', (e) => this.setVolume(e.target.value));
        });
        
        // Bind YouTube link buttons
        this.youtubeLinkBtns.forEach(btn => {
            btn.addEventListener('click', () => this.openInYouTube());
        });
        
        // Bind mobile expand/collapse button
        if (this.mobileExpandBtn) {
            this.mobileExpandBtn.addEventListener('click', () => this.toggleMobileExpand());
        }
    }
    
    setupPlayThemeButton() {
        // Find and bind the "Play Theme" button
        this.playThemeBtn = document.getElementById('play-theme-btn');
        if (this.playThemeBtn) {
            this.playThemeBtn.addEventListener('click', () => this.onPlayThemeClick());
        }
    }
    
    onPlayThemeClick() {
        // Add loading state to button
        this.playThemeBtn.classList.add('loading');
        this.playThemeBtn.querySelector('.play-theme-text').textContent = 'Loading';
        
        // Show the player with animation
        this.showPlayer();
        
        // Initialize the YouTube player
        this.loadYouTubeAPI();
    }
    
    showPlayer() {
        this.container.classList.remove('hidden');
        // Use setTimeout to ensure the element is rendered before adding the show class
        setTimeout(() => {
            this.container.classList.add('show');
        }, 10);
    }
    
    hidePlayer() {
        this.container.classList.remove('show');
        setTimeout(() => {
            this.container.classList.add('hidden');
        }, 300); // Match the transition duration
    }
    
    toggleMobileExpand() {
        this.isMobileExpanded = !this.isMobileExpanded;
        
        if (this.isMobileExpanded) {
            this.container.classList.add('mobile-expanded');
        } else {
            this.container.classList.remove('mobile-expanded');
        }
    }
    
    openInYouTube() {
        if (this.youtubeUrl) {
            window.open(this.youtubeUrl, '_blank', 'noopener,noreferrer');
        }
    }
    
    loadYouTubeAPI() {
        // Check if YouTube API is already loaded
        if (window.YT && window.YT.Player) {
            this.initializePlayer();
            return;
        }
        
        // Add this instance to the queue for when API is ready
        if (!window.audioPlayerQueue) {
            window.audioPlayerQueue = [];
        }
        window.audioPlayerQueue.push(this);
        
        // Load YouTube IFrame API only once
        if (!window.youTubeAPILoading) {
            window.youTubeAPILoading = true;
            
            // Set up the global callback
            window.onYouTubeIframeAPIReady = () => {
                console.log('YouTube API Ready, initializing players:', window.audioPlayerQueue.length);
                // Initialize all queued players
                if (window.audioPlayerQueue) {
                    window.audioPlayerQueue.forEach(player => {
                        player.initializePlayer();
                    });
                    window.audioPlayerQueue = [];
                }
            };
            
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
        }
    }
    
    initializePlayer() {
        console.log('Initializing player for URL:', this.youtubeUrl);
        
        const videoId = this.extractVideoId(this.youtubeUrl);
        if (!videoId) {
            console.error('Failed to extract video ID');
            this.showError();
            return;
        }
        
        // Get the YouTube player container for this instance
        const playerContainer = this.container.querySelector('.youtube-player');
        if (!playerContainer) {
            console.error('YouTube player container not found');
            this.showError();
            return;
        }
        
        try {
            this.player = new YT.Player(playerContainer, {
                height: '1',
                width: '1',
                videoId: videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    enablejsapi: 1
                },
                events: {
                    onReady: (event) => this.onPlayerReady(event),
                    onStateChange: (event) => this.onPlayerStateChange(event),
                    onError: (event) => this.onPlayerError(event)
                }
            });
            console.log('YouTube Player created successfully');
        } catch (error) {
            console.error('Error creating YouTube Player:', error);
            this.showError();
        }
    }
    
    extractVideoId(url) {
        if (!url) return null;
        
        // Handle various YouTube URL formats
        const patterns = [
            /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
            /(?:youtu\.be\/)([^&\n?#]+)/,
            /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
            /(?:youtube\.com\/v\/)([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                console.log('Extracted video ID:', match[1], 'from URL:', url);
                return match[1];
            }
        }
        
        console.error('Could not extract video ID from URL:', url);
        return null;
    }
    
    onPlayerReady(event) {
        console.log('Player ready event fired');
        
        try {
            this.duration = this.player.getDuration();
            this.updateDurationDisplay();
            
            // Set custom title or get from YouTube
            const title = this.customTitle || this.player.getVideoData()?.title || 'YouTube Audio';
            this.updateTrackTitle(title);
            
            // Set initial volume
            this.player.setVolume(70);
            
            this.showControls();
            this.startProgressUpdate();
            this.hidePlayThemeButton();
            
            console.log('Player initialization completed');
        } catch (error) {
            console.error('Error in onPlayerReady:', error);
            this.showError();
        }
    }
    
    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.updatePlayPauseButtons();
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            this.isPlaying = false;
            this.updatePlayPauseButtons();
        }
    }
    
    onPlayerError(event) {
        console.error('YouTube Player Error:', event.data);
        this.showError();
    }
    
    togglePlayPause() {
        if (!this.player) return;
        
        if (this.isPlaying) {
            this.player.pauseVideo();
        } else {
            this.player.playVideo();
        }
    }
    
    seek(percentage) {
        if (!this.player || !this.duration) return;
        
        const seekTime = (percentage / 100) * this.duration;
        this.player.seekTo(seekTime, true);
    }
    
    setVolume(volume) {
        if (!this.player) return;
        this.player.setVolume(volume);
    }
    
    updatePlayPauseButtons() {
        if (this.isPlaying) {
            this.playIcons.forEach(icon => icon.classList.add('hidden'));
            this.pauseIcons.forEach(icon => icon.classList.remove('hidden'));
        } else {
            this.playIcons.forEach(icon => icon.classList.remove('hidden'));
            this.pauseIcons.forEach(icon => icon.classList.add('hidden'));
        }
    }
    
    updateTrackTitle(title) {
        this.trackTitles.forEach(el => {
            el.textContent = title;
        });
    }
    
    updateDurationDisplay() {
        const formattedDuration = this.formatTime(this.duration);
        this.durationEls.forEach(el => {
            el.textContent = formattedDuration;
        });
    }
    
    startProgressUpdate() {
        this.updateInterval = setInterval(() => {
            if (this.player && this.duration > 0) {
                this.currentTime = this.player.getCurrentTime();
                const percentage = (this.currentTime / this.duration) * 100;
                
                // Update progress bars and seek bars
                this.progressBars.forEach(bar => {
                    bar.value = percentage;
                });
                this.seekBars.forEach(bar => {
                    bar.value = percentage;
                });
                
                // Update current time display
                const formattedTime = this.formatTime(this.currentTime);
                this.currentTimeEls.forEach(el => {
                    el.textContent = formattedTime;
                });
                
                // Update buffer progress
                this.updateBufferProgress();
            }
        }, 1000);
    }
    
    updateBufferProgress() {
        if (!this.player || !this.duration) return;
        
        try {
            // Get the buffered percentage from YouTube player
            const bufferedPercentage = this.player.getVideoLoadedFraction() * 100;
            
            // Update all buffer fill elements
            this.bufferFills.forEach(fill => {
                fill.style.width = `${bufferedPercentage}%`;
            });
        } catch (error) {
            // Silently handle buffer progress errors
            console.debug('Buffer progress update error:', error);
        }
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    showControls() {
        this.loadingState.classList.add('hidden');
        this.errorState.classList.add('hidden');
    }
    
    hidePlayThemeButton() {
        if (this.playThemeBtn) {
            this.playThemeBtn.style.display = 'none';
        }
    }
    
    showError() {
        this.loadingState.classList.add('hidden');
        this.errorState.classList.remove('hidden');
        this.errorState.classList.add('flex');
        
        // Reset Play Theme button if error occurs
        if (this.playThemeBtn) {
            this.playThemeBtn.classList.remove('loading');
            this.playThemeBtn.querySelector('.play-theme-text').textContent = 'Play Theme';
        }
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.player) {
            this.player.destroy();
        }
        
        // Clean up Play Theme button event listener
        if (this.playThemeBtn) {
            this.playThemeBtn.removeEventListener('click', this.onPlayThemeClick);
        }
    }
}

// Initialize audio players when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing audio players');
    document.querySelectorAll('.audio-player-container').forEach(container => {
        if (!container.audioPlayerInstance) {
            console.log('Creating new AudioPlayer instance');
            container.audioPlayerInstance = new AudioPlayer(container);
        }
    });
});

// Export for potential external use
window.AudioPlayer = AudioPlayer;
