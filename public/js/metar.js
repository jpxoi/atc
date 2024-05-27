const getUserTheme = () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const loadScriptsBasedOnTheme = () => {
    const theme = getUserTheme();
    const script1 = document.createElement('script');
    const script2 = document.createElement('script');

    script1.async = true;
    script1.defer = true;
    script1.crossOrigin = 'anonymous';
    script2.async = true;
    script2.defer = true;
    script2.crossOrigin = 'anonymous';

    if (theme === 'dark') {
        script1.src = 'https://metar-taf.com/embed-js/SPJC?bg_color=1f2937&layout=landscape&qnh=hPa&rh=rh&target=biLXE9nn';
        script2.src = 'https://metar-taf.com/embed-js/SPRU?bg_color=1f2937&layout=landscape&qnh=hPa&rh=rh&target=myjZ3sai';
    } else {
        script1.src = 'https://metar-taf.com/embed-js/SPJC?layout=landscape&qnh=hPa&rh=rh&target=biLXE9nn';
        script2.src = 'https://metar-taf.com/embed-js/SPRU?layout=landscape&qnh=hPa&rh=rh&target=myjZ3sai';
    }

    document.body.appendChild(script1);
    document.body.appendChild(script2);
};

document.addEventListener('DOMContentLoaded', loadScriptsBasedOnTheme);