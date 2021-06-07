"use strict"

const https = require("https");

const input = process.argv[2];

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
    var highestTemp = 0;
    var bestWeather = 0;
    var weather = ["Heavy Cloud", "Light Cloud", "Clear"]
    for (const hour of day) {
        if (hour.the_temp < 10 ||
            hour.weather_state_name !== "Clear" &&
            hour.weather_state_name !== "Light Cloud" &&
            hour.weather_state_name !== "Heavy Cloud") {
            return false;
        }
        if (hour.the_temp > highestTemp) {
            highestTemp = hour.the_temp;
        }
        if (weather.indexOf(hour.weather_state_name) > weather.indexOf(bestWeather)) {
            bestWeather = weather.indexOf(hour.weather_state_name);
        }
        highestTemp = hour.the_temp;
        bestWeather = weather.indexOf(hour.weather_state_name);
    }
    return [highestTemp, bestWeather];
}

function compareWeather(saturday, sunday) {
    let name;
    let reasons = [];
    if (saturday[1] === sunday[1]) {
        name = saturday[0] > sunday[0] ? "Saturday" : "Sunday"
        reasons.push("warmer")
    } else if (saturday[1] > sunday[1]) {
        name = saturday[1] > sunday[1] ? "Saturday" : "Sunday"
        reasons.push("better weather")
    }
    
    return {
        name,
        reasons
    }
}

(async () => {
    const locationId = await getRequestData("https://www.metaweather.com/api/location/search/?query=" + input);
    const weekendDates = getWeekendDates();
    const locationWeatherSaturday = await getRequestData("https://www.metaweather.com/api/location/" +
        locationId[0].woeid + "/" + weekendDates[0] + "/");
    const locationWeatherSunday = await getRequestData("https://www.metaweather.com/api/location/" +
        locationId[0].woeid + "/" + weekendDates[1] + "/");

    const saturdayWeather = checkWeather(locationWeatherSaturday);
    const sundayWeather = checkWeather(locationWeatherSunday);

    if (saturdayWeather && sundayWeather) {
        const betterDay = compareWeather(saturdayWeather, sundayWeather)
        console.log(`This weekend looks nice for a picnic, ${betterDay.name} is best because it's ${betterDay.reasons.length > 1 ?
        betterDay.reasons[0] + "and" + betterDay.reasons[1] : betterDay.reasons[0]}.`);
    } else if (saturdayWeather || sundayWeather) {
        console.log(`You should have your picnic on ${saturdayWeather ? "Saturday" : "Sunday"}`);
    } else {
        console.log("The weather isn't looking very good this weekend, maybe stay indoors.");
    }
})()