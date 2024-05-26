document.addEventListener('DOMContentLoaded', () => {
    // Element selectors
    const getMetarBtn = document.getElementById('get-metar');
    const getFlightBtn = document.getElementById('get-flight');
    const closeBtn = document.getElementById('close');
    const surfaceSPJC = document.getElementById('SPJC-surface');
    const surfaceSPRU = document.getElementById('SPRU-surface');
    const selectorSPJC = document.getElementById('SPJC-selector');
    const selectorSPRU = document.getElementById('SPRU-selector');
    const surfaceView = document.getElementById('surface-viewer');
    const radarBox = document.getElementById('radar-box');
    const closeMiniRadarBtn = document.getElementById('close-mini-radar');
    const openRadarBtn = document.getElementById('open-radar');
    const livestreamMetarBtn = document.getElementById('livestream-metar');

    const audioElements = [
        {
            audio: document.getElementById('spjc_app_audio'),
            indicator: document.getElementById('spjc_app_live_indicator')
        },
        {
            audio: document.getElementById('spjc_twr_audio'),
            indicator: document.getElementById('spjc_twr_live_indicator')
        },
        {
            audio: document.getElementById('spjc_gnd_audio'),
            indicator: document.getElementById('spjc_gnd_live_indicator')
        }
    ];

    // Helper functions
    const updateIndicator = (indicator, removeClass, addClass, text) => {
        indicator.classList.remove(removeClass);
        indicator.classList.add(addClass);
        indicator.innerText = text;
    };

    const toggleSurface = (airport) => {
        surfaceSPJC.style.display = 'none';
        surfaceSPRU.style.display = 'none';
        surfaceView.style.display = 'none';

        [selectorSPJC, selectorSPRU].forEach(selector => {
            selector.style.backgroundColor = 'white';
            selector.style.color = '#3B82F6';
        });

        const selectedSelector = document.getElementById(`${airport}-selector`);
        const selectedSurface = document.getElementById(`${airport}-surface`);

        selectedSelector.style.backgroundColor = '#3B82F6';
        selectedSelector.style.color = 'white';
        selectedSurface.style.display = 'block';
    };

    const openUrlInNewTab = (url) => {
        window.open(url, '_blank');
    };

    const getMetar = () => {
        const airport = document.getElementById('airport').value.trim();

        if (!airport) {
            alert('Please enter an airport code.');
            return;
        }

        openUrlInNewTab(`https://metar-taf.com/${airport}`);
        document.getElementById('airport').value = '';
    };

    const showAircraftPosition = () => {
        const registration = document.getElementById('flight').value.trim();

        if (!registration) {
            alert('Please enter a valid registration number.');
            return;
        }

        radarBox.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.flightradar24.com/simple?reg=${registration}`;
        iframe.style.border = '0';
        iframe.className = 'w-full rounded-lg aspect-video';
        radarBox.appendChild(iframe);
        radarBox.style.display = 'block';
        closeMiniRadarBtn.style.display = 'block';
    };

    const openRadar = () => {
        const registration = document.getElementById('flight').value.trim();

        if (!registration) {
            alert('Please enter a valid registration number.');
            return;
        }

        openUrlInNewTab(`https://www.flightradar24.com/${registration}`);
        document.getElementById('flight').value = '';
    };

    const showLivestreamMetar = () => {
        const airport = document.getElementById('airport').value.trim();

        if (!airport) {
            alert('Please enter an airport code.');
            return;
        }

        openUrlInNewTab(`https://metar-taf.com/livestream/${airport}?zoom=85`);
        document.getElementById('airport').value = '';
    };

    const hideRadarBox = () => {
        radarBox.style.display = 'none';
        radarBox.innerHTML = '';
        closeMiniRadarBtn.style.display = 'none';
    };

    // Event listeners for audio elements
    audioElements.forEach(({audio, indicator}) => {
        audio.addEventListener('play', () => updateIndicator(indicator, 'bg-gray-500', 'bg-yellow-500', 'Buffering'));
        audio.addEventListener('error', () => updateIndicator(indicator, 'bg-yellow-500', 'bg-gray-500', 'Offline'));
        audio.addEventListener('playing', () => updateIndicator(indicator, 'bg-yellow-500', 'bg-red-500', 'Live'));
        audio.addEventListener('pause', () => updateIndicator(indicator, 'bg-red-500', 'bg-gray-500', 'Paused'));
    });

    // General event listeners
    selectorSPJC.addEventListener('click', () => toggleSurface('SPJC'));
    selectorSPRU.addEventListener('click', () => toggleSurface('SPRU'));
    getMetarBtn.addEventListener('click', getMetar);
    getFlightBtn.addEventListener('click', showAircraftPosition);
    closeBtn.addEventListener('click', () => {
        document.querySelector('.bg-blue-200').style.display = 'none';
    });
    openRadarBtn.addEventListener('click', openRadar);
    livestreamMetarBtn.addEventListener('click', showLivestreamMetar);
    closeMiniRadarBtn.addEventListener('click', hideRadarBox);
});
