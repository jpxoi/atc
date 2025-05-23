document.addEventListener('DOMContentLoaded', () => {
    // Element selectors
    const surfaceVisualizer = document.getElementById('surface-visualizer');
    const selectorSPJC = document.getElementById('SPJC-selector');
    const selectorSPRU = document.getElementById('SPRU-selector');
    const radarBox = document.getElementById('radar-box');
    const closeMiniRadarBtn = document.getElementById('close-mini-radar');
    const livestreamMetarBtn = document.getElementById('livestream-metar');
    const metarSPRU = document.getElementById('metar-SPRU');
    const metarSPJC = document.getElementById('metar-SPJC');

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

    const updateIndicator = (indicator, removeClass, addClass, text) => {
        // If user prefers dark mode, add dark: prefix to the classes
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            indicator.classList.remove('dark:bg-gray-700');

            switch (addClass) {
                case 'bg-red-500':
                    indicator.classList.add('bg-red-700');
                    break;
                case 'bg-yellow-500':
                    indicator.classList.add('bg-yellow-700');
                    break;
                case 'bg-gray-500':
                    indicator.classList.add('bg-gray-700');
                    break;
            }

            switch(removeClass) {
                case 'bg-red-500':
                    indicator.classList.remove('bg-red-700');
                    break;
                case 'bg-yellow-500':
                    indicator.classList.remove('bg-yellow-700');
                    break;
                case 'bg-gray-500':
                    indicator.classList.remove('bg-gray-700');
                    break;
            }
        }

        indicator.classList.remove(removeClass);
        indicator.classList.add(addClass);
        indicator.innerText = text;
    };

    const showErrorNotification = (message) => {
        const notification = document.createElement('div');
        notification.className = 'bg-red-500 dark:bg-red-700 text-white p-3 rounded-lg text-center fixed top-10 left-10 right-10 z-50 max-w-2xl mx-auto';
        notification.innerText = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    };

    const toggleSurface = (airport) => {
        surfaceVisualizer.innerHTML = '';
        const url = `https://www.flightaware.com/live/airport/${airport}/surface`;
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.border = '0';
        iframe.className = 'w-full rounded-lg aspect-[9/16] md:aspect-square xl:aspect-video';
        surfaceVisualizer.appendChild(iframe);
        surfaceVisualizer.style.display = 'block';

        [selectorSPJC, selectorSPRU].forEach(selector => {

            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                selector.style.backgroundColor = '#374151';
            } else {
                selector.style.backgroundColor = 'white';
            }
            selector.style.color = '#3B82F6';
        });

        const selectedSelector = document.getElementById(`${airport}-selector`);
        selectedSelector.style.backgroundColor = '#3B82F6';
        selectedSelector.style.color = 'white';

        // Show metar for the selected airport and hide the other one
        if (airport === 'SPJC') {
            metarSPJC.style.display = 'flex';
            metarSPRU.style.display = 'none';
        } else {
            metarSPRU.style.display = 'flex';
            metarSPJC.style.display = 'none';
        }
    };

    const openUrlInNewTab = (url) => {
        window.open(url, '_blank');
    };

    const showLivestreamMetar = () => {
        const airport = document.getElementById('airport').value.trim();

        if (!airport) {
            showErrorNotification('Please enter a valid ICAO airport code.');
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
    livestreamMetarBtn.addEventListener('click', showLivestreamMetar);
    closeMiniRadarBtn.addEventListener('click', hideRadarBox);
});
