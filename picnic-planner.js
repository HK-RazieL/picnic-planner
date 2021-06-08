"use strict"

const https = require("https");
const MIN_TEMP = 10;
const ACCEPTABLE_WEATHER = ["Heavy Cloud", "Light Cloud", "Clear"];
const INPUT = process.argv[2];

function getRequestData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });
            res.on("end", () => {
                resolve(JSON.parse(data));
            });
        }).on("error", (error) => {
            reject(error);
        });
    });
}

function getWeekendDates() {
    let date = new Date();
    let nextSaturday = new Date(date.setDate(date.getDate() + (7 + 6 - date.getDay()) % 7));
    let saturdayCorrectFormat = `${nextSaturday.getFullYear()}/${nextSaturday.getMonth() + 1}/${nextSaturday.getDate()}`
    let nextSunday = new Date(date.setDate(date.getDate() + (7 + 7 - date.getDay()) % 7));
    let sundayCorrectFormat = `${nextSunday.getFullYear()}/${nextSunday.getMonth() + 1}/${nextSunday.getDate()}`
    return [saturdayCorrectFormat, sundayCorrectFormat];
}

function checkWeather(day) {
    let highestTemp = 0;
    let bestWeatherIndex = 0;
    for (const hour of day) {
        if (hour.the_temp < MIN_TEMP || !ACCEPTABLE_WEATHER.includes(hour.weather_state_name)) {
            return false;
        }
        if (hour.the_temp > highestTemp) {
            highestTemp = hour.the_temp;
        }
        if (ACCEPTABLE_WEATHER.indexOf(hour.weather_state_name) > ACCEPTABLE_WEATHER.indexOf(bestWeatherIndex)) {
            bestWeatherIndex = ACCEPTABLE_WEATHER.indexOf(hour.weather_state_name);
        }
        highestTemp = hour.the_temp;
        bestWeatherIndex = ACCEPTABLE_WEATHER.indexOf(hour.weather_state_name);
    }
    return {
        highestTemp,
        bestWeather: bestWeatherIndex
    };
}

function compareWeather(saturday, sunday) {
    let name;
    let reasons = [];
    if (saturday.bestWeather === sunday.bestWeather) {
        name = saturday.highestTemp > sunday.highestTemp ? "Saturday" : "Sunday"
        reasons.push("warmer")
    } else if (saturday.bestWeather > sunday.bestWeather) {
        name = saturday.bestWeather > sunday.bestWeather ? "Saturday" : "Sunday"
        reasons.push("better weather")
    }

    return {
        name,
        reasons
    }
}

function printingResults(saturday, sunday) {
    if (saturday && sunday) {
        const betterDay = compareWeather(saturday, sunday)
        console.log(`This weekend looks nice for a picnic, ${betterDay.name} is best because it's ${betterDay.reasons.length > 1 ?
        betterDay.reasons[0] + "and" + betterDay.reasons[1] : betterDay.reasons[0]}.`);
    } else if (saturday || sunday) {
        console.log(`You should have your picnic on ${saturday ? "Saturday" : "Sunday"}`);
    } else {
        console.log("The weather isn't looking very good this weekend, maybe stay indoors.");
    }
}

(async () => {
    const locationId = await getRequestData("https://www.metaweather.com/api/location/search/?query=" + INPUT);
    if (!locationId.length) {
        console.error(`${INPUT} is not found`);
        process.exit(1);
    }
    const weekendDates = getWeekendDates();
    const locationWeatherSaturday = await getRequestData("https://www.metaweather.com/api/location/" +
        locationId[0].woeid + "/" + weekendDates[0] + "/");
    const locationWeatherSunday = await getRequestData("https://www.metaweather.com/api/location/" +
        locationId[0].woeid + "/" + weekendDates[1] + "/");

    const saturdayWeather = checkWeather(locationWeatherSaturday);
    const sundayWeather = checkWeather(locationWeatherSunday);
    printingResults(saturdayWeather, sundayWeather)
})()