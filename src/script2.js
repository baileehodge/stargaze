async function main() {
    const coordinatesInput = document.getElementById('coordinates').value;
    const coordinates = parseCoordinates(coordinatesInput);

    if (!coordinates) return;

    const [latitude, longitude] = coordinates;
    const apiUrl = `https://api.weather.gov/points/${latitude},${longitude}`;

    try {
        const data = await fetchData(apiUrl);
        const forecastData = await fetchData(data.properties.forecastHourly);
        const dailyForecastData = await fetchData(data.properties.forecast);
        const celestialData = await getCelestialData(latitude, longitude);

        displayForecast(forecastData, dailyForecastData, celestialData);
    } catch (error) {
        alert('Error fetching data: ' + error.message);
    }
}

function parseCoordinates(input) {
    if (!input) {
        alert('Please enter coordinates in the format <latitude, longitude>!');
        return null;
    }
    const coordinates = input.split(',').map(coord => coord.trim());
    if (coordinates.length !== 2 || isNaN(coordinates[0]) || isNaN(coordinates[1])) {
        alert('Invalid format! Please use <latitude, longitude>.');
        return null;
    }
    return [parseFloat(coordinates[0]), parseFloat(coordinates[1])];
}

async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch data');
    return response.json();
}

function displayForecast(forecastData, dailyForecastData, celestialData) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = ''; // Clear previous forecast

    const forecastTable = createTable();
    const forecastBody = forecastTable.querySelector('tbody');

    let currentDay = null, dayIndex = 0;

    forecastData.properties.periods.forEach((period, index) => {
        const formattedTime = formatDateTime(period.startTime);
        const dayOfWeek = new Date(period.startTime).getDay();
        const newDay = dayOfWeek !== currentDay;

        if (newDay) {
            currentDay = dayOfWeek;
            addNewDayTitleRow(forecastBody, formatDate(period.startTime));
            addSunriseSunsetRows(forecastBody, celestialData);
        }

        addForecastRow(forecastBody, period, formattedTime, dayOfWeek, celestialData.properties.data.fracillum);
    });

    forecastContainer.appendChild(forecastTable);
}

function createTable() {
    const table = document.createElement('table');
    const header = `
        <thead>
            <tr>
                <th>Time</th>
                <th>Temperature</th>
                <th>Weather</th>
                <th>Daytime</th>
                <th>Precipitation Probability</th>
                <th>Moonlight</th>
                <th>Recommendation</th>
            </tr>
        </thead>
        <tbody></tbody>`;
    table.innerHTML = header;
    return table;
}

function addSunriseSunsetRows(forecastBody, celestialData) {
    const sunData = celestialData.properties.data.sundata;
    const moonData = celestialData.properties.data.moondata;

    const sunrise = sunData.find(item => item.phen === "Rise")?.time || "N/A";
    const sunset = sunData.find(item => item.phen === "Set")?.time || "N/A";
    const moonrise = moonData.find(item => item.phen === "Rise")?.time || "N/A";
    const moonset = moonData.find(item => item.phen === "Set")?.time || "N/A";

    forecastBody.appendChild(createTwoItemRow('Sunrise', formatTime(sunrise)));
    forecastBody.appendChild(createTwoItemRow('Sunset', formatTime(sunset)));
    forecastBody.appendChild(createTwoItemRow('Moonrise', formatTime(moonrise)));
    forecastBody.appendChild(createTwoItemRow('Moonset', formatTime(moonset)));
}

function addNewDayTitleRow(forecastBody, formattedDate) {
    forecastBody.appendChild(createSingleItemRow(formattedDate))

}

function createTwoItemRow(label, value) {
    const row = document.createElement('tr');
    row.classList.add('sunrise-sunset-row');
    row.innerHTML = `<td>${label}</td><td colspan="6">${value}</td>`;
    return row;
}

function createSingleItemRow(value) {
    const row = document.createElement('tr');
    row.classList.add('title-row');
    row.innerHTML = `<td colspan="100%" >${value}</td>`;
    return row;
}

function addForecastRow(forecastBody, period, formattedTime, dayOfWeek, moonlight) {
    const weatherDescription = period.shortForecast.toLowerCase();
    const isDaytime = period.isDaytime ? 'Yes' : 'No';
    const precipText = `${period.probabilityOfPrecipitation.value}%`;
    const moonlightPercentage = moonlight || "Unknown";
    const recommendationColor = moonlight > 0.5 ? '#e74c3c' : getWeatherColor(weatherDescription);
    const weatherText = getRecommendation(weatherDescription, period.probabilityOfPrecipitation.value);
    const weatherColor = getWeatherColor(weatherDescription, period.probabilityOfPrecipitation.value);

    const row = document.createElement('tr');
    row.classList.add('day');
    row.style.backgroundColor = getDayColor(dayOfWeek);

    row.innerHTML = `
        <td>${formattedTime}</td>
        <td>${period.temperature}°${period.temperatureUnit}</td>
        <td>${period.shortForecast}</td>
        <td>${isDaytime}</td>
        <td>${precipText}</td>
        <td>${moonlightPercentage}</td>
        <td style="background-color: ${weatherColor};">${weatherText}</td>
    `;
    forecastBody.appendChild(row);
}

function getRecommendation(description, precip) {
    if (description.includes('sunny') || description.includes('cloudy') || precip > 10) return 'no';
    if (description.includes('clear')) return 'yes';
    return 'maybe';
}

function getWeatherColor(description, precip) {
    if (description.includes('sunny') || description.includes('cloudy') || precip > 10) return '#e74c3c';
    if (description.includes('clear')) return '#2ecc71';
    return '#f3c612';
}

function isMoonUp(date) {

}


function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
    });
}

function formatDate(isoString) {
    const date = new Date(isoString);

    const weekday = date.toLocaleString('en-US', { weekday: 'long' });
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const dayWithSuffix = day + getOrdinalSuffix(day);

    return `${weekday}, ${month} ${dayWithSuffix}`;
}

function getOrdinalSuffix(n) {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function formatTime(timeStr) {
    if (!timeStr) return 'N/A';

    const [h, m] = timeStr.split(':');
    const hour = +h % 12 || 12;
    const AMPM = +h < 12 ? 'AM' : 'PM';

    return `${hour}:${m} ${AMPM}`;
}


function getDayColor(dayOfWeek) {
    const colors = [
        '#fef9f9',
        '#f6fdf6',
        '#fefde5',
        '#f8f2fc',
        '#e7f2fd',
        '#e7fcf9',
        '#f9f4fc'
    ];


    return colors[dayOfWeek];
}

async function getCelestialData(latitude, longitude,) {
    const today = new Date();
    const year = today.getFullYear(), month = today.getMonth() + 1, day = today.getDate();
    const timezoneOffset = new Date().getTimezoneOffset() / -60;
    const moonlightUrl = `https://aa.usno.navy.mil/api/rstt/oneday?date=${year}-${month}-${day}&coords=${latitude},${longitude}&tz=${timezoneOffset}`;

    try {
        const data = await fetchData(moonlightUrl);
        return data;
    } catch (error) {
        console.error('Error fetching moon data:', error);
        return { fracillum: 0 }; // Fallback
    }
}


