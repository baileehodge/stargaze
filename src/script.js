async function main() {
    const coordinatesInput = document.getElementById('coordinates').value;

    if (!coordinatesInput) {
        alert('Please enter coordinates in the format <latitude, longitude>!');
        return;
    }
    // Parse coordinates from the input
    const coordinates = coordinatesInput.split(','); // Split by comma
    if (coordinates.length !== 2) {
        alert('Invalid format! Please use <latitude, longitude>.');
        return;
    }

    const latitude = parseFloat(coordinates[0].trim());
    const longitude = parseFloat(coordinates[1].trim());

    if (isNaN(latitude) || isNaN(longitude)) {
        alert('Invalid latitude or longitude! Please enter valid numbers.');
        return;
    }

    const apiUrl = `https://api.weather.gov/points/${latitude},${longitude}`;


    try {
        // Step 1: Fetch the point data
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();

        // Step 2: Fetch the hourly forecast URL
        const forecastUrl = data.properties.forecastHourly;
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error('Failed to fetch forecast data');
        const forecastData = await forecastResponse.json();

        // Get sunrise and sunset for each day
        const dailyForecastUrl = data.properties.forecast;
        const dailyForecastResponse = await fetch(dailyForecastUrl);
        const dailyForecastData = await dailyForecastResponse.json();

        // Fetch Moon Phase Data from USNO API
        const moonPhaseData = await getMoonPhaseData(latitude, longitude);

        // Step 3: Display forecast data in a table
        const forecastContainer = document.getElementById('forecast-container');
        forecastContainer.innerHTML = ''; // Clear previous forecast

        const forecastTable = document.createElement('table');
        const tableHeader = document.createElement('thead');
        tableHeader.innerHTML = `
            <tr>
                <th>Time</th>
                <th>Temperature</th>
                <th>Weather</th>
                <th>Daytime</th>
                <th>Precipitation Probability</th>
                <th>Recommendation</th>
                <th>Moon Phase</th> <!-- New Column for Moon Phase -->
            </tr>
        `;
        forecastTable.appendChild(tableHeader);

        const forecastBody = document.createElement('tbody');
        let currentDay = null;
        let dayIndex = 0;

        // Add sunrise and sunset rows for each day
        forecastData.properties.periods.forEach((period, index) => {
            const formattedTime = formatDate(period.startTime);
            const dayOfWeek = new Date(period.startTime).getDay();
            const newDay = dayOfWeek !== currentDay;

            // If the day has changed, color-code it and add sunrise/sunset rows
            if (newDay) {
                currentDay = dayOfWeek;
                const dayForecast = dailyForecastData.properties.periods[dayIndex];

                // Add Sunrise Row
                const sunriseRow = document.createElement('tr');
                sunriseRow.classList.add('sunrise-sunset-row');
                sunriseRow.innerHTML = `
                    <td>Sunrise</td>
                    <td colspan="6">${formatDate(dayForecast.sunrise)}</td>
                `;
                forecastBody.appendChild(sunriseRow);

                // Add Sunset Row
                const sunsetRow = document.createElement('tr');
                sunsetRow.classList.add('sunrise-sunset-row');
                sunsetRow.innerHTML = `
                    <td>Sunset</td>
                    <td colspan="6">${formatDate(dayForecast.sunset)}</td>
                `;
                forecastBody.appendChild(sunsetRow);

                dayIndex++;
            }

            const row = document.createElement('tr');
            row.classList.add('day');
            if (newDay) {
                row.style.backgroundColor = getDayColor(dayOfWeek);
            }

            // Color-code the weather based on the description
            const weatherDescription = period.shortForecast.toLowerCase();
            let weatherColor = '';
            let weatherText = '';
            if (weatherDescription.includes('sunny') || weatherDescription.includes('cloudy')) {
                weatherColor = '#e74c3c'; // Red for sunny/cloudy
                weatherText = 'no';
            } else if (weatherDescription.includes('clear')) {
                weatherColor = '#2ecc71'; // Green for clear
                weatherText = 'yes';
            } else {
                weatherColor = '#f39c12'; // Yellow for others
                weatherText = 'maybe';
            }

            // Check probability of precipitation
            const precipitationProbability = period.probabilityOfPrecipitation.value;
            let weatherColorForPrecip = weatherColor;
            let precipText = `${precipitationProbability}%`;

            // If precipitation probability > 10%, set Weather Color to red
            if (precipitationProbability > 10) {
                weatherColorForPrecip = '#e74c3c'; // Red if more than 10%
            }

            // Get the value of isDaytime
            const isDaytime = period.isDaytime ? 'Yes' : 'No';
            const weatherColorForDaytime = period.isDaytime ? '#e74c3c' : weatherColorForPrecip; // If daytime, make the weather color red

            // Add the Moon Phase info for the current day
            const moonPhasePercentage = moonPhaseData.fracillum || "Unknown"; // Fallback if moon phase isn't available
            moonPhase = 0.5;

            // Set the Recommendation box to red if moon fraction > 50%
            const recommendationColor = moonPhase > 0.5 ? '#e74c3c' : weatherColorForDaytime;

            row.innerHTML = `
                <td>${formattedTime}</td>
                <td>${period.temperature}°${period.temperatureUnit}</td>
                <td>${period.shortForecast}</td>
                <td>${isDaytime}</td>
                <td>${precipText}</td>
                <td style="background-color: ${recommendationColor};">${weatherText}</td>
                <td>${moonPhasePercentage}%</td> <!-- Moon Phase Column -->
            `;

            forecastBody.appendChild(row);
        });

        forecastTable.appendChild(forecastBody);
        forecastContainer.appendChild(forecastTable);
    } catch (error) {
        alert('Error fetching data: ' + error.message);
    }
}

// Helper function to format the date
function formatDate(isoString) {
    const date = new Date(isoString);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };
    return date.toLocaleString('en-US', options);
}

// Helper function to get the background color for the day
function getDayColor(dayOfWeek) {
    const colors = [
        '#e74c3c',  // Sunday
        '#2ecc71',  // Monday
        '#f39c12',  // Tuesday
        '#8e44ad',  // Wednesday
        '#3498db',  // Thursday
        '#1abc9c',  // Friday
        '#9b59b6',  // Saturday
    ];
    return colors[dayOfWeek];
}

// Fetch Moon data from US Naval Observatory API
async function getMoonPhaseData(latitude, longitude) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const timezoneOffset = new Date().getTimezoneOffset() / -60; // Get the timezone offset in hours
    const dst = today.isDST;
    const moonPhaseUrl = `https://aa.usno.navy.mil/api/rstt/oneday?date=${year}-${month}-${day}&coords=${latitude},${longitude}&tz=${timezoneOffset}&dst=${dst}`;



    try {
        const response = await fetch(moonPhaseUrl);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching moon data:', error);
        return { fraction: 0 }; // Fallback if there's an error
    }
}