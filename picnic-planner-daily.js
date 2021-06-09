"use strict"

const https = require("https");

const INPUT = process.argv.slice(2).join("%20");
const MIN_TEMP = 10;
const ACCEPTABLE_WEATHER = ["Heavy Cloud", "Light Cloud", "Clear"];
const WOEID_URL = "https://www.metaweather.com/api/location/search/?query=";
const WEATHER_URL = "https://www.metaweather.com/api/location/";

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
    let saturdayCorrectFormat = `${nextSaturday.getFullYear()}-${String(nextSaturday.getMonth() + 1).padStart(2, "0")}-${nextSaturday.getDate()}`
    let nextSunday = new Date(date.setDate(date.getDate() + (7 + 7 - date.getDay()) % 7));
    let sundayCorrectFormat = `${nextSunday.getFullYear()}-${String(nextSunday.getMonth() + 1).padStart(2, "0")}-${nextSunday.getDate()}`
    return [saturdayCorrectFormat, sundayCorrectFormat];
}

function checkWeather(data) {
    const weekendDates = getWeekendDates();
    let result = {};
    for (const day of data.consolidated_weather) {
        let dayOfWeek = new Date(day.applicable_date).toLocaleDateString("en", {
            weekday: "long"
        }).toLowerCase();
        if (!weekendDates.includes(day.applicable_date)) continue;
        if (day.the_temp < MIN_TEMP || !ACCEPTABLE_WEATHER.includes(day.weather_state_name)) {
            return result = {
                ...result,
                [dayofWeek] : false
            };
        } else {
            result = {
                ...result,
                [dayOfWeek]: {
                    temperature: day.the_temp,
                    bestWeatherIndex: ACCEPTABLE_WEATHER.indexOf(day.weather_state_name)
                }
            };
        }
    }
    return result;
}

function compareWeather(weather) {
    let saturdayReasons = [];
    let sundayReasons = [];

    if (weather.saturday.highestTemp > weather.sunday.highestTemp) {
        saturdayReasons.push("warmer");
    } else {
        sundayReasons.push("warmer");
    }

    if (weather.saturday.bestWeatherIndex >= weather.sunday.bestWeatherIndex) {
        saturdayReasons.push("better weather");
    } else {
        sundayReasons.push("better weather");
    }

    return {
        name: saturdayReasons.length > sundayReasons.length ? "Saturday" : "Sunday",
        reasons: saturdayReasons.length > sundayReasons.length ? saturdayReasons : sundayReasons
    }
}

function printingResults(weather) {
    if (weather.saturday && weather.sunday) {
        const betterDay = compareWeather(weather)
        console.log(`This weekend looks nice for a picnic, ${betterDay.name} is best because it's ${betterDay.reasons.length === 1 ? 
            betterDay.reasons[0] : betterDay.reasons[0] + " and " + betterDay.reasons[1]}.`);
    } else if (weather.saturday || weather.sunday) {
        console.log(`You should have your picnic on ${weather.saturday ? "Saturday" : "Sunday"}`);
    } else {
        console.log("The weather isn't looking very good this weekend, maybe stay indoors.");
    }
}

(async () => {
    const locationId = await getRequestData(WOEID_URL + INPUT);
    if (!locationId.length) {
        console.error(`${INPUT} is not found`);
        process.exit(1);
    }
    const locationWeather = await getRequestData(`${WEATHER_URL}${locationId[0].woeid}/`);

    const weather = checkWeather(locationWeather);
    printingResults(weather)
})()