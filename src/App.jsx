import { useEffect, useState } from 'react';
import "./App.css";
import WeatherBackground from "./components/WeatherBackground.jsx";
import { convertTemperature, getHumidityValue, getWindDirection } from "./components/Helper.jsx";
import { HumidityIcon, VisibilityIcon, WindIcon, SunriseIcon, SunsetIcon } from "./components/Icons.jsx";

function App() {
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [unit, setUnit] = useState("C");
  const [error, setError] = useState("");
  const [forecast, setForecast] = useState([]);

  const API_key = "f0158fdd1213e714571c082c3614c4fa";

  // ---------------------------
  // AUTO-LOAD USER LOCATION
  // ---------------------------
  const loadAutoWeather = () => {
    if (!navigator.geolocation) {
      setError("Location not supported by browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        fetchWeatherData(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_key}&units=metric`
        );
      },
      () => setError("Please allow location access to auto load weather")
    );
  };

  useEffect(() => {
    loadAutoWeather();
  }, []);

  // ---------------------------
  // CITY TYPING SUGGESTIONS
  // ---------------------------
  useEffect(() => {
    if (city.trim().length >= 3 && !weather) {
      const timer = setTimeout(() => fetchSuggestions(city), 500);
      return () => clearTimeout(timer);
    }
    setSuggestions([]);
  }, [city, weather]);

  const fetchSuggestions = async (query) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_key}`
      );
      res.ok ? setSuggestions(await res.json()) : setSuggestions([]);
    } catch {
      setSuggestions([]);
    }
  };

  // ---------------------------
  // WEATHER + FORECAST FETCHER
  // ---------------------------
  const fetchWeatherData = async (url, name = "") => {
    setError("");
    setWeather(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("City not found");

      const data = await response.json();

      setWeather(data);
      setCity(name || data.name);
      setSuggestions([]);

      fetchForecast(data.coord.lat, data.coord.lon);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchForecast = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_key}&units=metric`
      );

      const data = await res.json();

      const daily = {};
      data.list.forEach((entry) => {
        const date = entry.dt_txt.split(" ")[0];
        const time = entry.dt_txt.split(" ")[1];

        if (!daily[date] || time === "12:00:00") {
          daily[date] = entry;
        }
      });

      setForecast(Object.values(daily).slice(0, 5));
    } catch (err) {
      console.error("Forecast error:", err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!city.trim()) return setError("Please enter a city name...");

    fetchWeatherData(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_key}&units=metric`
    );
  };

  const getWeatherCondition = () =>
    weather && {
      main: weather.weather[0].main,
      isDay:
        Date.now() / 1000 >= weather.sys.sunrise &&
        Date.now() / 1000 < weather.sys.sunset,
    };

  // ---------------------------
  // UI START
  // ---------------------------
  return (
    <div className="min-h-screen">
      <WeatherBackground condition={getWeatherCondition()} />

      <div className="flex items-center justify-center p-6 min-h-screen">
        <div className="bg-transparent backdrop-blur-md rounded-xl 
          p-6 sm:p-8 shadow-2xl w-[90%] sm:w-[85%] md:w-[80%] 
          max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl
          text-white border border-white/30 relative z-10 mx-auto">

          <h1 className="text-4xl font-extrabold text-center mb-6">Weather App</h1>

          {/* ------------------ SEARCH UI ------------------ */}
          {!weather ? (
            <form onSubmit={handleSearch} className="flex flex-col relative">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter City or Country...."
                className="mb-4 p-3 rounded border border-white bg-transparent text-white placeholder-white"
              />

              {suggestions.length > 0 && (
                <div className="absolute top-14 left-0 right-0 bg-black/40 backdrop-blur-md rounded border border-white/20 z-20">
                  {suggestions.map((s) => (
                    <button
                      type="button"
                      key={`${s.lat}-${s.lon}`}
                      onClick={() =>
                        fetchWeatherData(
                          `https://api.openweathermap.org/data/2.5/weather?lat=${s.lat}&lon=${s.lon}&appid=${API_key}&units=metric`,
                          `${s.name}, ${s.country}${s.state ? `, ${s.state}` : ""}`
                        )
                      }
                      className="block hover:bg-white/20 w-full text-sm text-left px-4 py-2"
                    >
                      {s.name}, {s.country}
                      {s.state && `, ${s.state}`}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="bg-purple-700 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
              >
                Get Weather
              </button>
            </form>
          ) : (
            <>
              {/* ------------------ WEATHER UI ------------------ */}

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setWeather(null);
                    setCity("");
                  }}
                  className="mb-4 bg-purple-900 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded"
                >
                  New Search
                </button>

                <div className="flex justify-between items-center">
                  <h2 className="text-3xl font-bold">{weather.name}</h2>
                  <button
                    onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))}
                    className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-1 px-3 rounded"
                  >
                    °{unit}
                  </button>
                </div>

                <img
                  src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                  alt={weather.weather[0].description}
                  className="mx-auto my-4 animate-bounce"
                />

                <p className="text-4xl">
                  {convertTemperature(weather.main.temp, unit)}°{unit}
                </p>
                <p className="capitalize">{weather.weather[0].description}</p>

                {/* ---------------- STATS ROW 1 ---------------- */}
                <div className="flex flex-wrap justify-around mt-6 text-xl">
                  {[
                    [HumidityIcon, "Humidity", `${weather.main.humidity}% (${getHumidityValue(weather.main.humidity)})`],
                    [WindIcon, "Wind", `${weather.wind.speed} m/s ${getWindDirection(weather.wind.deg)}`],
                    [VisibilityIcon, "Visibility", `${(weather.visibility / 1000).toFixed(1)} km`],
                  ].map(([Icon, label, value]) => (
                    <div key={label} className="flex flex-col items-center m-2">
                      <Icon />
                      <p className="mt-1 font-semibold">{label}</p>
                      <p className="text-sm">{value}</p>
                    </div>
                  ))}
                </div>

                {/* ---------------- STATS ROW 2 ---------------- */}
                <div className="flex flex-wrap justify-around mt-6 text-xl">
                  {[
                    [SunriseIcon, "Sunrise", weather.sys.sunrise],
                    [SunsetIcon, "Sunset", weather.sys.sunset],
                  ].map(([Icon, label, timestamp]) => (
                    <div key={label} className="flex flex-col items-center m-2">
                      <Icon />
                      <p className="mt-1 font-semibold">{label}</p>
                      <p className="text-sm">
                        {/* Display date */}
                        {new Date(timestamp * 1000).toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                        <br />
                        {/* Display time */}
                        {new Date(timestamp * 1000).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>


                {/* ---------------- FORECAST ---------------- */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold mb-3">5-Day Forecast</h3>

                  {/* TOP 3 BIG CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {forecast.slice(0, 3).map((day, i) => (
                      <div key={i} className="bg-white/20 rounded-lg p-5 text-center backdrop-blur-md border border-white/30">
                        <p className="font-bold">
                          {new Date(day.dt * 1000).toLocaleDateString("en-US", { weekday: "short" })}
                        </p>
                        <img
                          src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`}
                          alt=""
                          className="mx-auto"
                        />
                        <p className="text-lg">{Math.round(day.main.temp)}°{unit}</p>
                        <p className="text-sm capitalize">{day.weather[0].description}</p>
                      </div>
                    ))}
                  </div>

                  {/* LAST 2 SMALL CENTERED CARDS */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 place-items-center">
                    {forecast.slice(3, 5).map((day, i) => (
                      <div key={i} className="bg-white/20 rounded-lg p-4 text-center backdrop-blur-md border border-white/30 w-full sm:w-3/4">
                        <p className="font-bold">
                          {new Date(day.dt * 1000).toLocaleDateString("en-US", { weekday: "short" })}
                        </p>
                        <img
                          src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`}
                          alt=""
                          className="mx-auto"
                        />
                        <p className="text-lg">{Math.round(day.main.temp)}°{unit}</p>
                        <p className="text-sm capitalize">{day.weather[0].description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OTHER INFO */}
                <div className="mt-6 text-md space-y-1">
                  <p>
                    <strong>Feels Like:</strong>{" "}
                    {convertTemperature(weather.main.feels_like, unit)}°{unit}
                  </p>
                  <p>
                    <strong>Pressure:</strong> {weather.main.pressure} hPa
                  </p>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="mt-4 text-red-500 font-semibold text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;


