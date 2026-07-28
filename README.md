# Local Weather App

A Swift iOS application designed specifically for Alpine region weather monitoring. This app provides real-time weather data and forecasts for alpine areas, with special focus on mountainous regions.

## Features

- Real-time weather information using Open-Meteo API
- Daily forecast showing temperature ranges and rain predictions
- Radar visualization support (with integration points)
- Alpine-focused location targeting (currently uses Chamonix, France coordinates)

## Technologies Used

- Swift 5.9
- SwiftUI for UI framework
- URLSession for network requests
- JSON decoding for API responses

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Boon018/localWeather.git
```

2. Open in Xcode and build the project.

## API Endpoints Used

- [Open-Meteo Weather API](https://open-meteo.com)
  - Current weather: `https://api.open-meteo.com/v1/forecast?latitude=45.9237&longitude=6.8655&current_weather=true`
  - Forecast data: `https://api.open-meteo.com/v1/forecast?latitude=45.9237&longitude=6.8655&daily=temperature_2m_max,temperature_2m_min,rain_sum`

## Alpine Region Focus

This app is specifically designed for Alpine regions and can be easily adapted to other mountainous areas by changing the coordinates in the API requests.

## License

MIT