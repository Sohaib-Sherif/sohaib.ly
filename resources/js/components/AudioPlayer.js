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
        
        this.initializeElements();
        this.bindEvents();
        this.loadYouTubeAPI();
    }
    
    initializeElements() {
        // Get UI elements
        this.playPauseBtn = this.container.querySelector('.play-pause-btn');
        this.playIcon = this.container.querySelector('.play-icon');
        this.pauseIcon = this.container.querySelector('.pause-icon');
        this.trackTitle = this.container.querySelector('.track-title');
        this.currentTimeEl = this.container.querySelector('.current-time');
        this.durationEl = this.container.querySelector('.duration');
        this.progressBar = this.container.querySelector('.progress-bar');
        this.seekBar = this.container.querySelector('.seek-bar');
        this.volumeControl = this.container.querySelector('.volume-control');
        this.loadingState = this.container.querySelector('.loading-state');
        this.errorState = this.container.querySelector('.error-state');
        
        // Initially hide the player controls
        this.hideControls();
    }
    
    bindEvents() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.seekBar.addEventListener('input', (e) => this.seek(e.target.value));
        this.volumeControl.addEventListener('input', (e) => this.setVolume(e.target.value));
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
            this.durationEl.textContent = this.formatTime(this.duration);
            
            // Set custom title or get from YouTube
            if (this.customTitle) {
                this.trackTitle.textContent = this.customTitle;
            } else {
                // Try to get title from YouTube (this might not always work due to API limitations)
                const videoData = this.player.getVideoData();
                if (videoData && videoData.title) {
                    this.trackTitle.textContent = videoData.title;
                } else {
                    this.trackTitle.textContent = 'YouTube Audio';
                }
            }
            
            // Set initial volume
            this.player.setVolume(70);
            
            this.showControls();
            this.startProgressUpdate();
            
            console.log('Player initialization completed');
        } catch (error) {
            console.error('Error in onPlayerReady:', error);
            this.showError();
        }
    }
    
    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.updatePlayPauseButton();
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            this.isPlaying = false;
            this.updatePlayPauseButton();
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
    
    updatePlayPauseButton() {
        if (this.isPlaying) {
            this.playIcon.classList.add('hidden');
            this.pauseIcon.classList.remove('hidden');
        } else {
            this.playIcon.classList.remove('hidden');
            this.pauseIcon.classList.add('hidden');
        }
    }
    
    startProgressUpdate() {
        this.updateInterval = setInterval(() => {
            if (this.player && this.duration > 0) {
                this.currentTime = this.player.getCurrentTime();
                const percentage = (this.currentTime / this.duration) * 100;
                
                this.progressBar.value = percentage;
                this.seekBar.value = percentage;
                this.currentTimeEl.textContent = this.formatTime(this.currentTime);
            }
        }, 1000);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    showControls() {
        this.loadingState.classList.add('hidden');
        this.errorState.classList.add('hidden');
        this.container.querySelector('.flex').classList.remove('hidden');
    }
    
    hideControls() {
        this.container.querySelector('.flex').classList.add('hidden');
    }
    
    showError() {
        this.loadingState.classList.add('hidden');
        this.errorState.classList.remove('hidden');
        this.hideControls();
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.player) {
            this.player.destroy();
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
