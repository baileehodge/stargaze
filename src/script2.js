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
        const moonPhaseData = await getMoonPhaseData(latitude, longitude);

        displayForecast(forecastData, dailyForecastData, moonPhaseData);
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

function displayForecast(forecastData, dailyForecastData, moonPhaseData) {
    const forecastContainer = document.getElementById('forecast-container');
    forecastContainer.innerHTML = ''; // Clear previous forecast

    const forecastTable = createTable();
    const forecastBody = forecastTable.querySelector('tbody');

    let currentDay = null, dayIndex = 0;

    forecastData.properties.periods.forEach((period, index) => {
        const formattedTime = formatDate(period.startTime);
        const dayOfWeek = new Date(period.startTime).getDay();
        const newDay = dayOfWeek !== currentDay;

        if (newDay) {
            currentDay = dayOfWeek;
            const dayForecast = dailyForecastData.properties.periods[dayIndex++];
            addSunriseSunsetRows(forecastBody, dayForecast);
        }

        addForecastRow(forecastBody, period, formattedTime, dayOfWeek, moonPhaseData.fracillum);
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
                <th>Recommendation</th>
                <th>Moonlight</th>
            </tr>
        </thead>
        <tbody></tbody>`;
    table.innerHTML = header;
    return table;
}

function addSunriseSunsetRows(forecastBody, dayForecast) {
    forecastBody.appendChild(createRow('Sunrise', formatDate(dayForecast.sunrise)));
    forecastBody.appendChild(createRow('Sunset', formatDate(dayForecast.sunset)));
}

function createRow(label, value) {
    const row = document.createElement('tr');
    row.classList.add('sunrise-sunset-row');
    row.innerHTML = `<td>${label}</td><td colspan="6">${value}</td>`;
    return row;
}

function addForecastRow(forecastBody, period, formattedTime, dayOfWeek, moonPhase) {
    const weatherDescription = period.shortForecast.toLowerCase();
    const isDaytime = period.isDaytime ? 'Yes' : 'No';
    const precipText = `${period.probabilityOfPrecipitation.value}%`;
    const moonPhasePercentage = moonPhase || "Unknown";
    const recommendationColor = moonPhase > 0.5 ? '#e74c3c' : getWeatherColor(weatherDescription);
    const weatherText = getWeatherRecommendation(weatherDescription);
    const weatherColor = getWeatherColor(weatherDescription);

    const row = document.createElement('tr');
    row.classList.add('day');
    row.style.backgroundColor = getDayColor(dayOfWeek);

    row.innerHTML = `
        <td>${formattedTime}</td>
        <td>${period.temperature}°${period.temperatureUnit}</td>
        <td>${period.shortForecast}</td>
        <td>${isDaytime}</td>
        <td>${precipText}</td>
        <td style="background-color: ${recommendationColor};">${weatherText}</td>
        <td>${moonPhasePercentage}%</td>
    `;
    forecastBody.appendChild(row);
}

function getWeatherRecommendation(description) {
    if (description.includes('sunny') || description.includes('cloudy')) return 'no';
    if (description.includes('clear')) return 'yes';
    return 'maybe';
}

function getWeatherColor(description) {
    if (description.includes('sunny') || description.includes('cloudy')) return '#e74c3c';
    if (description.includes('clear')) return '#2ecc71';
    return '#f3c612';
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
    });
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

async function getMoonPhaseData(latitude, longitude) {
    const today = new Date();
    const year = today.getFullYear(), month = today.getMonth() + 1, day = today.getDate();
    const timezoneOffset = new Date().getTimezoneOffset() / -60;
    const moonPhaseUrl = `https://aa.usno.navy.mil/api/rstt/oneday?date=${year}-${month}-${day}&coords=${latitude},${longitude}&tz=${timezoneOffset}`;

    try {
        const data = await fetchData(moonPhaseUrl);
        return data;
    } catch (error) {
        console.error('Error fetching moon data:', error);
        return { fracillum: 0 }; // Fallback
    }
}
