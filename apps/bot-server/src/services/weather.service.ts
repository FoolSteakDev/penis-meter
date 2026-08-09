import citiesData from '../data/cities.json';
import { fetchJson } from '../utils/http.util';

export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export type WeatherCategory = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';

export interface CityWeather {
  city: City;
  temperatureC: number;
  category: WeatherCategory;
}

const cities = citiesData as City[];

function categorizeWeatherCode(weatherCode: number): WeatherCategory {
  if (weatherCode === 0 || weatherCode === 1) {
    return 'clear';
  }
  if (weatherCode === 2 || weatherCode === 3 || (weatherCode >= 45 && weatherCode <= 48)) {
    return 'cloudy';
  }
  if (weatherCode >= 95) {
    return 'storm';
  }
  if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
    return 'snow';
  }
  if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
    return 'rain';
  }
  return 'cloudy';
}

export function pickRandomCity(): City {
  return cities[Math.floor(Math.random() * cities.length)];
}

export async function fetchCityWeather(city: City): Promise<CityWeather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,precipitation,weather_code`;
  const data = await fetchJson<{
    current: { temperature_2m: number; weather_code: number };
  }>(url);

  return {
    city,
    temperatureC: data.current.temperature_2m,
    category: categorizeWeatherCode(data.current.weather_code),
  };
}
